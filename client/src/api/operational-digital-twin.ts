import type { OperationalControlMapData } from "@/api/operational-control";
import { adminHttp, parseAdminApiError } from "@/api/adminHttp";
import axios from "axios";

export type OperationalDigitalTwinDeclaredTruth = {
  port_code?: string | null;
  destination_code?: string | null;
  scheduled_at?: string | null;
  driver_name?: string | null;
  plate?: string | null;
  status_raw?: string | null;
};

export type OperationalDigitalTwinObservedTruth = {
  last_event_type?: string | null;
  last_operational_event_type?: string | null;
  last_event_at?: string | null;
  current_node_code?: string | null;
  inside_port?: boolean | null;
  loading_inferred?: boolean | null;
  monitoring_status?: string | null;
  gps_status?: string | null;
  technical_gps_status?: string | null;
};

export type OperationalDigitalTwinInferredTruth = {
  loading_probability?: number | null;
  expected_exit_port_at?: string | null;
  expected_arrival_cdr?: string | null;
  next_expected_event?: string | null;
};

export type OperationalDigitalTwinCurrentLocation = {
  node_code?: string | null;
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type JourneyTrackingMode = "EMAIL_ONLY" | "HYBRID" | "TELEMETRY";

export type OperationalDigitalTwinJourneyLiveStep = {
  step: string;
  status?: string | null;
};

export type OperationalDigitalTwinTimelineSummaryItem = {
  key?: string | null;
  label?: string | null;
  at?: string | null;
  status?: string | null;
};

/** Canonical backend elapsed for time inside port. */
export type OperationalInsidePortElapsed = {
  minutes: number | null;
  label: string | null;
  source: string | null;
};

/** Canonical backend elapsed for CDR stay. */
export type OperationalCdrElapsed = {
  status: string | null;
  minutes: number | null;
  label: string | null;
  arrived_at: string | null;
  exited_at: string | null;
};

/** Canonical backend stationary duration. */
export type OperationalStationaryTime = {
  minutes: number | null;
  label: string | null;
};

export type OperationalDigitalTwinJourneyProgress = {
  percent?: number | null;
  current_step?: string | null;
  next_step?: string | null;
};

export type OperationalDigitalTwinNextStep = {
  key?: string | null;
  label?: string | null;
  eta?: string | null;
  minutes?: number | null;
};

/** Canonical ETA object from Digital Twin (legacy string normalizes to eta_at). */
export type OperationalEta = {
  eta_at?: string | null;
  destination_code?: string | null;
  source?: string | null;
  source_label?: string | null;
  confidence?: number | null;
  label?: string | null;
  is_expired?: boolean | null;
  expired_by_minutes?: number | null;
};

export type OperationalJourneyPhase = {
  key: string;
  label: string;
  completed?: boolean;
  current?: boolean;
};

export type OperationalRouteNode = {
  code?: string | null;
  name?: string | null;
  label?: string | null;
  is_current?: boolean;
  is_destination?: boolean;
};

export type OperationalDigitalTwinRisk = {
  level?: string | null;
  score?: number | null;
  reasons?: string[];
};

export type OperationalDigitalTwinDriver = {
  messenger_id?: string | null;
  name?: string | null;
  plate?: string | null;
  phone?: string | null;
  vehicle_type?: string | null;
  gps_status?: string | null;
  last_location_at?: string | null;
  doc_id?: string | null;
  assignment_state?: string | null;
};

export type OperationalDigitalTwinTimelineEvent = {
  at?: string | null;
  title: string;
  detail?: string | null;
  phase?: string | null;
};

export type OperationalDigitalTwin = {
  container_id: string;
  container_label?: string | null;
  program_code?: string | null;
  client_name?: string | null;
  current_phase?: string | null;
  current_phase_label?: string | null;
  current_location?: OperationalDigitalTwinCurrentLocation | null;
  journey_current_state?: string | null;
  journey_current_leg?: number | null;
  journey_corridor_code?: string | null;
  journey_tracking_mode?: JourneyTrackingMode | string | null;
  journey_live?: OperationalDigitalTwinJourneyLiveStep[];
  journey_progress?: OperationalDigitalTwinJourneyProgress | null;
  next_expected_step?: OperationalDigitalTwinNextStep | null;
  eta?: OperationalEta | null;
  risk?: OperationalDigitalTwinRisk | null;
  declared_truth: OperationalDigitalTwinDeclaredTruth;
  observed_truth: OperationalDigitalTwinObservedTruth;
  inferred_truth: OperationalDigitalTwinInferredTruth;
  durations?: Record<string, unknown> | null;
  inside_port_elapsed?: OperationalInsidePortElapsed | null;
  cdr_elapsed?: OperationalCdrElapsed | null;
  stationary_time?: OperationalStationaryTime | null;
  driver?: OperationalDigitalTwinDriver | null;
  timeline: OperationalDigitalTwinTimelineEvent[];
  timeline_summary?: OperationalDigitalTwinTimelineSummaryItem[];
  alerts: string[];
  map: OperationalControlMapData;
  gps_status?: string | null;
  gps_last_seen_at?: string | null;
  current_node_label?: string | null;
  next_node_label?: string | null;
  minutes_to_next?: number | null;
  corridor_name?: string | null;
  route_nodes?: OperationalRouteNode[];
  journey_phases?: OperationalJourneyPhase[];
  heartbeat_at?: string | null;
};

export type OperationalDigitalTwinListParams = {
  program_code?: string;
  client?: string;
  port?: string;
  limit?: number;
};

export type OperationalDigitalTwinContainerParams = {
  program_code?: string;
};

function ensureApiBase(): void {
  const base = import.meta.env.VITE_RUTAFY_API_BASE;
  if (typeof base !== "string" || !base.trim()) {
    throw new Error("VITE_RUTAFY_API_BASE no está configurado");
  }
}

function toOptionalString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  return null;
}

