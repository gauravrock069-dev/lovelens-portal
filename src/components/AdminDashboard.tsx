"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Copy, ExternalLink, Link2, LogOut, MessageCircle, Plus, Upload } from "lucide-react";
import AdminUpload from "./AdminUpload";
import Brand from "./Brand";
import CreateEventModal from "./CreateEventModal";
import { PHOTOGRAPHER_PHONE } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import type { GalleryWithStats } from "@/lib/types";

const linkFor = (g: GalleryWithStats) => `${window.location.origin}/gallery/${g.slug}`;
const inviteText = (g: GalleryWithStats) => {
  const phoneNote = PHOTOGRAPHER_PHONE ? `\n\nContact WhatsApp: +${PHOTOGRAPHER_PHONE}` : "";
  return `Hello ${g.client_name}! Your gallery from Love Lens Wedding is ready.\n\nLink: ${linkFor(g)}\nPIN: ${g.pin_code}\n\nTap the heart on the photos you want in your album, then send your selection to us on WhatsApp.${phoneNote}`;
};

export default function AdminDashboard({
  initialGalleries,
  dbError,
  isMock = false,
}: {
  initialGalleries: GalleryWithStats[];
  dbError?: string | null;
  isMock?: boolean;
}) {
  const router = useRouter();
  const [galleries, setGalleries] = useState(initialGalleries);
  const [creating, setCreating] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const panel = useRef<HTMLElement>(null);
  const active = galleries.find((g) => g.id === activeId) ?? null;

  async function refresh() {
    const res = await fetch("/api/admin/galleries");
    if (res.ok) setGalleries((await res.json()).galleries);
  }

  async function copy(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  }

  function openUpload(id: string) {
    setActiveId(id);
    setTimeout(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  const btn = "flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm hover:border-gold";

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-8">
        <div>
          <Brand />
          <p className="ml-9 text-xs text-mute">Studio manager</p>
        </div>
        <button onClick={logout} className={btn}><LogOut className="h-4 w-4" /> Sign out</button>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-8">
        {isMock && (
          <div className="mb-4 rounded-xl border border-gold/30 bg-gold/10 p-3.5 text-paper">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-medium text-gold text-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Offline / Local Mock Mode Active</span>
              </div>
              <span className="text-xs text-mute bg-panel border border-line px-2 py-0.5 rounded">
                Local storage: data/mock-db.json
              </span>
            </div>
            <p className="mt-1 text-xs text-mute">
              Bina Supabase ya Cloudflare ke aap events bana sakte hain, photos upload kar sakte hain aur client gallery test kar sakte hain. Final hone ke baad .env.local me live credentials add kar sakte hain.
            </p>
          </div>
        )}

        {!isMock && dbError && (
          <div className="rounded-xl border border-rose/40 bg-rose/10 p-4 text-paper">
            <div className="flex items-center gap-2 font-medium text-rose">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>Database Connection Error (Supabase Setup Required)</span>
            </div>
            <p className="mt-1 text-xs text-mute">
              Server could not connect to Supabase: <span className="text-paper">{dbError}</span>
            </p>
            <p className="mt-2 text-xs text-mute">
              👉 Please update <code className="rounded bg-panel px-1.5 py-0.5 text-paper">.env.local</code> with your actual Supabase URL & Service Role Key, and run the SQL migration in Supabase SQL editor.
            </p>
          </div>
        )}
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-8 lg:grid-cols-2">
        <section aria-label="Events">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="font-display text-3xl">Events</h1>
            <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-ink">
              <Plus className="h-4 w-4" /> New event
            </button>
          </div>

          {galleries.length === 0 && (
            <p className="rounded-xl border border-dashed border-line p-8 text-center text-mute">
              No events yet. Create one to get a gallery link for your client.
            </p>
          )}

          <ul className="space-y-3">
            {galleries.map((g) => (
              <li key={g.id} className={cn("rounded-xl border bg-panel p-4", g.id === activeId ? "border-gold" : "border-line")}>
                <div className="flex gap-3">
                  {g.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.cover_image_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="h-16 w-16 shrink-0 rounded-lg bg-ink" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium">{g.client_name}</h3>
                    <p className="truncate text-sm text-mute">{g.title}{g.event_date && ` · ${formatDate(g.event_date)}`}</p>
                    <p className="mt-1 text-sm">
                      {g.photo_count} photos · <span className="text-gold">{g.selected_count} selected</span> · PIN {g.pin_code}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => copy(`l${g.id}`, linkFor(g))} className={btn}>
                    {copied === `l${g.id}` ? <Check className="h-4 w-4 text-gold" /> : <Link2 className="h-4 w-4" />} Copy client link
                  </button>
                  <button onClick={() => copy(`i${g.id}`, inviteText(g))} className={btn}>
                    {copied === `i${g.id}` ? <Check className="h-4 w-4 text-gold" /> : <Copy className="h-4 w-4" />} Copy link + PIN
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(inviteText(g))}`}
                    target="_blank"
                    rel="noopener"
                    className={cn(btn, "border-emerald-600/40 text-emerald-400 hover:border-emerald-400")}
                    title="Send invite to client via WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" /> Share on WhatsApp
                  </a>
                  <button onClick={() => openUpload(g.id)} className={cn(btn, "border-gold text-gold")}>
                    <Upload className="h-4 w-4" /> Upload photos
                  </button>
                  <a href={`/gallery/${g.slug}`} target="_blank" rel="noopener" className={btn} aria-label="Open client gallery in a new tab">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section ref={panel} aria-label="Upload" className="scroll-mt-4 lg:sticky lg:top-6 lg:self-start">
          {active ? (
            <AdminUpload key={active.id} gallery={active} onUploaded={refresh} />
          ) : (
            <p className="rounded-xl border border-dashed border-line p-8 text-center text-mute">
              Choose &ldquo;Upload photos&rdquo; on an event to add photos to it.
            </p>
          )}
        </section>
      </div>

      {creating && (
        <CreateEventModal
          onClose={() => setCreating(false)}
          onCreated={(g) => setGalleries((prev) => [g, ...prev])}
          onUploadNow={openUpload}
          inviteText={inviteText}
          linkFor={linkFor}
        />
      )}
    </div>
  );
}
