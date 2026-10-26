"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, MessageCircle, Shuffle, X } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { postJson } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { GalleryWithStats } from "@/lib/types";

const randomPin = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, "0");

type Props = {
  onClose: () => void;
  onCreated: (g: GalleryWithStats) => void;
  onUploadNow: (id: string) => void;
  inviteText: (g: GalleryWithStats) => string;
  linkFor: (g: GalleryWithStats) => string;
};

export default function CreateEventModal({ onClose, onCreated, onUploadNow, inviteText, linkFor }: Props) {
  const [clientName, setClientName] = useState("");
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [pin, setPin] = useState(randomPin);
  const [cats, setCats] = useState<string[]>([...CATEGORIES]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<GalleryWithStats | null>(null);
  const [copied, setCopied] = useState<"link" | "invite" | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { gallery } = await postJson<{ gallery: GalleryWithStats }>("/api/admin/galleries", {
        clientName, title, eventDate, pin, categories: cats,
      });
      onCreated(gallery);
      setCreated(gallery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the event");
    }
    setBusy(false);
  }

  async function copy(kind: "link" | "invite", text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1800);
  }

  const field = "w-full rounded-lg border border-line bg-ink px-3 py-2.5 outline-none focus:border-gold";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create new event"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">{created ? "Gallery ready" : "New event"}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        {created ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-line bg-ink p-4 text-sm">
              <p className="break-all text-paper">{linkFor(created)}</p>
              <p className="mt-2 text-mute">PIN <span className="text-lg tracking-widest text-gold">{created.pin_code}</span></p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button onClick={() => copy("link", linkFor(created))} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line py-2.5 hover:border-gold">
                {copied === "link" ? <Check className="h-4 w-4 text-gold" /> : <Copy className="h-4 w-4" />} Copy client link
              </button>
              <button onClick={() => copy("invite", inviteText(created))} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line py-2.5 hover:border-gold">
                {copied === "invite" ? <Check className="h-4 w-4 text-gold" /> : <Copy className="h-4 w-4" />} Copy link + PIN
              </button>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(inviteText(created))}`}
              target="_blank"
              rel="noopener"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <MessageCircle className="h-4 w-4" /> Share invite on WhatsApp
            </a>
            <button onClick={() => { onUploadNow(created.id); onClose(); }} className="w-full rounded-lg bg-gold py-3 font-medium text-ink">
              Upload photos
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="cn" className="mb-1 block text-sm text-mute">Client name</label>
              <input id="cn" required autoFocus value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Rahul & Priya" className={field} />
            </div>
            <div>
              <label htmlFor="et" className="mb-1 block text-sm text-mute">Event title</label>
              <input id="et" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wedding at Jaipur" className={field} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ed" className="mb-1 block text-sm text-mute">Event date</label>
                <input id="ed" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={field} />
              </div>
              <div>
                <label htmlFor="pin" className="mb-1 block text-sm text-mute">Secret PIN</label>
                <div className="flex gap-2">
                  <input id="pin" required inputMode="numeric" pattern="\d{4}" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} className={cn(field, "tracking-widest")} />
                  <button type="button" onClick={() => setPin(randomPin())} aria-label="Generate a random PIN" className="flex h-[2.6rem] w-11 shrink-0 items-center justify-center rounded-lg border border-line hover:border-gold">
                    <Shuffle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm text-mute">Categories in this gallery</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const on = cats.includes(c);
                  return (
                    <button
                      type="button"
                      key={c}
                      aria-pressed={on}
                      onClick={() => setCats((p) => (on ? p.filter((x) => x !== c) : [...p, c]))}
                      className={cn("rounded-full border px-4 py-2 text-sm", on ? "border-gold bg-gold text-ink" : "border-line text-paper")}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            {error && <p className="text-sm text-rose" role="alert">{error}</p>}
            <button disabled={busy || pin.length !== 4 || !cats.length} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-3 font-medium text-ink disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create event
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
