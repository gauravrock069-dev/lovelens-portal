import { Aperture } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Brand({ className, spin = 0 }: { className?: string; spin?: number }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Aperture
        className="h-6 w-6 text-gold transition-transform duration-500"
        style={{ transform: `rotate(${spin}deg)` }}
        strokeWidth={1.4}
        aria-hidden
      />
      <span className="font-display text-2xl font-medium tracking-wide">Love Lens Wedding</span>
    </div>
  );
}
