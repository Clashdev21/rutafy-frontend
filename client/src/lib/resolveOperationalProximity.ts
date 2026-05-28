import type { OperationalGeofenceState } from "@/lib/resolveOperationalCopy";
import { resolveGpsFreshness } from "@/lib/resolveGpsFreshness";
import {
  formatOperationalDistance,
  haversineDistanceMeters,
} from "@/lib/resolveOperationalDistance";

export type OperationalProximityProgressTier = "low" | "medium" | "high" | "complete";

export type OperationalProximityResult = {
  label: string;
  progress: number;
  tier: OperationalProximityProgressTier;
  distanceLabel: string | null;
};

export type ResolveOperationalProximityInput = {
  serviceStatus: string;
  geofenceState?: OperationalGeofenceState | null;
  messengerLat?: number | null;
  messengerLng?: number | null;
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  locationUpdatedAt?: string | null;
  now?: number;
};

function isValidCoord(lat?: number | null, lng?: number | null): boolean {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
}

function progressFromMeters(meters: number): {
  progress: number;
  tier: OperationalProximityProgressTier;
} {
  if (meters <= 100) return { progress: 1, tier: "complete" };
  if (meters <= 500) return { progress: 0.75, tier: "high" };
  if (meters <= 1000) return { progress: 0.5, tier: "medium" };
  return { progress: 0.25, tier: "low" };
}

export function resolveOperationalProximity(
  input: ResolveOperationalProximityInput,
): OperationalProximityResult | null {
  const freshness = resolveGpsFreshness(input.locationUpdatedAt, input.now);
  if (freshness === "stale" || freshness === "unknown") return null;

  const status = String(input.serviceStatus ?? "").trim().toUpperCase();
  if (status !== "CLAIMED" && status !== "STARTED") return null;

  if (!isValidCoord(input.messengerLat, input.messengerLng)) return null;

  const geofence = input.geofenceState ?? null;

  if (geofence === "AT_PICKUP") {
    return {
      label: "Llegó al punto de recogida",
      progress: 1,
      tier: "complete",
      distanceLabel: null,
    };
  }

  if (geofence === "AT_DROPOFF") {
    return {
      label: "Llegó al punto de entrega",
      progress: 1,
      tier: "complete",
      distanceLabel: null,
    };
  }

  const isClaimed = status === "CLAIMED";
  const targetLat = isClaimed ? input.originLat : input.destinationLat;
  const targetLng = isClaimed ? input.originLng : input.destinationLng;
  if (!isValidCoord(targetLat, targetLng)) return null;

  const meters = haversineDistanceMeters(
    input.messengerLat!,
    input.messengerLng!,
    targetLat!,
    targetLng!,
  );

  const { progress, tier } = progressFromMeters(meters);

  const label =
    meters <= 500
      ? isClaimed
        ? "Cerca del punto de recogida"
        : "Cerca del punto de entrega"
      : isClaimed
        ? "Rumbo al punto de recogida"
        : "Rumbo al destino";

  return {
    label,
    progress,
    tier,
    distanceLabel: formatOperationalDistance(meters),
  };
}
