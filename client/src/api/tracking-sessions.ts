import { adminHttp, parseAdminApiError } from "@/api/adminHttp";
import axios from "axios";

export type AdminTrackingSession = {
  /** Alias estable para APIs que devuelven session_id. */
  session_id: string;
  /** @deprecated Usar session_id; se mantiene por compatibilidad interna. */
  id: string;
  owner_user_id?: string | null;
  actor_id?: string | null;
  actor_type?: string | null;
  vehicle_id?: string | null;
  vehicle_label?: string | null;
  purpose?: string | null;
  status?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  last_heartbeat_at?: string | null;
  last_captured_at?: string | null;
  consent_at?: string | null;
  point_count?: number | null;
  points_count?: number | null;
  duration_seconds?: number | null;
  duration_minutes?: number | null;
  avg_accuracy_m?: number | null;
  avg_speed_kmh?: number | null;
  avg_speed_mps?: number | null;
  capture_quality?: string | null;
};

export type AdminTrackingSessionStats = {
  point_count?: number | null;
  duration_seconds?: number | null;
  avg_accuracy_m?: number | null;
  avg_speed_mps?: number | null;
  pct_accuracy_over_50m?: number | null;
  gap_count_over_60s?: number | null;
  max_gap_seconds?: number | null;
  covered_seconds?: number | null;
  coverage_pct?: number | null;
  capture_quality?: string | null;
};

export type AdminTrackingSessionDetail = {
  session: AdminTrackingSession;
  stats: AdminTrackingSessionStats;
  trace_id?: string;
};

export type ListAdminTrackingSessionsResult = {
  trace_id?: string;
  limit: number;
  sessions: AdminTrackingSession[];
};

export type ListAdminTrackingSessionsOptions = {
  limit?: number;
  status?: string;
};

export type AdminTrackingSessionCloseResult = {
  ok: boolean;
  session: {
    session_id: string;
    status: string;
    ended_at?: string | null;
  };
  trace_id?: string;
};

export type AdminTrackingSessionPointsResult = {
  trace_id?: string;
  session_id: string;
  points: TrackingRoutePoint[];
  limit: number;
  total?: number | null;
};

/** ID canónico de sesión para rutas y mutaciones. */
export function resolveTrackingSessionId(
  session: Pick<AdminTrackingSession, "session_id" | "id"> | string,
): string {
  if (typeof session === "string") return session.trim();
  return (session.session_id || session.id || "").trim();
}

function parseAdminTrackingError(err: unknown, fallback: string): never {
  if (axios.isAxiosError(err) && err.response) {
    throw new Error(
      parseAdminApiError(
        err.response.data as { error?: string; message?: string },
        fallback,
      ),
    );
  }
  throw err;
}

