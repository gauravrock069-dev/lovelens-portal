"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Brand from "./Brand";
import { cn } from "@/lib/utils";

const LENGTH = 4;

export default function PinScreen({ slug, title, clientName }: { slug: string; title: string; clientName: string }) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [status, setStatus] = useState<"idle" | "checking" | "error" | "locked">("idle");
  const [message, setMessage] = useState("");
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const filled = digits.filter(Boolean).length;

  async function submit(pin: string) {
    setStatus("checking");
    try {
      const res = await fetch(`/api/gallery/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) return router.refresh();
      const data = await res.json().catch(() => ({}));
      setStatus(res.status === 429 ? "locked" : "error");
      setMessage(
        res.status === 429
          ? data.error
          : "That PIN doesn't match. Check the message your photographer sent.",
      );
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server. Check your connection and try again.");
    }
    setDigits(Array(LENGTH).fill(""));
    refs.current[0]?.focus();
  }

  function update(next: string[]) {
    setDigits(next);
    setStatus("idle");
    if (next.every(Boolean)) void submit(next.join(""));
  }

  function onChange(i: number, value: string) {
    const nums = value.replace(/\D/g, "");
    if (!nums) return update(digits.map((d, j) => (j === i ? "" : d)));
    const next = [...digits];
    nums.split("").slice(0, LENGTH - i).forEach((n, k) => (next[i + k] = n)); // handles paste
    const last = Math.min(i + nums.length, LENGTH - 1);
    refs.current[last]?.focus();
    update(next);
  }

  function onKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  }

  const locked = status === "locked" || status === "checking";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <Brand spin={filled * 22.5} />
      <h1 className="mt-14 text-center font-display text-4xl font-medium sm:text-5xl">{clientName}</h1>
      <p className="mt-2 text-center text-sm text-mute">{title}</p>

      <div className={cn("mt-12 flex gap-3", status === "error" && "animate-shake")}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            autoComplete="off"
            autoFocus={i === 0}
            disabled={locked}
            maxLength={LENGTH}
            aria-label={`PIN digit ${i + 1}`}
            className="h-16 w-14 rounded-lg border border-line bg-panel text-center text-2xl outline-none transition focus:border-gold disabled:opacity-60 sm:h-[4.5rem] sm:w-16"
          />
        ))}
      </div>

      <div className="mt-6 flex h-10 flex-col items-center text-center text-sm" aria-live="polite">
        {status === "checking" ? (
          <Loader2 className="h-5 w-5 animate-spin text-gold" aria-label="Checking PIN" />
        ) : status === "error" || status === "locked" ? (
          <p className="max-w-xs text-rose">{message}</p>
        ) : (
          <p className="text-mute">Enter the 4-digit PIN to open your gallery.</p>
        )}
      </div>
    </main>
  );
}
