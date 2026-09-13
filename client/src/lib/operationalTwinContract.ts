import type {
  JourneyTrackingMode,
  OperationalDigitalTwin,
  OperationalDigitalTwinCurrentLocation,
  OperationalDigitalTwinJourneyLiveStep,
  OperationalJourneyPhase,
} from "@/api/operational-digital-twin";
import type { OperationalControlMapData } from "@/api/operational-control";

export const OPERATIONAL_PHASE_FALLBACK_LABELS: Record<string, string> = {
  AT_GATE: "En ingreso al puerto",
};

export const JOURNEY_TRACKING_MODE_LABELS: Record<JourneyTrackingMode, string> = {
  EMAIL_ONLY: "Solo correo",
  HYBRID: "Híbrido",
  TELEMETRY: "Telemetría",
};

export function normalizeOperationalPhaseCode(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

export function resolveOperationalPhaseLabel(
  currentPhase?: string | null,
  currentPhaseLabel?: string | null,
): string {
  const label = currentPhaseLabel?.trim();
  if (label) return label;

  const code = normalizeOperationalPhaseCode(currentPhase);
  if (!code) return "Sin estado";
  if (OPERATIONAL_PHASE_FALLBACK_LABELS[code]) {
    return OPERATIONAL_PHASE_FALLBACK_LABELS[code];
  }
  return code
    .split(/_+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function isAtGatePhase(currentPhase?: string | null): boolean {
  return normalizeOperationalPhaseCode(currentPhase) === "AT_GATE";
}

export function isPortIngressPhase(currentPhase?: string | null): boolean {
  const code = normalizeOperationalPhaseCode(currentPhase);
  return code === "AT_GATE" || code === "ENTERED_PORT" || code === "IN_PORT";
}

/** AT_GATE is ingress; ENTERED_PORT remains a distinct phase. */
export function isAtGateNotEnteredPort(currentPhase?: string | null): boolean {
  return isAtGatePhase(currentPhase);
}

export function journeyTrackingModeLabel(
  mode?: JourneyTrackingMode | string | null,
): string | null {
  if (mode == null || String(mode).trim() === "") return null;
  const key = String(mode)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_") as JourneyTrackingMode;
  return JOURNEY_TRACKING_MODE_LABELS[key] ?? String(mode).trim();
}

export function hasValidMapCoords(
  point?: { lat?: number | null; lng?: number | null } | null,
): boolean {
  return (
    point != null &&
    typeof point.lat === "number" &&
    Number.isFinite(point.lat) &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lng)
  );
}

export type ResolvedOperationalMapMarker = {
  lat: number;
  lng: number;
  label?: string | null;
  code?: string | null;
  source: "map_driver" | "current_location";
};

/**
 * Prefer map.driver when it has coords; otherwise fall back to current_location.
 * Never returns both — callers should use this as the single operational marker.
 */
export function resolveOperationalMapMarker(
  map: OperationalControlMapData | null | undefined,
  currentLocation?: OperationalDigitalTwinCurrentLocation | null,
): ResolvedOperationalMapMarker | null {
  if (hasValidMapCoords(map?.driver)) {
    return {
      lat: map!.driver!.lat,
      lng: map!.driver!.lng,
      label: map!.driver!.label ?? null,
      code: map!.driver!.code ?? null,
      source: "map_driver",
    };
  }
  if (hasValidMapCoords(currentLocation)) {
    return {
      lat: currentLocation!.lat!,
      lng: currentLocation!.lng!,
      label: currentLocation!.name ?? null,
      code: currentLocation!.node_code ?? null,
      source: "current_location",
    };
  }
  return null;
}

export function journeyLiveToPhases(
  live: OperationalDigitalTwinJourneyLiveStep[] | undefined | null,
): OperationalJourneyPhase[] {
  if (!live || live.length === 0) return [];
  return live.map((item, index) => {
    const status = String(item.status ?? "")
      .trim()
      .toUpperCase();
    const completed =
      status === "DONE" ||
      status === "COMPLETED" ||
      status === "COMPLETE" ||
      status === "PASSED";
    const current =
      status === "CURRENT" ||
      status === "ACTIVE" ||
      status === "IN_PROGRESS" ||
      (!completed &&
        !live.some((other, j) => {
          if (j === index) return false;
          const s = String(other.status ?? "")
            .trim()
            .toUpperCase();
          return s === "CURRENT" || s === "ACTIVE" || s === "IN_PROGRESS";
        }) &&
        index === live.findIndex((x) => {
          const s = String(x.status ?? "")
            .trim()
            .toUpperCase();
          return !(
            s === "DONE" ||
            s === "COMPLETED" ||
            s === "COMPLETE" ||
            s === "PASSED"
          );
        }));
    return {
      key: item.step,
      label: item.step.replace(/_/g, " "),
      completed,
      current: Boolean(current),
    };
  });
}

/** Format elapsed minutes for UI; null/undefined → null (never invent 0 from null). */
export function formatElapsedMinutes(minutes?: number | null): string | null {
  if (minutes == null || !Number.isFinite(minutes)) return null;
  const mins = Math.max(0, Math.round(minutes));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMin = mins % 60;
  return remMin > 0 ? `${hours} h ${remMin} min` : `${hours} h`;
}

type ElapsedLike = {
  minutes?: number | null;
  label?: string | null;
  status?: string | null;
};

/**
 * Prefer backend label; fall back to formatting minutes.
 * For CDR, status "not_arrived" with no duration yields null (do not invent).
 * minutes === 0 with or without label is a valid value.
 */
export function resolveElapsedLabel(
  elapsed?: ElapsedLike | null,
  options?: { treatNotArrivedAsEmpty?: boolean },
): string | null {
  if (elapsed == null) return null;

  const status = elapsed.status?.trim().toLowerCase() ?? "";
  const label = elapsed.label?.trim() || null;
  const hasMinutes = elapsed.minutes != null && Number.isFinite(elapsed.minutes);

  if (options?.treatNotArrivedAsEmpty !== false && status === "not_arrived" && !label && !hasMinutes) {
    return null;
  }

  if (label) return label;
  if (hasMinutes) return formatElapsedMinutes(elapsed.minutes);
  return null;
}

export function resolveTechnicalGpsStatus(twin: OperationalDigitalTwin | null | undefined): string | null {
  if (!twin) return null;
  return (
    twin.observed_truth.technical_gps_status?.trim() ||
    twin.observed_truth.gps_status?.trim() ||
    twin.gps_status?.trim() ||
    twin.driver?.gps_status?.trim() ||
    null
  );
}

export function resolveDriverIdentity(twin: OperationalDigitalTwin | null | undefined): {
  messenger_id?: string | null;
  name?: string | null;
  phone?: string | null;
  plate?: string | null;
  vehicle_type?: string | null;
  gps_status?: string | null;
  last_location_at?: string | null;
} {
  if (!twin) return {};
  const d = twin.driver;
  return {
    messenger_id: d?.messenger_id ?? null,
    name: d?.name?.trim() || twin.declared_truth.driver_name?.trim() || null,
    phone: d?.phone ?? null,
    plate: d?.plate?.trim() || twin.declared_truth.plate?.trim() || null,
    vehicle_type: d?.vehicle_type ?? null,
    gps_status: d?.gps_status ?? null,
    last_location_at: d?.last_location_at ?? null,
  };
}
