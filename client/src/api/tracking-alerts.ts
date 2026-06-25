import { adminHttp, parseAdminApiError } from "@/api/adminHttp";
import axios from "axios";

export type AdminTrackingAlert = {
  id: string;
  detected_at?: string | null;
  severity?: string | null;
  alert_type?: string | null;
  session_id: string;
  purpose?: string | null;
  vehicle_label?: string | null;
  coverage_pct?: number | null;
  capture_quality?: string | null;
  max_gap_seconds?: number | null;
  message?: string | null;
};

export type ListAdminTrackingAlertsOptions = {
  limit?: number;
  severity?: string;
  alert_type?: string;
  since?: string;
};

export type ListAdminTrackingAlertsResult = {
  trace_id?: string;
  limit: number;
  items: AdminTrackingAlert[];
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeTrackingAlert(raw: unknown): AdminTrackingAlert | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;

  const session = asRecord(rec.session ?? rec.Session);
  const stats = asRecord(rec.stats ?? rec.Stats);

  const id =
    pick(rec, "id", toOptionalString) ??
    pick(rec, "alert_id", toOptionalString);
  const session_id =
    pick(rec, "session_id", toOptionalString) ??
    (session ? pick(session, "id", toOptionalString) : null);

  if (!id || !session_id) return null;

  return {
    id,
    session_id,
    detected_at:
      pick(rec, "detected_at", toOptionalString) ??
      pick(rec, "created_at", toOptionalString),
    severity: pick(rec, "severity", toOptionalString),
    alert_type: pick(rec, "alert_type", toOptionalString),
    purpose:
      pick(rec, "purpose", toOptionalString) ??
      (session ? pick(session, "purpose", toOptionalString) : null),
    vehicle_label:
      pick(rec, "vehicle_label", toOptionalString) ??
      (session ? pick(session, "vehicle_label", toOptionalString) : null),
    coverage_pct:
      pick(rec, "coverage_pct", toFiniteNumber) ??
      (stats ? pick(stats, "coverage_pct", toFiniteNumber) : null),
    capture_quality:
      pick(rec, "capture_quality", toOptionalString) ??
      (stats ? pick(stats, "capture_quality", toOptionalString) : null),
    max_gap_seconds:
      pick(rec, "max_gap_seconds", toFiniteNumber) ??
      (stats ? pick(stats, "max_gap_seconds", toFiniteNumber) : null),
    message: pick(rec, "message", toOptionalString),
  };
}

function normalizeTrackingAlertList(raw: unknown): AdminTrackingAlert[] {
  if (!Array.isArray(raw)) return [];
  const out: AdminTrackingAlert[] = [];
  for (const item of raw) {
    const normalized = normalizeTrackingAlert(item);
    if (normalized) out.push(normalized);
  }
  return out;
}

function extractAlertListPayload(data: Record<string, unknown>): unknown[] {
  if (Array.isArray(data)) return data;
  const candidates = [data.items, data.alerts, data.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function buildListResult(
  data: Record<string, unknown>,
  list: AdminTrackingAlert[],
  defaultLimit: number,
): ListAdminTrackingAlertsResult {
  return {
    trace_id: toOptionalString(data.trace_id) ?? undefined,
    limit: toFiniteNumber(data.limit) ?? defaultLimit,
    items: list,
  };
}

export async function listAdminTrackingAlerts(
  options?: ListAdminTrackingAlertsOptions,
): Promise<ListAdminTrackingAlertsResult> {
  ensureApiBase();
  const limit = options?.limit ?? 50;
  const params: Record<string, string | number> = { limit };

  const severity = options?.severity?.trim();
  const alertType = options?.alert_type?.trim();
  const since = options?.since?.trim();

  if (severity && severity.toLowerCase() !== "all") {
    params.severity = severity;
  }
  if (alertType && alertType.toLowerCase() !== "all") {
    params.alert_type = alertType;
  }
  if (since) {
    params.since = since;
  }

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      "/v1/admin/tracking-alerts",
      { params },
    );
    const listRaw = extractAlertListPayload(data);
    const items = normalizeTrackingAlertList(listRaw);
    return buildListResult(data, items, limit);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar alertas de calidad GPS (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}

export async function listAdminTrackingSessionAlerts(
  sessionId: string,
  options?: Pick<ListAdminTrackingAlertsOptions, "limit">,
): Promise<ListAdminTrackingAlertsResult> {
  ensureApiBase();
  const id = sessionId.trim();
  if (!id) throw new Error("session_id inválido");

  const limit = options?.limit ?? 50;

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      `/v1/admin/tracking-sessions/${encodeURIComponent(id)}/alerts`,
      { params: { limit } },
    );
    const listRaw = extractAlertListPayload(data);
    const items = normalizeTrackingAlertList(listRaw);
    return buildListResult(data, items, limit);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar alertas de la sesión (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}
