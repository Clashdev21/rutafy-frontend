import { cn } from "@/lib/utils";

type Props = {
  origin: string;
  destination: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: { origin: "text-base", dest: "text-base", arrow: "text-lg", gap: "gap-1" },
  md: { origin: "text-xl", dest: "text-xl", arrow: "text-2xl", gap: "gap-2" },
  lg: { origin: "text-2xl font-bold", dest: "text-2xl font-bold", arrow: "text-3xl", gap: "gap-3" },
};

export function MessengerRouteVisual({
  origin,
  destination,
  size = "md",
  className,
}: Props) {
  const s = sizeClasses[size];
  return (
    <div className={cn("flex flex-col items-start", s.gap, className)} aria-label={`${origin} a ${destination}`}>
      <p className={cn("leading-tight text-[#0F172A]", s.origin)}>{origin}</p>
      <span className={cn("text-[#94A3B8] font-light leading-none select-none", s.arrow)} aria-hidden>
        ↓
      </span>
      <p className={cn("leading-tight text-[#0F172A]", s.dest)}>{destination}</p>
    </div>
  );
}