function pick<T>(
  rec: Record<string, unknown>,
  snake: string,
  read: (value: unknown) => T | null,
): T | null {
  const camel = snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return read(rec[snake] ?? rec[camel]);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const s = toOptionalString(item);
    if (s) out.push(s);
  }
  return out;
}

function normalizeAlerts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      out.push(item.trim());
      continue;
    }
    if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      const msg =
        pick(rec, "message", toOptionalString) ??
        pick(rec, "label", toOptionalString) ??
        pick(rec, "text", toOptionalString);
      if (msg) out.push(msg);
    }
  }
  return out;
}

function normalizeMapPoint(raw: unknown): OperationalControlMapData["driver"] {
  const rec = asRecord(raw);
  if (!rec) return null;
  const lat = pick(rec, "lat", toFiniteNumber);
  const lng = pick(rec, "lng", toFiniteNumber);
  const code = pick(rec, "code", toOptionalString);
  const city = pick(rec, "city", toOptionalString);
  const label =
    pick(rec, "label", toOptionalString) ??
    pick(rec, "name", toOptionalString) ??
    code;
  if (lat == null || lng == null) return null;
  return { lat, lng, label, code, city };
}

function normalizePolyline(raw: unknown): NonNullable<OperationalControlMapData["polyline"]> {
  if (!Array.isArray(raw)) return [];
  const out: NonNullable<OperationalControlMapData["polyline"]> = [];
  for (const item of raw) {
    const point = normalizeMapPoint(item);
    if (point) out.push(point);
  }
  return out;
}

function normalizeMapData(raw: unknown): OperationalControlMapData {
  const rec = asRecord(raw);
  if (!rec) return { polyline: [] };
  return {
    driver: normalizeMapPoint(rec.driver ?? rec.driver_position),
    declared_port: normalizeMapPoint(rec.declared_port ?? rec.port_declared),
    confirmed_port: normalizeMapPoint(rec.confirmed_port ?? rec.port_confirmed),
    destination: normalizeMapPoint(rec.destination ?? rec.destino),
    polyline: normalizePolyline(rec.polyline ?? rec.route ?? rec.path),
  };
}