function ensureApiBase(): void {
  const base = import.meta.env.VITE_RUTAFY_API_BASE;
  if (typeof base !== "string" || !base.trim()) {
    throw new Error("VITE_RUTAFY_API_BASE no está configurado");
  }
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toOptionalString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function pick<T>(
  rec: Record<string, unknown>,
  snake: string,
  read: (value: unknown) => T | null,
): T | null {
  const camel = snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return read(rec[snake] ?? rec[camel]);
}

function pickCaptureQualityFromSession(rec: Record<string, unknown>): string | null {
  const fromRoot = pick(rec, "capture_quality", toOptionalString);
  if (fromRoot) return fromRoot;

  const statsRaw = rec.stats ?? rec.Stats;
  if (statsRaw && typeof statsRaw === "object" && !Array.isArray(statsRaw)) {
    return pick(statsRaw as Record<string, unknown>, "capture_quality", toOptionalString);
  }

  return null;
}

function normalizeSession(raw: unknown): AdminTrackingSession | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const sessionId =
    pick(rec, "session_id", toOptionalString) ?? pick(rec, "id", toOptionalString);
  if (!sessionId) return null;

  const pointsCount =
    pick(rec, "points_count", toFiniteNumber) ??
    pick(rec, "point_count", toFiniteNumber);

  const durationSeconds = pick(rec, "duration_seconds", toFiniteNumber);
  const durationMinutes =
    pick(rec, "duration_minutes", toFiniteNumber) ??
    (durationSeconds != null ? durationSeconds / 60 : null);

  const avgSpeedMps = pick(rec, "avg_speed_mps", toFiniteNumber);
  const avgSpeedKmh =
    pick(rec, "avg_speed_kmh", toFiniteNumber) ??
    (avgSpeedMps != null ? avgSpeedMps * 3.6 : null);

  const lastCapturedAt =
    pick(rec, "last_captured_at", toOptionalString) ??
    pick(rec, "last_heartbeat_at", toOptionalString);

  return {
    session_id: sessionId,
    id: sessionId,
    owner_user_id: pick(rec, "owner_user_id", toOptionalString),
    actor_id: pick(rec, "actor_id", toOptionalString),
    actor_type: pick(rec, "actor_type", toOptionalString),
    vehicle_id: pick(rec, "vehicle_id", toOptionalString),
    vehicle_label: pick(rec, "vehicle_label", toOptionalString),
    purpose: pick(rec, "purpose", toOptionalString),
    status: pick(rec, "status", toOptionalString),
    started_at: pick(rec, "started_at", toOptionalString),
    ended_at: pick(rec, "ended_at", toOptionalString),
    last_heartbeat_at: pick(rec, "last_heartbeat_at", toOptionalString),
    last_captured_at: lastCapturedAt,
    consent_at: pick(rec, "consent_at", toOptionalString),
    point_count: pointsCount,
    points_count: pointsCount,
    duration_seconds: durationSeconds,
    duration_minutes: durationMinutes,
    avg_accuracy_m: pick(rec, "avg_accuracy_m", toFiniteNumber),
    avg_speed_kmh: avgSpeedKmh,
    avg_speed_mps: avgSpeedMps,
    capture_quality: pickCaptureQualityFromSession(rec),
  };
}

function normalizeCloseResult(raw: unknown): AdminTrackingSessionCloseResult | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const sessionRaw = rec.session;
  if (!sessionRaw || typeof sessionRaw !== "object") return null;
  const s = sessionRaw as Record<string, unknown>;
  const session_id =
    pick(s, "session_id", toOptionalString) ?? pick(s, "id", toOptionalString);
  const status = pick(s, "status", toOptionalString);
  if (!session_id || !status) return null;
  return {
    ok: rec.ok === true || rec.ok === undefined,
    session: {
      session_id,
      status,
      ended_at: pick(s, "ended_at", toOptionalString),
    },
    trace_id: toOptionalString(rec.trace_id) ?? undefined,
  };
}

function normalizeStats(raw: unknown): AdminTrackingSessionStats {
  if (!raw || typeof raw !== "object") return {};
  const rec = raw as Record<string, unknown>;
  return {
    point_count: pick(rec, "point_count", toFiniteNumber),
    duration_seconds: pick(rec, "duration_seconds", toFiniteNumber),
    avg_accuracy_m: pick(rec, "avg_accuracy_m", toFiniteNumber),
    avg_speed_mps: pick(rec, "avg_speed_mps", toFiniteNumber),
    pct_accuracy_over_50m: pick(rec, "pct_accuracy_over_50m", toFiniteNumber),
    gap_count_over_60s: pick(rec, "gap_count_over_60s", toFiniteNumber),
    max_gap_seconds: pick(rec, "max_gap_seconds", toFiniteNumber),
    covered_seconds: pick(rec, "covered_seconds", toFiniteNumber),
    coverage_pct: pick(rec, "coverage_pct", toFiniteNumber),
    capture_quality: pick(rec, "capture_quality", toOptionalString),
  };
}

function normalizeSessionList(raw: unknown): AdminTrackingSession[] {
  if (!Array.isArray(raw)) return [];
  const out: AdminTrackingSession[] = [];
  for (const item of raw) {
    const normalized = normalizeSession(item);
    if (normalized) out.push(normalized);
  }
  return out;
}

export async function listAdminTrackingSessions(
  options?: ListAdminTrackingSessionsOptions,
): Promise<ListAdminTrackingSessionsResult> {
  ensureApiBase();
  const limit = options?.limit ?? 50;
  const params: Record<string, string | number> = { limit };
  const status = options?.status?.trim();
  if (status) params.status = status;

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      "/v1/admin/tracking-sessions",
      { params },
    );
    const sessions = normalizeSessionList(data.sessions ?? data.items);
    return {
      trace_id: toOptionalString(data.trace_id) ?? undefined,
      limit: toFiniteNumber(data.limit) ?? limit,
      sessions,
    };
  } catch (err) {
    parseAdminTrackingError(err, `Error al cargar sesiones de tracking`);
  }
}

