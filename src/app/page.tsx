import Brand from "@/components/Brand";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Brand />
      <p className="max-w-xs text-sm text-mute">
        Open the gallery link your photographer sent you to view your photos.
      </p>

      <div className="mt-4 flex flex-col items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg bg-gold/15 px-5 py-2.5 text-sm font-medium text-gold border border-gold/30 hover:bg-gold/25 transition-all shadow-sm"
        >
          <Lock className="h-4 w-4" />
          <span>Studio Manager / Admin Login</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <span className="text-xs text-mute/60">
          Photographer portal to upload photos and manage galleries
        </span>
      </div>
    </main>
  );
}