function normalizeDeclaredTruth(raw: unknown): OperationalDigitalTwinDeclaredTruth {
  const rec = asRecord(raw);
  if (!rec) return {};
  return {
    port_code:
      pick(rec, "port_code", toOptionalString) ??
      pick(rec, "declared_port_code", toOptionalString) ??
      pick(rec, "declared_port", toOptionalString),
    destination_code:
      pick(rec, "destination_code", toOptionalString) ??
      pick(rec, "declared_destination_code", toOptionalString) ??
      pick(rec, "declared_destination", toOptionalString),
    scheduled_at:
      pick(rec, "scheduled_at", toOptionalString) ??
      pick(rec, "scheduled_time", toOptionalString),
    driver_name: pick(rec, "driver_name", toOptionalString),
    plate:
      pick(rec, "plate", toOptionalString) ?? pick(rec, "driver_plate", toOptionalString),
    status_raw: pick(rec, "status_raw", toOptionalString),
  };
}

function normalizeObservedTruth(raw: unknown): OperationalDigitalTwinObservedTruth {
  const rec = asRecord(raw);
  if (!rec) return {};
  return {
    last_event_type:
      pick(rec, "last_event_type", toOptionalString) ??
      pick(rec, "event_type", toOptionalString),
    last_operational_event_type: pick(rec, "last_operational_event_type", toOptionalString),
    last_event_at:
      pick(rec, "last_event_at", toOptionalString) ??
      pick(rec, "occurred_at", toOptionalString),
    current_node_code:
      pick(rec, "current_node_code", toOptionalString) ??
      pick(rec, "node_code", toOptionalString),
    inside_port: pick(rec, "inside_port", toOptionalBoolean),
    loading_inferred: pick(rec, "loading_inferred", toOptionalBoolean),
    monitoring_status: pick(rec, "monitoring_status", toOptionalString),
    gps_status: pick(rec, "gps_status", toOptionalString),
    technical_gps_status: pick(rec, "technical_gps_status", toOptionalString),
  };
}

function normalizeInferredTruth(raw: unknown): OperationalDigitalTwinInferredTruth {
  const rec = asRecord(raw);
  if (!rec) return {};
  return {
    loading_probability: pick(rec, "loading_probability", toFiniteNumber),
    expected_exit_port_at: pick(rec, "expected_exit_port_at", toOptionalString),
    expected_arrival_cdr:
      pick(rec, "expected_arrival_cdr", toOptionalString) ??
      pick(rec, "expected_arrival_at", toOptionalString),
    next_expected_event: pick(rec, "next_expected_event", toOptionalString),
  };
}

function normalizeJourneyPhases(raw: unknown): OperationalJourneyPhase[] {
  if (!Array.isArray(raw)) return [];
  const out: OperationalJourneyPhase[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const key = pick(rec, "key", toOptionalString) ?? pick(rec, "id", toOptionalString);
    const label = pick(rec, "label", toOptionalString) ?? pick(rec, "title", toOptionalString);
    if (!key || !label) continue;
    out.push({
      key,
      label,
      completed: Boolean(rec.completed ?? rec.done),
      current: Boolean(rec.current ?? rec.is_current),
    });
  }
  return out;
}

function normalizeRouteNodes(raw: unknown): OperationalRouteNode[] {
  if (!Array.isArray(raw)) return [];
  const out: OperationalRouteNode[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const code = pick(rec, "code", toOptionalString);
    const name = pick(rec, "name", toOptionalString) ?? pick(rec, "label", toOptionalString);
    if (!code && !name) continue;
    out.push({
      code,
      name,
      label: pick(rec, "label", toOptionalString) ?? name ?? code,
      is_current: Boolean(rec.is_current ?? rec.current),
      is_destination: Boolean(rec.is_destination ?? rec.is_dest),
    });
  }
  return out;
}

