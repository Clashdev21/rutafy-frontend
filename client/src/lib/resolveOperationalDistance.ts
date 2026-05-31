import { formatGpsAgeSeconds, resolveGpsFreshness } from "@/lib/resolveGpsFreshness";

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

function formatTrackingDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "0 m";

  if (meters < 1000) {
    const rounded = Math.max(10, Math.round(meters / 10) * 10);
    return `${rounded} m`;
  }

  const km = Math.round((meters / 1000) * 10) / 10;
  return `${km} km`;
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

export function resolveTransportistaTrackingLine(input: {
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
}): string {
  const STALE_MSG = "Ubicación del mensajero desactualizada";
  const UNAVAILABLE_MSG = "Ubicación del mensajero no disponible";

  if (input.geofenceState === "AT_PICKUP") {
    return "Mensajero en punto de recogida";
  }
  if (input.geofenceState === "AT_DROPOFF") {
    return "Mensajero en punto de entrega";
  }

  const freshness = resolveGpsFreshness(input.locationUpdatedAt, input.now);
  if (freshness === "stale") return STALE_MSG;
  if (freshness === "unknown") return UNAVAILABLE_MSG;

  if (!isValidCoord(input.messengerLat, input.messengerLng)) return UNAVAILABLE_MSG;

  const status = String(input.serviceStatus ?? "")
    .trim()
    .toUpperCase();

  let targetLat: number | null = null;
  let targetLng: number | null = null;

  if (status === "CLAIMED") {
    if (!isValidCoord(input.originLat, input.originLng)) return UNAVAILABLE_MSG;
    targetLat = input.originLat!;
    targetLng = input.originLng!;
  } else if (status === "STARTED") {
    if (!isValidCoord(input.destinationLat, input.destinationLng)) return UNAVAILABLE_MSG;
    targetLat = input.destinationLat!;
    targetLng = input.destinationLng!;
  } else {
    return UNAVAILABLE_MSG;
  }

  const meters = haversineDistanceMeters(
    input.messengerLat!,
    input.messengerLng!,
    targetLat,
    targetLng,
  );
  const distance = formatTrackingDistance(meters);
  const gpsAge = formatGpsAgeSeconds(input.locationUpdatedAt, input.now);
  const gpsPart = gpsAge ? `GPS ${gpsAge}` : "GPS activo";

  return `Mensajero a ${distance} · ${gpsPart}`;
}

export function resolveMessengerSelfTrackingLine(input: {
  serviceStatus: string;
  messengerLat?: number | null;
  messengerLng?: number | null;
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  locationFresh: boolean;
  geofenceState?: "AT_PICKUP" | "AT_DROPOFF" | null;
}): string | null {
  const STALE_MSG = "Ubicación del mensajero desactualizada";

  if (input.geofenceState === "AT_PICKUP") return "En punto de recogida";
  if (input.geofenceState === "AT_DROPOFF") return "En punto de entrega";

  if (!input.locationFresh) return STALE_MSG;
  if (!isValidCoord(input.messengerLat, input.messengerLng)) {
    return "Ubicación GPS no disponible";
  }

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
    return `A ${formatTrackingDistance(meters)} del punto de recogida`;
  }

  if (status === "STARTED") {
    if (!isValidCoord(input.destinationLat, input.destinationLng)) return null;
    const meters = haversineDistanceMeters(
      input.messengerLat!,
      input.messengerLng!,
      input.destinationLat!,
      input.destinationLng!,
    );
    return `A ${formatTrackingDistance(meters)} del destino`;
  }

  return null;
}
