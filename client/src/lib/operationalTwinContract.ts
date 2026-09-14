import type {
  JourneyTrackingMode,
  OperationalDigitalTwin,
  OperationalDigitalTwinCurrentLocation,
  OperationalDigitalTwinJourneyLiveStep,
  OperationalEta,
  OperationalJourneyPhase,
} from "@/api/operational-digital-twin";
import { operationalEtaAt } from "@/api/operational-digital-twin";
import type { OperationalControlMapData } from "@/api/operational-control";

export const OPERATIONAL_PHASE_FALLBACK_LABELS: Record<string, string> = {
  AT_GATE: "En ingreso al puerto",
  ENTERED_PORT: "Dentro del puerto",
  IN_PORT: "En puerto",
  EXIT_PORT: "Salida de puerto",
};

export const JOURNEY_TRACKING_MODE_LABELS: Record<JourneyTrackingMode, string> = {
  EMAIL_ONLY: "Solo correo",
  HYBRID: "Híbrido",
  TELEMETRY: "Telemetría",
};

/** Journey / event codes → human labels (presentation only). */
export const OPERATIONAL_EVENT_LABELS: Record<string, string> = {
  TRACKING_STARTED: "Seguimiento iniciado",
  DISPATCH_CREATED: "Despacho registrado",
  DISPATCHED: "Despacho registrado",
  AT_GATE: "En ingreso al puerto",
  UNKNOWN: "Posición no clasificada",
  GPS_LOST: "Señal GPS perdida",
  GPS_OFFLINE: "Señal GPS perdida",
  ENTERED_PORT: "Dentro del puerto",
  EXIT_PORT: "Salida de puerto",
  AT_CDR: "En CDR",
  IN_TRANSIT: "En tránsito",
};

/** journey_live step → compact bar label (do not invent new stages). */
export const JOURNEY_LIVE_BAR_LABELS: Record<string, string> = {
  DISPATCHED: "Programado",
  DISPATCH_CREATED: "Programado",
  TRACKING_STARTED: "Corredor",
  AT_GATE: "Ingreso",
  ENTERED_PORT: "Operación",
  IN_PORT: "Operación",
  EXIT_PORT: "Salida puerto",
  AT_CDR: "CDR",
  CDR: "CDR",
  IN_TRANSIT: "Tránsito",
};

/** Extensible corridor codes → human corridor labels. */
export const CORRIDOR_LABELS: Record<string, string> = {
  BV_YUMBO: "Buenaventura → Yumbo",
};

export const GPS_STATUS_HUMAN_LABELS: Record<string, string> = {
  ONLINE: "Con señal",
  OFFLINE: "Sin señal",
  STALE: "Señal antigua",
};

export type EtaSourceKind =
  | "ia"
  | "ventana"
  | "programacion"
  | "gps"
  | "estimacion_rutafy"
  | "estimacion";

export const ETA_SOURCE_BADGE_LABELS: Record<EtaSourceKind, string> = {
  ia: "IA Rutafy",
  ventana: "Ventana operativa",
  programacion: "Programación",
  gps: "Seguimiento GPS",
  estimacion_rutafy: "Estimación Rutafy",
  estimacion: "Estimación",
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
  if (OPERATIONAL_EVENT_LABELS[code]) return OPERATIONAL_EVENT_LABELS[code];
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

/**
 * True when value is AT_GATE or Spanish synonyms of "still at gate / entering".
 * Used so next step does not repeat the current ingress microstate.
 */
export function isPortIngressSynonym(value?: string | null): boolean {
  if (value == null || String(value).trim() === "") return false;
  const code = normalizeOperationalPhaseCode(value);
  if (code === "AT_GATE") return true;
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return (
    normalized === "en ingreso al puerto" ||
    normalized === "ingreso al puerto" ||
    normalized === "ingreso puerto"
  );
}

function looksLikeOperationalCode(value: string): boolean {
  const trimmed = value.trim();
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(trimmed)) return false;
  const code = normalizeOperationalPhaseCode(trimmed);
  return Boolean(
    OPERATIONAL_EVENT_LABELS[code] || OPERATIONAL_PHASE_FALLBACK_LABELS[code],
  );
}