function normalizeJourneyProgress(raw: unknown): OperationalDigitalTwinJourneyProgress | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  return {
    percent: pick(rec, "percent", toFiniteNumber) ?? pick(rec, "percentage", toFiniteNumber),
    current_step:
      pick(rec, "current_step", toOptionalString) ?? pick(rec, "current", toOptionalString),
    next_step: pick(rec, "next_step", toOptionalString),
  };
}

function normalizeNextStep(raw: unknown): OperationalDigitalTwinNextStep | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const label = pick(rec, "label", toOptionalString) ?? pick(rec, "title", toOptionalString);
  const key = pick(rec, "key", toOptionalString) ?? pick(rec, "id", toOptionalString);
  if (!label && !key) return null;
  return {
    key,
    label: label ?? key,
    eta: pick(rec, "eta", toOptionalString) ?? pick(rec, "eta_at", toOptionalString),
    minutes: pick(rec, "minutes", toFiniteNumber) ?? pick(rec, "minutes_to_next", toFiniteNumber),
  };
}

export function normalizeOperationalEta(raw: unknown): OperationalEta | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const eta_at = toOptionalString(raw);
    return eta_at ? { eta_at } : null;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return null;
  }
  const rec = asRecord(raw);
  if (!rec) return null;
  const eta_at =
    pick(rec, "eta_at", toOptionalString) ??
    pick(rec, "at", toOptionalString) ??
    pick(rec, "eta", toOptionalString) ??
    pick(rec, "value", toOptionalString);
  const source = pick(rec, "source", toOptionalString);
  const source_label = pick(rec, "source_label", toOptionalString);
  const label = pick(rec, "label", toOptionalString);
  const destination_code = pick(rec, "destination_code", toOptionalString);
  const confidence = pick(rec, "confidence", toFiniteNumber);
  const expired_by_minutes = pick(rec, "expired_by_minutes", toFiniteNumber);
  let is_expired: boolean | null = null;
  if (typeof rec.is_expired === "boolean") is_expired = rec.is_expired;
  else if (typeof rec.expired === "boolean") is_expired = rec.expired;

  if (
    !eta_at &&
    !source &&
    !source_label &&
    !label &&
    !destination_code &&
    confidence == null &&
    is_expired == null &&
    expired_by_minutes == null
  ) {
    return null;
  }
  return {
    eta_at,
    destination_code,
    source,
    source_label,
    confidence,
    label,
    is_expired,
    expired_by_minutes,
  };
}

/** ISO instant from modern or legacy ETA shape. */
export function operationalEtaAt(eta?: OperationalEta | string | null): string | null {
  if (eta == null) return null;
  if (typeof eta === "string") return eta.trim() || null;
  return eta.eta_at?.trim() || null;
}

function normalizeRisk(raw: unknown): OperationalDigitalTwinRisk | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const level = pick(rec, "level", toOptionalString) ?? pick(rec, "band", toOptionalString);
  const reasons = normalizeStringList(rec.reasons ?? rec.alerts);
  const score = pick(rec, "score", toFiniteNumber);
  if (!level && reasons.length === 0 && score == null) return null;
  return { level, score, reasons };
}

function normalizeDriver(raw: unknown): OperationalDigitalTwinDriver | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const name = pick(rec, "name", toOptionalString) ?? pick(rec, "driver_name", toOptionalString);
  const plate = pick(rec, "plate", toOptionalString);
  const messenger_id =
    pick(rec, "messenger_id", toOptionalString) ?? pick(rec, "mensajero_id", toOptionalString);
  if (!name && !plate && !messenger_id) return null;
  return {
    messenger_id,
    name,
    plate,
    phone: pick(rec, "phone", toOptionalString),
    vehicle_type: pick(rec, "vehicle_type", toOptionalString),
    gps_status: pick(rec, "gps_status", toOptionalString),
    last_location_at: pick(rec, "last_location_at", toOptionalString),
    doc_id:
      pick(rec, "doc_id", toOptionalString) ??
      pick(rec, "driver_doc_id", toOptionalString),
    assignment_state: pick(rec, "assignment_state", toOptionalString),
  };
}

