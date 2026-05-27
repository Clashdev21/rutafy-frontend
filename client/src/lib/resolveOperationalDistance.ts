import { resolveGpsFreshness } from "@/lib/resolveGpsFreshness";

const EARTH_RADIUS_M = 6_371_000;

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export function formatOperationalDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "~0 m";

  if (meters < 1000) {
    const rounded = Math.max(10, Math.round(meters / 10) * 10);
    return `~${rounded} m`;
  }

  const km = Math.round((meters / 1000) * 10) / 10;
  return `~${km} km`;
}

export type OperationalDistanceLabelInput = {
  serviceStatus: string;
  messengerLat?: number | null;
  messengerLng?: number | null;
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  locationUpdatedAt?: string | null;
  geofenceState?: "AT_PICKUP" | "AT_DROPOFF" | null;
  now?: number;
};

function isValidCoord(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

export function resolveOperationalDistanceLabel(
  input: OperationalDistanceLabelInput,
): string | null {
  const freshness = resolveGpsFreshness(input.locationUpdatedAt, input.now);
  if (freshness === "stale" || freshness === "unknown") return null;

  if (input.geofenceState === "AT_PICKUP" || input.geofenceState === "AT_DROPOFF") {
    return null;
  }

  if (!isValidCoord(input.messengerLat, input.messengerLng)) return null;

  const status = String(input.serviceStatus ?? "")
    .trim()
    .toUpperCase();

  if (status === "CLAIMED") {
    if (!isValidCoord(input.originLat, input.originLng)) return null;
    const meters = haversineDistanceMeters(
      input.messengerLat!,
      input.messengerLng!,
      input.originLat!,
      input.originLng!,
    );
    return `A ${formatOperationalDistance(meters)} del punto de recogida`;
  }

  if (status === "STARTED") {
    if (!isValidCoord(input.destinationLat, input.destinationLng)) return null;
    const meters = haversineDistanceMeters(
      input.messengerLat!,
      input.messengerLng!,
      input.destinationLat!,
      input.destinationLng!,
    );
    return `A ${formatOperationalDistance(meters)} del destino`;
  }

  return null;
}
