"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FolderOpen, ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { ALLOWED_TYPES, type Category } from "@/lib/constants";
import { postJson } from "@/lib/client-api";
import { prepareImage } from "@/lib/image";
import { cn } from "@/lib/utils";
import type { GalleryWithStats } from "@/lib/types";

const CONCURRENCY = 3;

type Item = {
  id: string;
  name: string;
  category: Category;
  status: "queued" | "processing" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

type Presigned = Record<"original" | "preview" | "thumb", { key: string; uploadUrl: string }> & { id: string };

function putBlob(url: string, body: Blob, type: string, onProgress?: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error. If this keeps happening, check the R2 bucket CORS settings."));
    xhr.send(body);
  });
}

/** Folder names like "Haldi" or "Mehndi" pick the category automatically for folder uploads. */
function guessCategory(path: string, allowed: Category[], fallback: Category): Category {
  const p = path.toLowerCase().replace("mehndi", "mehendi");
  return allowed.find((c) => p.includes(c.toLowerCase())) ?? fallback;
}

export default function AdminUpload({ gallery, onUploaded }: { gallery: GalleryWithStats; onUploaded: () => void }) {
  const allowed = gallery.categories;
  const [category, setCategory] = useState<Category>(allowed[0]);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const files = useRef(new Map<string, File>());
  const cats = useRef(new Map<string, Category>());
  const queue = useRef<string[]>([]);
  const running = useRef(0);

  const patch = (id: string, p: Partial<Item>) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));

  async function processOne(id: string) {
    const file = files.current.get(id)!;
    const category = cats.current.get(id)!;
    try {
      patch(id, { status: "processing", progress: 0, error: undefined });
      const img = await prepareImage(file);
      patch(id, { status: "uploading" });
      const p = await postJson<Presigned>("/api/upload/presigned-url", {
        galleryId: gallery.id,
        filename: file.name,
        contentType: file.type,
      });
      await putBlob(p.thumb.uploadUrl, img.thumb, "image/jpeg");
      await putBlob(p.preview.uploadUrl, img.preview, "image/jpeg");
      const isMock = p.original.uploadUrl.startsWith("/api/mock-upload");
      const originalBody = isMock && file.size > 3.5 * 1024 * 1024 ? img.preview : file;
      const originalType = originalBody === file ? file.type : "image/jpeg";
      await putBlob(p.original.uploadUrl, originalBody, originalType, (pct) => patch(id, { progress: pct }));
      await postJson("/api/admin/photos", {
        galleryId: gallery.id,
        photos: [{
          id: p.id,
          originalName: file.name,
          category,
          originalKey: p.original.key,
          previewKey: p.preview.key,
          thumbKey: p.thumb.key,
          width: img.width,
          height: img.height,
          blurDataUrl: img.blur,
        }],
      });
      patch(id, { status: "done", progress: 100 });
      files.current.delete(id); // free memory
    } catch (e) {
      patch(id, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
    }
  }

  function pump() {
    while (running.current < CONCURRENCY && queue.current.length) {
      const id = queue.current.shift()!;
      running.current++;
      void processOne(id).finally(() => {
        running.current--;
        if (!running.current && !queue.current.length) onUploaded();
        pump();
      });
    }
  }

  function addFiles(list: FileList | File[]) {
    const all = Array.from(list);
    const ok = all.filter((f) => ALLOWED_TYPES.includes(f.type));
    setSkipped(all.length - ok.length);
    if (!ok.length) return;
    const next: Item[] = ok.map((f) => {
      const id = crypto.randomUUID();
      files.current.set(id, f);
      const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath || "";
      const cat = path ? guessCategory(path, allowed, category) : category;
      cats.current.set(id, cat);
      return { id, name: f.name, category: cat, status: "queued", progress: 0 };
    });
    setItems((prev) => [...prev, ...next]);
    queue.current.push(...next.map((i) => i.id));
    pump();
  }

  function retryFailed() {
    const failedIds = items.filter((i) => i.status === "error").map((i) => i.id);
    failedIds.forEach((id) => patch(id, { status: "queued", progress: 0, error: undefined }));
    queue.current.push(...failedIds);
    pump();
  }

  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;
  const active = items.length - done - failed;

  useEffect(() => {
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);

  return (
    <div className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="font-display text-2xl">{gallery.client_name}</h2>
      <p className="text-sm text-mute">{gallery.title} · {gallery.photo_count} photos uploaded</p>

      <div className="mt-4">
        <label htmlFor="cat" className="mb-1 block text-sm text-mute">Upload into category</label>
        <select id="cat" value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full rounded-lg border border-line bg-ink px-3 py-2.5 outline-none focus:border-gold">
          {allowed.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={cn("mt-4 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-10 text-center transition", dragging ? "border-gold bg-gold/10" : "border-line")}
      >
        <ImagePlus className="h-8 w-8 text-gold" aria-hidden />
        <p className="text-sm">Drag photos here, or choose them below</p>
        <div className="flex flex-wrap justify-center gap-2">
          <label className="cursor-pointer rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-ink">
            Choose photos
            <input type="file" multiple accept={ALLOWED_TYPES.join(",")} className="sr-only" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm hover:border-gold">
            <FolderOpen className="h-4 w-4" aria-hidden /> Choose a folder
            <input
              type="file"
              multiple
              className="sr-only"
              {...({ webkitdirectory: "" } as Record<string, string>)}
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
            />
          </label>
        </div>
        <p className="text-xs text-mute">JPEG, PNG or WebP. Folder names such as Haldi or Mehendi set the category.</p>
      </div>

      {skipped > 0 && <p className="mt-3 text-sm text-rose" role="status">{skipped} file{skipped > 1 ? "s" : ""} skipped. Only JPEG, PNG and WebP are supported.</p>}

      {items.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <p>{done} of {items.length} uploaded{failed > 0 && <span className="text-rose"> · {failed} failed</span>}</p>
            {failed > 0 && (
              <button onClick={retryFailed} className="flex items-center gap-1.5 text-gold"><RefreshCw className="h-4 w-4" /> Retry failed</button>
            )}
          </div>
          <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {items.map((i) => (
              <li key={i.id} className="rounded-lg bg-ink px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">{i.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-mute">
                    {i.category}
                    {i.status === "done" && <CheckCircle2 className="h-4 w-4 text-wa" aria-label="Uploaded" />}
                    {i.status === "error" && <AlertCircle className="h-4 w-4 text-rose" aria-label="Failed" />}
                    {(i.status === "processing" || i.status === "uploading") && <Loader2 className="h-4 w-4 animate-spin text-gold" aria-label="Uploading" />}
                  </span>
                </div>
                {i.status === "error" ? (
                  <p className="mt-1 text-xs text-rose">{i.error}</p>
                ) : (
                  <div className="mt-2 h-1 overflow-hidden rounded bg-line" role="progressbar" aria-valuenow={i.progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-gold transition-[width]" style={{ width: `${i.progress}%` }} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