function normalizeCurrentLocation(raw: unknown): OperationalDigitalTwinCurrentLocation | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const node_code =
    pick(rec, "node_code", toOptionalString) ?? pick(rec, "code", toOptionalString);
  const name =
    pick(rec, "name", toOptionalString) ?? pick(rec, "label", toOptionalString);
  const lat = pick(rec, "lat", toFiniteNumber);
  const lng = pick(rec, "lng", toFiniteNumber);
  if (!node_code && !name && lat == null && lng == null) return null;
  return { node_code, name, lat, lng };
}

function normalizeJourneyTrackingMode(raw: unknown): JourneyTrackingMode | string | null {
  const s = toOptionalString(raw);
  if (!s) return null;
  const key = s.toUpperCase().replace(/[\s-]+/g, "_");
  if (key === "EMAIL_ONLY" || key === "HYBRID" || key === "TELEMETRY") return key;
  return s;
}

function normalizeJourneyLive(raw: unknown): OperationalDigitalTwinJourneyLiveStep[] {
  if (!Array.isArray(raw)) return [];
  const out: OperationalDigitalTwinJourneyLiveStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const step =
      pick(rec, "step", toOptionalString) ??
      pick(rec, "key", toOptionalString) ??
      pick(rec, "id", toOptionalString) ??
      pick(rec, "label", toOptionalString);
    if (!step) continue;
    out.push({
      step,
      status: pick(rec, "status", toOptionalString) ?? pick(rec, "state", toOptionalString),
    });
  }
  return out;
}

function normalizeTimelineSummary(raw: unknown): OperationalDigitalTwinTimelineSummaryItem[] {
  if (!Array.isArray(raw)) return [];
  const out: OperationalDigitalTwinTimelineSummaryItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const label =
      pick(rec, "label", toOptionalString) ??
      pick(rec, "title", toOptionalString) ??
      pick(rec, "step", toOptionalString);
    const key = pick(rec, "key", toOptionalString) ?? pick(rec, "id", toOptionalString);
    if (!label && !key) continue;
    out.push({
      key,
      label: label ?? key,
      at: pick(rec, "at", toOptionalString) ?? pick(rec, "occurred_at", toOptionalString),
      status: pick(rec, "status", toOptionalString),
    });
  }
  return out;
}

function normalizeInsidePortElapsed(raw: unknown): OperationalInsidePortElapsed | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { minutes: raw, label: null, source: null };
  }
  const rec = asRecord(raw);
  if (!rec) return null;
  return {
    minutes: pick(rec, "minutes", toFiniteNumber),
    label: pick(rec, "label", toOptionalString),
    source: pick(rec, "source", toOptionalString),
  };
}

function normalizeCdrElapsed(raw: unknown): OperationalCdrElapsed | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return {
      status: null,
      minutes: raw,
      label: null,
      arrived_at: null,
      exited_at: null,
    };
  }
  const rec = asRecord(raw);
  if (!rec) return null;
  return {
    status: pick(rec, "status", toOptionalString),
    minutes: pick(rec, "minutes", toFiniteNumber),
    label: pick(rec, "label", toOptionalString),
    arrived_at: pick(rec, "arrived_at", toOptionalString),
    exited_at: pick(rec, "exited_at", toOptionalString),
  };
}

function normalizeStationaryTime(raw: unknown): OperationalStationaryTime | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { minutes: raw, label: null };
  }
  const rec = asRecord(raw);
  if (!rec) return null;
  return {
    minutes: pick(rec, "minutes", toFiniteNumber),
    label: pick(rec, "label", toOptionalString),
  };
}

