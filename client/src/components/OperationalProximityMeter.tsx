import {
  resolveOperationalProximity,
  type OperationalProximityProgressTier,
} from "@/lib/resolveOperationalProximity";
import { cn } from "@/lib/utils";

type OperationalProximityMeterProps = {
  serviceStatus: string;
  geofenceState?: "AT_PICKUP" | "AT_DROPOFF" | null;
  messengerLat?: number | null;
  messengerLng?: number | null;
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  locationUpdatedAt?: string | null;
  className?: string;
};

const tierBarClass: Record<OperationalProximityProgressTier, string> = {
  low: "bg-white/35",
  medium: "bg-emerald-300/70",
  high: "bg-emerald-200",
  complete: "bg-emerald-100",
};

export function OperationalProximityMeter({
  serviceStatus,
  geofenceState,
  messengerLat,
  messengerLng,
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  locationUpdatedAt,
  className,
}: OperationalProximityMeterProps) {
  const result = resolveOperationalProximity({
    serviceStatus,
    geofenceState,
    messengerLat,
    messengerLng,
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    locationUpdatedAt,
  });

  if (!result) return null;

  const pct = Math.round(result.progress * 100);

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/5 px-3 py-2 space-y-1.5",
        className,
      )}
      aria-label={result.label}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium leading-snug text-white/90">{result.label}</span>
        {result.distanceLabel ? (
          <span className="shrink-0 tabular-nums text-white/65">{result.distanceLabel}</span>
        ) : null}
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-white/15"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
            tierBarClass[result.tier],
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
