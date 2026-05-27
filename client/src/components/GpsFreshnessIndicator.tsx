import {
  formatGpsAge,
  resolveGpsFreshness,
} from "@/lib/resolveGpsFreshness";
import { cn } from "@/lib/utils";

type GpsFreshnessIndicatorProps = {
  updatedAt?: string | null;
  compact?: boolean;
  className?: string;
};

export function GpsFreshnessIndicator({
  updatedAt,
  compact = false,
  className,
}: GpsFreshnessIndicatorProps) {
  const tier = resolveGpsFreshness(updatedAt);

  if (tier === "unknown") return null;

  const ageLabel = formatGpsAge(updatedAt);

  let label: string;
  switch (tier) {
    case "fresh":
      label = "Ubicación en vivo";
      break;
    case "aging":
      label = ageLabel ? `Ubicación ${ageLabel}` : "Ubicación hace ~1 min";
      break;
    case "stale":
      label = "Ubicación desactualizada";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full items-center rounded-full border font-medium leading-snug",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        tier === "fresh" &&
          "border-emerald-300/35 bg-emerald-500/15 text-emerald-50",
        tier === "aging" &&
          "border-amber-300/40 bg-amber-500/20 text-amber-50",
        tier === "stale" &&
          "border-orange-300/40 bg-orange-500/25 text-orange-50",
        className,
      )}
      aria-label={label}
    >
      {label}
    </span>
  );
}