export type TrackingRoutePoint = {
  lat: number;
  lng: number;
  captured_at: string;
  accuracy_m?: number | null;
  speed_mps?: number | null;
  heading?: number | null;
  app_state?: string | null;
};

export type TrackingRouteSegment = {
  segment_index: number;
  point_count: number;
  started_at: string;
  ended_at: string;
  gap_before_seconds: number | null;
  distance_m: number;
  distance_km: number;
  points: TrackingRoutePoint[];
};

export type TrackingRouteMeta = {
  schema_version: number;
  source: string;
  generated_at: string;
  gap_split_seconds: number;
  detail: string;
  point_count: number;
  returned_points: number;
  excluded_points: number;
  segment_count: number;
  truncated: boolean;
  truncation_reason?: string;
  filters_applied: {
    max_accuracy_m: number | null;
    include_unknown_accuracy: boolean;
  };
};

export type TrackingRouteQuality = {
  capture_quality: string;
  coverage_pct: number;
  covered_seconds: number;
  gap_count_over_60s: number;
  max_gap_seconds: number | null;
};

export type TrackingRouteSummary = {
  distance_m: number;
  distance_km: number;
};

export type TrackingRouteBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type AdminTrackingSessionRoute = {
  trace_id: string;
  session_id: string;
  route_meta: TrackingRouteMeta;
  quality: TrackingRouteQuality;
  summary: TrackingRouteSummary;
  bounds: TrackingRouteBounds | null;
  start_point: TrackingRoutePoint | null;
  end_point: TrackingRoutePoint | null;
  segments: TrackingRouteSegment[];
  overlays: unknown[];
};

function normalizeRoutePoint(raw: unknown): TrackingRoutePoint | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const lat = pick(rec, "lat", toFiniteNumber);
  const lng = pick(rec, "lng", toFiniteNumber);
  const captured_at = pick(rec, "captured_at", toOptionalString);
  if (lat == null || lng == null || !captured_at) return null;
  return {
    lat,
    lng,
    captured_at,
    accuracy_m: pick(rec, "accuracy_m", toFiniteNumber),
    speed_mps: pick(rec, "speed_mps", toFiniteNumber),
    heading: pick(rec, "heading", toFiniteNumber),
    app_state: pick(rec, "app_state", toOptionalString),
  };
}

function normalizeRoutePoints(raw: unknown): TrackingRoutePoint[] {
  if (!Array.isArray(raw)) return [];
  const out: TrackingRoutePoint[] = [];
  for (const item of raw) {
    const point = normalizeRoutePoint(item);
    if (point) out.push(point);
  }
  return out;
}

function normalizeRouteSegment(raw: unknown): TrackingRouteSegment | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const segment_index =
    pick(rec, "segment_index", toFiniteNumber) ??
    pick(rec, "index", toFiniteNumber);
  const started_at = pick(rec, "started_at", toOptionalString);
  const ended_at = pick(rec, "ended_at", toOptionalString);
  if (segment_index == null || !started_at || !ended_at) return null;

  return {
    segment_index,
    point_count: pick(rec, "point_count", toFiniteNumber) ?? 0,
    started_at,
    ended_at,
    gap_before_seconds: pick(rec, "gap_before_seconds", toFiniteNumber),
    distance_m: pick(rec, "distance_m", toFiniteNumber) ?? 0,
    distance_km: pick(rec, "distance_km", toFiniteNumber) ?? 0,
    points: normalizeRoutePoints(rec.points),
  };
}

function normalizeRouteBounds(raw: unknown): TrackingRouteBounds | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const north = pick(rec, "north", toFiniteNumber);
  const south = pick(rec, "south", toFiniteNumber);
  const east = pick(rec, "east", toFiniteNumber);
  const west = pick(rec, "west", toFiniteNumber);
  if (north == null || south == null || east == null || west == null) return null;
  return { north, south, east, west };
}

