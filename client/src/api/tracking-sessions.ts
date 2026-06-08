import { adminHttp, parseAdminApiError } from "@/api/adminHttp";
import axios from "axios";

export type AdminTrackingSession = {
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
  consent_at?: string | null;
  point_count?: number | null;
  duration_seconds?: number | null;
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
  const id = pick(rec, "id", toOptionalString);
  if (!id) return null;

  return {
    id,
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
    consent_at: pick(rec, "consent_at", toOptionalString),
    point_count: pick(rec, "point_count", toFiniteNumber),
    duration_seconds: pick(rec, "duration_seconds", toFiniteNumber),
    capture_quality: pickCaptureQualityFromSession(rec),
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
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar sesiones de tracking (${err.response.status})`,
        ),
      );
    }
    throw err;
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
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar detalle de sesión (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}