/**
 * Resolve the human "next" label for Operación / Pronóstico.
 * Prefers canonical codes over ambiguous prose; if already AT_GATE and next is
 * an ingress synonym, advances to ENTERED_PORT → "Dentro del puerto".
 */
export function resolveNextOperationalStepLabel(input: {
  currentPhase?: string | null;
  nextNodeLabel?: string | null;
  nextExpectedStepKey?: string | null;
  nextExpectedStepLabel?: string | null;
  journeyNextStep?: string | null;
  inferredNextEvent?: string | null;
  destinationFallback?: string | null;
}): string {
  const candidates = [
    input.inferredNextEvent,
    input.nextExpectedStepKey,
    input.journeyNextStep,
    input.nextExpectedStepLabel,
    input.nextNodeLabel,
    input.destinationFallback,
  ]
    .map((v) => (v != null ? String(v).trim() : ""))
    .filter(Boolean);

  if (candidates.length === 0) return "Sin destino";

  const codesFirst = [
    ...candidates.filter(looksLikeOperationalCode),
    ...candidates.filter((c) => !looksLikeOperationalCode(c)),
  ];
  // de-dupe preserving order
  const ordered: string[] = [];
  for (const c of codesFirst) {
    if (!ordered.includes(c)) ordered.push(c);
  }

  const picked = ordered[0];
  const atGate = isAtGatePhase(input.currentPhase);

  if (atGate && isPortIngressSynonym(picked)) {
    return OPERATIONAL_EVENT_LABELS.ENTERED_PORT;
  }

  const labeled = resolveOperationalEventLabel(picked);
  if (atGate && isPortIngressSynonym(labeled)) {
    return OPERATIONAL_EVENT_LABELS.ENTERED_PORT;
  }

  return labeled || "Sin destino";
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

export function resolveJourneyStateLabel(state?: string | null): string | null {
  if (state == null || String(state).trim() === "") return null;
  const code = normalizeOperationalPhaseCode(state);
  return OPERATIONAL_EVENT_LABELS[code] ?? resolveOperationalPhaseLabel(state, null);
}

export function resolveCorridorLabel(
  corridorCode?: string | null,
  corridorName?: string | null,
): string | null {
  const name = corridorName?.trim();
  if (name && !/^[A-Z0-9_]+$/.test(name)) return name;
  const code = normalizeOperationalPhaseCode(corridorCode || name);
  if (!code) return name || null;
  if (CORRIDOR_LABELS[code]) return CORRIDOR_LABELS[code];
  if (/^BV_/.test(code)) {
    const rest = code.replace(/^BV_/, "").replace(/_/g, " ");
    return `Buenaventura → ${rest
      .split(/\s+/)
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ")}`;
  }
  return name || corridorCode?.trim() || null;
}

export function resolveGpsStatusLabel(value?: string | null): string {
  const key = normalizeOperationalPhaseCode(value);
  if (!key) return "Sin señal";
  return GPS_STATUS_HUMAN_LABELS[key] ?? value!.trim();
}

/**
 * Humanize event/timeline titles. Preserves useful backend prose.
 * AT_GATE + event-owned SPIA context → "Llegó a la entrada de SPIA".
 * Never uses current_location — only raw title / optional event context.
 */
export function resolveOperationalEventLabel(
  rawTitle?: string | null,
  context?: { nodeCode?: string | null; nodeName?: string | null },
): string {
  const raw = rawTitle?.trim();
  if (!raw) return "Evento";

  // Deterministic SPIA gate prose from the event text itself
  if (/\ben\s+gate\s+spia\b|\bgate\s+spia\b|\bspia\s+gate\b/i.test(raw)) {
    return "Llegó a la entrada de SPIA";
  }

  const code = normalizeOperationalPhaseCode(raw);
  if (code === "AT_GATE") {
    const node = `${context?.nodeCode ?? ""} ${context?.nodeName ?? ""}`.toUpperCase();
    if (/\bSPIA\b/.test(node) || /\bSPIA\b/.test(raw.toUpperCase())) {
      return "Llegó a la entrada de SPIA";
    }
    return OPERATIONAL_EVENT_LABELS.AT_GATE;
  }

  if (OPERATIONAL_EVENT_LABELS[code]) return OPERATIONAL_EVENT_LABELS[code];

  // Already human Spanish / mixed prose from backend
  if (/[a-záéíóúñ]/i.test(raw) && !/^[A-Z0-9_]+$/.test(raw)) {
    return raw;
  }

  // Title-case underscore codes
  if (/^[A-Z0-9_]+$/.test(raw)) {
    return raw
      .split(/_+/)
      .filter(Boolean)
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ");
  }
  return raw;
}

export function resolveJourneyLiveBarLabel(step?: string | null): string {
  const code = normalizeOperationalPhaseCode(step);
  if (!code) return "Paso";
  if (JOURNEY_LIVE_BAR_LABELS[code]) return JOURNEY_LIVE_BAR_LABELS[code];
  if (OPERATIONAL_EVENT_LABELS[code]) return OPERATIONAL_EVENT_LABELS[code];
  return resolveOperationalEventLabel(step);
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
      label: resolveJourneyLiveBarLabel(item.step),
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

function normalizeEtaSourceKey(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/**
 * Resolve ETA presentation source. Never default to IA.
 */
export function resolveEtaSourceKind(input: {
  eta?: OperationalEta | string | null;
  windowEndAt?: string | null;
  scheduledAt?: string | null;
  usedIso?: string | null;
  technicalGpsOnline?: boolean;
  fromInferredOnly?: boolean;
}): EtaSourceKind {
  const etaObj: OperationalEta | null =
    typeof input.eta === "string"
      ? input.eta.trim()
        ? { eta_at: input.eta.trim() }
        : null
      : input.eta ?? null;

  const source = normalizeEtaSourceKey(etaObj?.source);
  const sourceLabel = normalizeEtaSourceKey(etaObj?.source_label);

  const blob = `${source} ${sourceLabel}`;

  if (/ia|model|prediction|ml|ai|rutafy_ia|inferred_model/.test(blob)) {
    return "ia";
  }
  if (/window|ventana|window_end/.test(blob)) {
    return "ventana";
  }
  if (/schedul|program/.test(blob)) {
    return "programacion";
  }
  if (/gps|telemetr|tracking|seguimiento/.test(blob)) {
    return "gps";
  }

  const used = input.usedIso?.trim() || operationalEtaAt(etaObj);
  if (used && input.windowEndAt?.trim() && used === input.windowEndAt.trim()) {
    return "ventana";
  }
  if (used && input.scheduledAt?.trim() && used === input.scheduledAt.trim()) {
    return "programacion";
  }

  if (etaObj?.source || etaObj?.source_label) {
    return "estimacion";
  }

  if (input.fromInferredOnly) {
    return "estimacion_rutafy";
  }

  if (operationalEtaAt(etaObj)) {
    return "estimacion";
  }

  if (input.technicalGpsOnline) {
    return "gps";
  }

  if (input.windowEndAt?.trim()) return "ventana";
  if (input.scheduledAt?.trim()) return "programacion";

  return "estimacion";
}

export function etaSourceBadgeLabel(kind?: EtaSourceKind | null): string {
  if (!kind) return ETA_SOURCE_BADGE_LABELS.estimacion;
  return ETA_SOURCE_BADGE_LABELS[kind] ?? ETA_SOURCE_BADGE_LABELS.estimacion;
}

/** Badge when ETA is expired — never bare "ETA vencido" duplicate of hero. */
export function etaSourceExpiredBadgeLabel(kind?: EtaSourceKind | null): string {
  switch (kind) {
    case "ia":
      return "IA Rutafy vencida";
    case "ventana":
      return "Ventana vencida";
    case "programacion":
      return "Programación vencida";
    case "gps":
      return "Seguimiento GPS vencido";
    case "estimacion_rutafy":
      return "Estimación Rutafy vencida";
    default:
      return "Estimación vencida";
  }
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
