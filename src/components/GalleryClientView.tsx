"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle } from "lucide-react";
import Brand from "./Brand";
import Lightbox from "./Lightbox";
import { PHOTOGRAPHER_PHONE, type Category } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { Photo, PublicGallery } from "@/lib/types";

type Filter = "All" | "Selected" | Category;

function GridPhoto({ photo, selected, onOpen, onToggle }: { photo: Photo; selected: boolean; onOpen: () => void; onToggle: () => void }) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (ref.current?.complete) setLoaded(true); // cached images can finish before hydration
  }, []);

  return (
    <figure
      className="relative mb-2 break-inside-avoid overflow-hidden rounded-[3px] bg-panel bg-cover"
      style={{ aspectRatio: `${photo.width} / ${photo.height}`, backgroundImage: photo.blur_data_url ? `url(${photo.blur_data_url})` : undefined }}
    >
      <button onClick={onOpen} className="absolute inset-0" aria-label={`Open ${photo.original_name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={ref}
          src={photo.thumb_url}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn("h-full w-full object-cover transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0")}
        />
      </button>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/40 to-transparent" />
      <button
        onClick={onToggle}
        aria-pressed={selected}
        aria-label={selected ? `Remove ${photo.original_name} from selection` : `Add ${photo.original_name} to selection`}
        className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center transition active:scale-90"
      >
        <Heart className={cn("h-6 w-6 drop-shadow", selected ? "fill-rose text-rose" : "text-white/90")} />
      </button>
    </figure>
  );
}

export default function GalleryClientView({
  gallery,
  photos,
  initialSelected,
}: {
  gallery: PublicGallery;
  photos: Photo[];
  initialSelected: string[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("All");
  const [selected, setSelected] = useState(() => new Set(initialSelected));
  const [lightbox, setLightbox] = useState<{ list: Photo[]; start: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of photos) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [photos]);

  const visible = useMemo(
    () =>
      filter === "All" ? photos : filter === "Selected" ? photos.filter((p) => selected.has(p.id)) : photos.filter((p) => p.category === filter),
    [filter, photos, selected],
  );

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "All", label: "All", count: photos.length },
    ...gallery.categories.filter((c) => counts[c]).map((c) => ({ id: c as Filter, label: c, count: counts[c] })),
  ];

  async function toggle(id: string) {
    const next = !selected.has(id);
    const apply = (on: boolean) =>
      setSelected((prev) => {
        const s = new Set(prev);
        if (on) s.add(id);
        else s.delete(id);
        return s;
      });
    apply(next); // optimistic
    try {
      const res = await fetch(`/api/gallery/${gallery.slug}/selections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: id, selected: next }),
      });
      if (res.status === 401) return router.refresh(); // session expired, show the PIN screen again
      if (!res.ok) throw new Error();
    } catch {
      apply(!next);
      setToast("Couldn't save that choice. Check your connection and try again.");
    }
  }

  function sendToWhatsApp() {
    if (!PHOTOGRAPHER_PHONE) return setToast("The photographer's WhatsApp number isn't set up yet.");
    const names = photos.filter((p) => selected.has(p.id)).map((p) => p.original_name);
    const { url, full, truncated } = buildWhatsAppUrl({
      phone: PHOTOGRAPHER_PHONE,
      clientName: gallery.client_name,
      title: gallery.title,
      names,
    });
    if (truncated) {
      navigator.clipboard?.writeText(full)?.catch(() => {});
      setToast("Your full list is copied. Paste it into the WhatsApp chat.");
    }
    window.open(url, "_blank", "noopener");
  }

  const n = selected.size;

  return (
    <div className="min-h-dvh pb-32">
      <header className="px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] text-center sm:pt-10">
        <Brand className="justify-center" />
        <h1 className="mt-10 font-display text-4xl font-medium sm:text-6xl">{gallery.client_name}</h1>
        <p className="mt-2 text-sm text-mute">
          {gallery.title}
          {gallery.event_date && ` · ${formatDate(gallery.event_date)}`}
        </p>
        <p className="mx-auto mt-6 max-w-sm text-sm text-mute">Tap the heart on every photo you want in your album.</p>
      </header>

      <nav aria-label="Photo categories" className="sticky top-0 z-30 border-y border-line bg-ink/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3 sm:justify-center">
          {[...tabs, { id: "Selected" as Filter, label: "Selected", count: n }].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              aria-pressed={filter === t.id}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition",
                filter === t.id ? "border-gold bg-gold text-ink" : "border-line text-paper hover:border-mute",
              )}
            >
              {t.id === "Selected" && <Heart className={cn("h-3.5 w-3.5", filter === t.id ? "fill-ink" : "fill-rose text-rose")} />}
              {t.label}
              <span className={filter === t.id ? "text-ink/70" : "text-mute"}>{t.count}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-[1600px] px-2 pt-2 sm:px-3">
        {visible.length ? (
          <div className="columns-2 gap-2 md:columns-3 xl:columns-4">
            {visible.map((p, i) => (
              <GridPhoto
                key={p.id}
                photo={p}
                selected={selected.has(p.id)}
                onOpen={() => setLightbox({ list: visible, start: i })}
                onToggle={() => toggle(p.id)}
              />
            ))}
          </div>
        ) : (
          <p className="py-24 text-center text-mute">
            {filter === "Selected" ? "No photos selected yet. Tap a heart to add one." : "No photos here yet."}
          </p>
        )}
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-full border border-line bg-panel/95 py-2 pl-5 pr-2 shadow-2xl backdrop-blur">
          <p className="text-sm" aria-live="polite">
            Selected: <span className="font-medium text-gold">{n}</span> {n === 1 ? "photo" : "photos"}
          </p>
          <button
            onClick={sendToWhatsApp}
            disabled={n === 0}
            className="flex items-center gap-2 rounded-full bg-wa px-4 py-2.5 text-sm font-medium text-black transition enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Send selection to WhatsApp
          </button>
        </div>
      </div>

      {toast && (
        <div role="status" className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[60] mx-auto max-w-sm rounded-lg border border-line bg-panel px-4 py-3 text-center text-sm shadow-xl">
          {toast}
        </div>
      )}

      {lightbox && (
        <Lightbox
          list={lightbox.list}
          start={lightbox.start}
          selected={selected}
          onToggle={toggle}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
