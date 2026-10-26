"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Photo } from "@/lib/types";

type Props = {
  list: Photo[];
  start: number;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClose: () => void;
};

export default function Lightbox({ list, start, selected, onToggle, onClose }: Props) {
  const [index, setIndex] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  const [sharp, setSharp] = useState(false); // false = still showing the thumbnail
  const scroller = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const photo = list[index];
  const isSelected = selected.has(photo.id);

  const go = useCallback((d: number) => setIndex((i) => Math.min(list.length - 1, Math.max(0, i + d))), [list.length]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [go, onClose]);

  useEffect(() => {
    let alive = true;
    setZoomed(false);
    setSharp(false);
    const img = new Image();
    img.onload = () => alive && setSharp(true);
    img.src = photo.preview_url;
    [list[index + 1], list[index - 1]].forEach((p) => p && (new Image().src = p.preview_url)); // preload neighbours
    return () => {
      alive = false;
    };
  }, [index, list, photo.preview_url]);

  useEffect(() => {
    const el = scroller.current;
    if (zoomed && el) {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
    }
  }, [zoomed]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-50 flex flex-col bg-black">
      <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 text-sm">
          <p className="truncate text-paper">{photo.original_name}</p>
          <p className="text-xs text-mute">
            {index + 1} of {list.length} · {photo.category}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoomed((z) => !z)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-paper hover:bg-white/10"
            aria-label={zoomed ? "Zoom out" : "Zoom in"}
          >
            {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </button>
          <button
            onClick={() => onToggle(photo.id)}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
            aria-label={isSelected ? "Remove from album selection" : "Add to album selection"}
            aria-pressed={isSelected}
          >
            <Heart className={cn("h-6 w-6", isSelected ? "fill-rose text-rose" : "text-paper")} />
          </button>
          <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full text-paper hover:bg-white/10" aria-label="Close">
            <X className="h-6 w-6" />
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scroller}
          className="absolute inset-0 overflow-auto"
          onTouchStart={(e) => (touchX.current = zoomed ? null : e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <div className={zoomed ? "block" : "flex h-full w-full items-center justify-center"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sharp ? photo.preview_url : photo.thumb_url}
              alt={photo.original_name}
              onClick={() => setZoomed((z) => !z)}
              draggable={false}
              style={zoomed ? { width: "250%", maxWidth: "none" } : undefined}
              className={cn("select-none", zoomed ? "h-auto cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain")}
            />
          </div>
        </div>

        {index > 0 && (
          <button onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-paper hover:bg-black/70 md:flex" aria-label="Previous photo">
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {index < list.length - 1 && (
          <button onClick={() => go(1)} className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-paper hover:bg-black/70 md:flex" aria-label="Next photo">
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