function pickElapsedFromDurations(
  durations: Record<string, unknown> | null,
  key: string,
): unknown {
  if (!durations) return null;
  return durations[key] ?? durations[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())];
}

function normalizeTimeline(raw: unknown): OperationalDigitalTwinTimelineEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: OperationalDigitalTwinTimelineEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const title =
      pick(rec, "title", toOptionalString) ??
      pick(rec, "label", toOptionalString) ??
      pick(rec, "event_type", toOptionalString);
    if (!title) continue;
    out.push({
      at: pick(rec, "at", toOptionalString) ?? pick(rec, "occurred_at", toOptionalString),
      title,
      detail: pick(rec, "detail", toOptionalString) ?? pick(rec, "description", toOptionalString),
      phase: pick(rec, "phase", toOptionalString),
    });
  }
  return out;
}

export function normalizeOperationalDigitalTwin(raw: unknown): OperationalDigitalTwin | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const root =
    asRecord(rec.digital_twin ?? rec.digitalTwin ?? rec.twin ?? rec.container) ?? rec;

  const container_id =
    pick(root, "container_id", toOptionalString) ?? pick(root, "id", toOptionalString);
  if (!container_id) return null;

  const journeyRaw = root.journey_progress ?? root.journeyProgress;
  const nextStepRaw = root.next_expected_step ?? root.nextExpectedStep;
  const routeRaw =
    root.route_nodes ??
    root.routeNodes ??
    asRecord(root.route)?.nodes ??
    asRecord(root.corridor)?.nodes ??
    asRecord(root.journey)?.nodes;
  const durations = asRecord(root.durations);
  const journeyLiveRaw =
    root.journey_live ??
    root.journeyLive ??
    asRecord(root.journey)?.live ??
    asRecord(root.journey)?.steps;

  return {
    container_id,
    container_label:
      pick(root, "container_label", toOptionalString) ??
      pick(root, "container", toOptionalString),
    program_code: pick(root, "program_code", toOptionalString),
    client_name: pick(root, "client_name", toOptionalString),
    current_phase: pick(root, "current_phase", toOptionalString),
    current_phase_label:
      pick(root, "current_phase_label", toOptionalString) ??
      pick(root, "phase_label", toOptionalString),
    current_location: normalizeCurrentLocation(
      root.current_location ?? root.currentLocation,
    ),
    journey_current_state:
      pick(root, "journey_current_state", toOptionalString) ??
      pick(asRecord(root.journey) ?? {}, "current_state", toOptionalString),
    journey_current_leg:
      pick(root, "journey_current_leg", toFiniteNumber) ??
      pick(asRecord(root.journey) ?? {}, "current_leg", toFiniteNumber),
    journey_corridor_code:
      pick(root, "journey_corridor_code", toOptionalString) ??
      pick(asRecord(root.journey) ?? {}, "corridor_code", toOptionalString) ??
      pick(asRecord(root.corridor) ?? {}, "code", toOptionalString),
    journey_tracking_mode: normalizeJourneyTrackingMode(
      root.journey_tracking_mode ??
        root.journeyTrackingMode ??
        asRecord(root.journey)?.tracking_mode,
    ),
    journey_live: normalizeJourneyLive(journeyLiveRaw),
    journey_progress: normalizeJourneyProgress(journeyRaw),
    next_expected_step: normalizeNextStep(nextStepRaw),
    eta: normalizeOperationalEta(root.eta ?? root.eta_at),
    risk: normalizeRisk(root.risk),
    declared_truth: normalizeDeclaredTruth(root.declared_truth ?? root.declaredTruth),
    observed_truth: normalizeObservedTruth(root.observed_truth ?? root.observedTruth),
    inferred_truth: normalizeInferredTruth(root.inferred_truth ?? root.inferredTruth),
    durations,
    inside_port_elapsed: normalizeInsidePortElapsed(
      root.inside_port_elapsed ??
        root.insidePortElapsed ??
        pickElapsedFromDurations(durations, "inside_port_elapsed"),
    ),
    cdr_elapsed: normalizeCdrElapsed(
      root.cdr_elapsed ??
        root.cdrElapsed ??
        pickElapsedFromDurations(durations, "cdr_elapsed"),
    ),
    stationary_time: normalizeStationaryTime(
      root.stationary_time ??
        root.stationaryTime ??
        pickElapsedFromDurations(durations, "stationary_time"),
    ),
    driver: normalizeDriver(root.driver),
    timeline: normalizeTimeline(root.timeline),
    timeline_summary: normalizeTimelineSummary(
      root.timeline_summary ?? root.timelineSummary,
    ),
    alerts: normalizeAlerts(root.alerts),
    map: normalizeMapData(root.map),
    gps_status: pick(root, "gps_status", toOptionalString),
    gps_last_seen_at: pick(root, "gps_last_seen_at", toOptionalString),
    current_node_label:
      pick(root, "current_node_label", toOptionalString) ??
      pick(root, "current_node_name", toOptionalString),
    next_node_label:
      pick(root, "next_node_label", toOptionalString) ??
      pick(root, "next_node_name", toOptionalString),
    minutes_to_next:
      pick(root, "minutes_to_next", toFiniteNumber) ??
      pick(root, "minutes_until_next", toFiniteNumber),
    corridor_name:
      pick(root, "corridor_name", toOptionalString) ??
      pick(asRecord(root.corridor) ?? {}, "name", toOptionalString) ??
      pick(asRecord(root.corridor) ?? {}, "label", toOptionalString),
    route_nodes: normalizeRouteNodes(routeRaw),
    journey_phases: normalizeJourneyPhases(
      root.journey_phases ?? root.journeyPhases ?? asRecord(journeyRaw)?.phases,
    ),
    heartbeat_at:
      pick(root, "heartbeat_at", toOptionalString) ??
      pick(root, "updated_at", toOptionalString),
  };
}