function normalizeRouteMeta(raw: unknown): TrackingRouteMeta {
  const defaults: TrackingRouteMeta = {
    schema_version: 1,
    source: "",
    generated_at: "",
    gap_split_seconds: 60,
    detail: "",
    point_count: 0,
    returned_points: 0,
    excluded_points: 0,
    segment_count: 0,
    truncated: false,
    filters_applied: {
      max_accuracy_m: null,
      include_unknown_accuracy: true,
    },
  };
  if (!raw || typeof raw !== "object") return defaults;
  const rec = raw as Record<string, unknown>;
  const filtersRaw =
    rec.filters_applied && typeof rec.filters_applied === "object"
      ? (rec.filters_applied as Record<string, unknown>)
      : null;

  return {
    schema_version: pick(rec, "schema_version", toFiniteNumber) ?? defaults.schema_version,
    source: pick(rec, "source", toOptionalString) ?? defaults.source,
    generated_at: pick(rec, "generated_at", toOptionalString) ?? defaults.generated_at,
    gap_split_seconds:
      pick(rec, "gap_split_seconds", toFiniteNumber) ?? defaults.gap_split_seconds,
    detail: pick(rec, "detail", toOptionalString) ?? defaults.detail,
    point_count: pick(rec, "point_count", toFiniteNumber) ?? defaults.point_count,
    returned_points:
      pick(rec, "returned_points", toFiniteNumber) ?? defaults.returned_points,
    excluded_points:
      pick(rec, "excluded_points", toFiniteNumber) ?? defaults.excluded_points,
    segment_count: pick(rec, "segment_count", toFiniteNumber) ?? defaults.segment_count,
    truncated: Boolean(rec.truncated),
    truncation_reason: pick(rec, "truncation_reason", toOptionalString) ?? undefined,
    filters_applied: {
      max_accuracy_m: filtersRaw
        ? pick(filtersRaw, "max_accuracy_m", toFiniteNumber)
        : null,
      include_unknown_accuracy: filtersRaw
        ? Boolean(filtersRaw.include_unknown_accuracy ?? filtersRaw.includeUnknownAccuracy)
        : true,
    },
  };
}

function normalizeRouteQuality(raw: unknown): TrackingRouteQuality {
  const defaults: TrackingRouteQuality = {
    capture_quality: "",
    coverage_pct: 0,
    covered_seconds: 0,
    gap_count_over_60s: 0,
    max_gap_seconds: null,
  };
  if (!raw || typeof raw !== "object") return defaults;
  const rec = raw as Record<string, unknown>;
  return {
    capture_quality: pick(rec, "capture_quality", toOptionalString) ?? defaults.capture_quality,
    coverage_pct: pick(rec, "coverage_pct", toFiniteNumber) ?? defaults.coverage_pct,
    covered_seconds: pick(rec, "covered_seconds", toFiniteNumber) ?? defaults.covered_seconds,
    gap_count_over_60s:
      pick(rec, "gap_count_over_60s", toFiniteNumber) ?? defaults.gap_count_over_60s,
    max_gap_seconds: pick(rec, "max_gap_seconds", toFiniteNumber),
  };
}

function normalizeRouteSummary(raw: unknown): TrackingRouteSummary {
  const defaults: TrackingRouteSummary = { distance_m: 0, distance_km: 0 };
  if (!raw || typeof raw !== "object") return defaults;
  const rec = raw as Record<string, unknown>;
  return {
    distance_m: pick(rec, "distance_m", toFiniteNumber) ?? defaults.distance_m,
    distance_km: pick(rec, "distance_km", toFiniteNumber) ?? defaults.distance_km,
  };
}

function normalizeAdminTrackingSessionRoute(raw: unknown): AdminTrackingSessionRoute | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const session_id =
    pick(rec, "session_id", toOptionalString) ?? pick(rec, "sessionId", toOptionalString);
  if (!session_id) return null;

  const segmentsRaw = rec.segments;
  const segments: TrackingRouteSegment[] = [];
  if (Array.isArray(segmentsRaw)) {
    for (const item of segmentsRaw) {
      const seg = normalizeRouteSegment(item);
      if (seg) segments.push(seg);
    }
  }

  return {
    trace_id: pick(rec, "trace_id", toOptionalString) ?? "",
    session_id,
    route_meta: normalizeRouteMeta(rec.route_meta ?? rec.routeMeta),
    quality: normalizeRouteQuality(rec.quality),
    summary: normalizeRouteSummary(rec.summary),
    bounds: normalizeRouteBounds(rec.bounds),
    start_point: normalizeRoutePoint(rec.start_point ?? rec.startPoint),
    end_point: normalizeRoutePoint(rec.end_point ?? rec.endPoint),
    segments,
    overlays: Array.isArray(rec.overlays) ? rec.overlays : [],
  };
}

