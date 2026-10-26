"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Brand from "./Brand";
import { postJson } from "@/lib/client-api";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await postJson("/api/admin/login", { password });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <Brand />
      <p className="mt-2 text-sm text-mute">Studio manager</p>
      <form onSubmit={submit} className="mt-10 w-full max-w-xs space-y-3">
        <label htmlFor="pw" className="sr-only">Password</label>
        <input
          id="pw"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Studio password"
          className="w-full rounded-lg border border-line bg-panel px-4 py-3 outline-none focus:border-gold"
        />
        {error && <p className="text-sm text-rose" role="alert">{error}</p>}
        <button
          disabled={busy || !password}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-3 font-medium text-ink disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>
      </form>
    </main>
  );
}