function normalizeDigitalTwinList(raw: unknown): OperationalDigitalTwin[] {
  if (!Array.isArray(raw)) return [];
  const out: OperationalDigitalTwin[] = [];
  for (const item of raw) {
    const twin = normalizeOperationalDigitalTwin(item);
    if (twin) out.push(twin);
  }
  return out;
}

function buildQuery(params?: Record<string, string | number | undefined>): Record<string, string> {
  const query: Record<string, string> = {};
  if (!params) return query;
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    const v = String(value).trim();
    if (v && v.toLowerCase() !== "all") query[key] = v;
  }
  return query;
}

export async function getOperationalDigitalTwinContainer(
  containerId: string,
  params?: OperationalDigitalTwinContainerParams,
): Promise<OperationalDigitalTwin> {
  ensureApiBase();
  const id = containerId.trim();
  if (!id) throw new Error("container_id inválido");

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      `/v1/admin/operational-digital-twin/containers/${encodeURIComponent(id)}`,
      { params: buildQuery(params) },
    );
    const twin = normalizeOperationalDigitalTwin(data);
    if (!twin) throw new Error("Respuesta de digital twin inválida");
    return twin;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar digital twin (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}

export async function listOperationalDigitalTwins(
  params?: OperationalDigitalTwinListParams,
): Promise<OperationalDigitalTwin[]> {
  ensureApiBase();

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      "/v1/admin/operational-digital-twin",
      { params: buildQuery(params) },
    );

    const candidates = [data.items, data.containers, data.twins, data.rows];
    for (const c of candidates) {
      const list = normalizeDigitalTwinList(c);
      if (list.length > 0) return list;
    }
    return normalizeDigitalTwinList(data.items);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar digital twins (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}