export async function getAdminTrackingSessionRoute(
  sessionId: string,
): Promise<AdminTrackingSessionRoute> {
  ensureApiBase();
  const id = sessionId.trim();
  if (!id) {
    throw new Error("session_id inválido");
  }

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      `/v1/admin/tracking-sessions/${encodeURIComponent(id)}/route`,
    );
    const route = normalizeAdminTrackingSessionRoute(data);
    if (!route) {
      throw new Error("Respuesta de ruta inválida");
    }
    return route;
  } catch (err) {
    parseAdminTrackingError(err, "Error al cargar ruta GPS");
  }
}

export async function getAdminTrackingSessionDetail(
  sessionId: string,
): Promise<AdminTrackingSessionDetail> {
  ensureApiBase();
  const id = sessionId.trim();
  if (!id) {
    throw new Error("session_id inválido");
  }

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      `/v1/admin/tracking-sessions/${encodeURIComponent(id)}`,
    );

    const sessionRaw =
      data.session && typeof data.session === "object"
        ? data.session
        : data;
    const session = normalizeSession(sessionRaw);
    if (!session) {
      throw new Error("Respuesta de sesión inválida");
    }

    const statsRaw =
      data.stats && typeof data.stats === "object" ? data.stats : null;

    return {
      trace_id: toOptionalString(data.trace_id) ?? undefined,
      session,
      stats: normalizeStats(statsRaw),
    };
  } catch (err) {
    parseAdminTrackingError(err, "Error al cargar detalle de sesión");
  }
}

export async function getAdminTrackingSessionPoints(
  sessionId: string,
  limit = 20,
): Promise<AdminTrackingSessionPointsResult> {
  ensureApiBase();
  const id = sessionId.trim();
  if (!id) {
    throw new Error("session_id inválido");
  }

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      `/v1/admin/tracking-sessions/${encodeURIComponent(id)}/points`,
      { params: { limit } },
    );

    const session_id =
      pick(data, "session_id", toOptionalString) ??
      pick(data, "sessionId", toOptionalString) ??
      id;

    const pointsRaw = data.points ?? data.items;
    const points = normalizeRoutePoints(pointsRaw);

    return {
      trace_id: toOptionalString(data.trace_id) ?? undefined,
      session_id,
      points,
      limit: toFiniteNumber(data.limit) ?? limit,
      total: pick(data, "total", toFiniteNumber) ?? pick(data, "point_count", toFiniteNumber),
    };
  } catch (err) {
    parseAdminTrackingError(err, "Error al cargar puntos GPS");
  }
}

async function postAdminTrackingSessionAction(
  sessionId: string,
  action: "end" | "cancel",
): Promise<AdminTrackingSessionCloseResult> {
  ensureApiBase();
  const id = sessionId.trim();
  if (!id) {
    throw new Error("session_id inválido");
  }

  try {
    const { data } = await adminHttp.post<Record<string, unknown>>(
      `/v1/admin/tracking-sessions/${encodeURIComponent(id)}/${action}`,
      {},
    );
    const result = normalizeCloseResult(data);
    if (!result) {
      throw new Error("Respuesta de cierre inválida");
    }
    return result;
  } catch (err) {
    parseAdminTrackingError(
      err,
      action === "end" ? "Error al finalizar la captura" : "Error al cancelar la captura",
    );
  }
}

export function endAdminTrackingSession(
  sessionId: string,
): Promise<AdminTrackingSessionCloseResult> {
  return postAdminTrackingSessionAction(sessionId, "end");
}

export function cancelAdminTrackingSession(
  sessionId: string,
): Promise<AdminTrackingSessionCloseResult> {
  return postAdminTrackingSessionAction(sessionId, "cancel");
}
