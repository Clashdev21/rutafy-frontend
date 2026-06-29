import { adminHttp, parseAdminApiError } from "@/api/adminHttp";
import axios from "axios";

export type OperationalControlCounts = {
  scheduled: number;
  waiting_gps: number;
  waiting_movement: number;
  active: number;
  completed: number;
  manual_review: number;
  alerts: number;
  critical: number;
};

export type OperationalControlKpis = {
  auto_match_pct: number | null;
  gps_online_pct: number | null;
  compliance_pct: number | null;
  delays_pct: number | null;
  no_signal_pct: number | null;
};

export type OperationalControlContainerRow = {
  container_id: string;
  monitoring_id?: string | null;
  container_label?: string | null;
  client_name?: string | null;
  program_name?: string | null;
  driver_name?: string | null;
  plate?: string | null;
  declared_port?: string | null;
  destination?: string | null;
  phase?: string | null;
  rutafy_status?: string | null;
  driver_assignment_state?: string | null;
  gps_status?: string | null;
  gps_last_seen_at?: string | null;
  scheduled_at?: string | null;
  last_updated_at?: string | null;
  history_count?: number | null;
  sort_priority?: string | null;
  alerts: string[];
};

export type OperationalControlLifecycleStep = {
  key: string;
  label: string;
  completed?: boolean;
  current?: boolean;
};

export type OperationalControlMapPoint = {
  lat: number;
  lng: number;
  label?: string | null;
};

export type OperationalControlMapData = {
  driver?: OperationalControlMapPoint | null;
  declared_port?: OperationalControlMapPoint | null;
  confirmed_port?: OperationalControlMapPoint | null;
  destination?: OperationalControlMapPoint | null;
  polyline: OperationalControlMapPoint[];
};

export type OperationalControlDeclaredTruth = {
  declared_port?: string | null;
  scheduled_time?: string | null;
  declared_destination?: string | null;
  original_email?: string | null;
};

export type OperationalControlObservedTruth = {
  confirmed_port?: string | null;
  actual_entry_at?: string | null;
  actual_exit_at?: string | null;
  eta_at?: string | null;
  compliance?: string | null;
  delay_minutes?: number | null;
  delay_label?: string | null;
};

export type OperationalControlDriverInfo = {
  name?: string | null;
  plate?: string | null;
  assignment_state?: string | null;
  phone?: string | null;
};

export type OperationalControlTimelineEvent = {
  at?: string | null;
  title: string;
  detail?: string | null;
};

export type OperationalControlHistoryEvent = {
  at?: string | null;
  title: string;
  status?: string | null;
};

export type OperationalControlContainerDetail = {
  container_id: string;
  monitoring_id?: string | null;
  container_label?: string | null;
  client_name?: string | null;
  program_name?: string | null;
  rutafy_status?: string | null;
  phase?: string | null;
  history_count?: number | null;
  driver: OperationalControlDriverInfo;
  gps_status?: string | null;
  gps_last_seen_at?: string | null;
  lifecycle: OperationalControlLifecycleStep[];
  declared_truth: OperationalControlDeclaredTruth;
  observed_truth: OperationalControlObservedTruth;
  map: OperationalControlMapData;
  timeline: OperationalControlTimelineEvent[];
  history: OperationalControlHistoryEvent[];
};

export type OperationalControlListResult = {
  trace_id?: string;
  counts: OperationalControlCounts;
  kpis: OperationalControlKpis;
  containers: OperationalControlContainerRow[];
  filter_options?: OperationalControlFilterOptions;
};

export type OperationalControlFilterOptions = {
  clients: string[];
  programs: string[];
  statuses: string[];
  ports: string[];
  drivers: string[];
  plates: string[];
};

export type OperationalControlListParams = {
  client?: string;
  program?: string;
  status?: string;
  port?: string;
  driver?: string;
  plate?: string;
  container?: string;
  date?: string;
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

function normalizeCounts(raw: unknown): OperationalControlCounts {
  const defaults: OperationalControlCounts = {
    scheduled: 0,
    waiting_gps: 0,
    waiting_movement: 0,
    active: 0,
    completed: 0,
    manual_review: 0,
    alerts: 0,
    critical: 0,
  };
  const rec = asRecord(raw);
  if (!rec) return defaults;
  return {
    scheduled:
      pick(rec, "scheduled", toFiniteNumber) ??
      pick(rec, "programados", toFiniteNumber) ??
      defaults.scheduled,
    waiting_gps:
      pick(rec, "waiting_gps", toFiniteNumber) ??
      pick(rec, "esperando_gps", toFiniteNumber) ??
      defaults.waiting_gps,
    waiting_movement:
      pick(rec, "waiting_movement", toFiniteNumber) ??
      pick(rec, "esperando_movimiento", toFiniteNumber) ??
      defaults.waiting_movement,
    active: pick(rec, "active", toFiniteNumber) ?? pick(rec, "activos", toFiniteNumber) ?? defaults.active,
    completed:
      pick(rec, "completed", toFiniteNumber) ??
      pick(rec, "finalizados", toFiniteNumber) ??
      defaults.completed,
    manual_review:
      pick(rec, "manual_review", toFiniteNumber) ??
      pick(rec, "manual_review_count", toFiniteNumber) ??
      defaults.manual_review,
    alerts: pick(rec, "alerts", toFiniteNumber) ?? defaults.alerts,
    critical: pick(rec, "critical", toFiniteNumber) ?? pick(rec, "criticos", toFiniteNumber) ?? defaults.critical,
  };
}

function normalizeKpis(raw: unknown): OperationalControlKpis {
  const rec = asRecord(raw);
  if (!rec) {
    return {
      auto_match_pct: null,
      gps_online_pct: null,
      compliance_pct: null,
      delays_pct: null,
      no_signal_pct: null,
    };
  }
  return {
    auto_match_pct: pick(rec, "auto_match_pct", toFiniteNumber),
    gps_online_pct: pick(rec, "gps_online_pct", toFiniteNumber),
    compliance_pct: pick(rec, "compliance_pct", toFiniteNumber),
    delays_pct: pick(rec, "delays_pct", toFiniteNumber),
    no_signal_pct: pick(rec, "no_signal_pct", toFiniteNumber),
  };
}

function normalizeContainerRow(raw: unknown): OperationalControlContainerRow | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const container_id =
    pick(rec, "container_id", toOptionalString) ?? pick(rec, "id", toOptionalString);
  if (!container_id) return null;

  return {
    container_id,
    monitoring_id: pick(rec, "monitoring_id", toOptionalString),
    container_label:
      pick(rec, "container_label", toOptionalString) ??
      pick(rec, "container", toOptionalString) ??
      pick(rec, "container_number", toOptionalString),
    client_name:
      pick(rec, "client_name", toOptionalString) ?? pick(rec, "client", toOptionalString),
    program_name:
      pick(rec, "program_name", toOptionalString) ?? pick(rec, "program", toOptionalString),
    driver_name:
      pick(rec, "driver_name", toOptionalString) ?? pick(rec, "driver", toOptionalString),
    plate: pick(rec, "plate", toOptionalString) ?? pick(rec, "placa", toOptionalString),
    declared_port:
      pick(rec, "declared_port", toOptionalString) ?? pick(rec, "port", toOptionalString),
    destination: pick(rec, "destination", toOptionalString) ?? pick(rec, "destino", toOptionalString),
    phase: pick(rec, "phase", toOptionalString),
    rutafy_status:
      pick(rec, "rutafy_status", toOptionalString) ?? pick(rec, "status", toOptionalString),
    driver_assignment_state: pick(rec, "driver_assignment_state", toOptionalString),
    gps_status: pick(rec, "gps_status", toOptionalString),
    gps_last_seen_at: pick(rec, "gps_last_seen_at", toOptionalString),
    scheduled_at: pick(rec, "scheduled_at", toOptionalString),
    last_updated_at: pick(rec, "last_updated_at", toOptionalString),
    history_count: pick(rec, "history_count", toFiniteNumber),
    sort_priority:
      pick(rec, "sort_priority", toOptionalString) ?? pick(rec, "priority_band", toOptionalString),
    alerts: normalizeAlerts(rec.alerts),
  };
}

function normalizeContainerList(raw: unknown): OperationalControlContainerRow[] {
  if (!Array.isArray(raw)) return [];
  const out: OperationalControlContainerRow[] = [];
  for (const item of raw) {
    const row = normalizeContainerRow(item);
    if (row) out.push(row);
  }
  return out;
}

function normalizeMapPoint(raw: unknown): OperationalControlMapPoint | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const lat = pick(rec, "lat", toFiniteNumber);
  const lng = pick(rec, "lng", toFiniteNumber);
  if (lat == null || lng == null) return null;
  return {
    lat,
    lng,
    label: pick(rec, "label", toOptionalString) ?? pick(rec, "name", toOptionalString),
  };
}

function normalizePolyline(raw: unknown): OperationalControlMapPoint[] {
  if (!Array.isArray(raw)) return [];
  const out: OperationalControlMapPoint[] = [];
  for (const item of raw) {
    const point = normalizeMapPoint(item);
    if (point) out.push(point);
  }
  return out;
}

function normalizeMapData(raw: unknown): OperationalControlMapData {
  const rec = asRecord(raw);
  if (!rec) {
    return { polyline: [] };
  }
  return {
    driver: normalizeMapPoint(rec.driver ?? rec.driver_position),
    declared_port: normalizeMapPoint(rec.declared_port ?? rec.port_declared),
    confirmed_port: normalizeMapPoint(rec.confirmed_port ?? rec.port_confirmed),
    destination: normalizeMapPoint(rec.destination ?? rec.destino),
    polyline: normalizePolyline(rec.polyline ?? rec.route ?? rec.path),
  };
}

function normalizeLifecycleSteps(raw: unknown): OperationalControlLifecycleStep[] {
  if (!Array.isArray(raw)) return [];
  const out: OperationalControlLifecycleStep[] = [];
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

function normalizeTimeline(raw: unknown): OperationalControlTimelineEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: OperationalControlTimelineEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const title = pick(rec, "title", toOptionalString) ?? pick(rec, "label", toOptionalString);
    if (!title) continue;
    out.push({
      at: pick(rec, "at", toOptionalString) ?? pick(rec, "occurred_at", toOptionalString),
      title,
      detail: pick(rec, "detail", toOptionalString) ?? pick(rec, "description", toOptionalString),
    });
  }
  return out;
}

function normalizeHistory(raw: unknown): OperationalControlHistoryEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: OperationalControlHistoryEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const title = pick(rec, "title", toOptionalString) ?? pick(rec, "label", toOptionalString);
    if (!title) continue;
    out.push({
      at: pick(rec, "at", toOptionalString) ?? pick(rec, "occurred_at", toOptionalString),
      title,
      status: pick(rec, "status", toOptionalString),
    });
  }
  return out;
}

function normalizeDeclaredTruth(raw: unknown): OperationalControlDeclaredTruth {
  const rec = asRecord(raw);
  if (!rec) return {};
  return {
    declared_port: pick(rec, "declared_port", toOptionalString),
    scheduled_time:
      pick(rec, "scheduled_time", toOptionalString) ?? pick(rec, "scheduled_at", toOptionalString),
    declared_destination: pick(rec, "declared_destination", toOptionalString),
    original_email: pick(rec, "original_email", toOptionalString),
  };
}

function normalizeObservedTruth(raw: unknown): OperationalControlObservedTruth {
  const rec = asRecord(raw);
  if (!rec) return {};
  return {
    confirmed_port: pick(rec, "confirmed_port", toOptionalString),
    actual_entry_at: pick(rec, "actual_entry_at", toOptionalString) ?? pick(rec, "entry_at", toOptionalString),
    actual_exit_at: pick(rec, "actual_exit_at", toOptionalString) ?? pick(rec, "exit_at", toOptionalString),
    eta_at: pick(rec, "eta_at", toOptionalString) ?? pick(rec, "eta", toOptionalString),
    compliance: pick(rec, "compliance", toOptionalString),
    delay_minutes: pick(rec, "delay_minutes", toFiniteNumber),
    delay_label: pick(rec, "delay_label", toOptionalString) ?? pick(rec, "delay", toOptionalString),
  };
}

function normalizeDriver(raw: unknown): OperationalControlDriverInfo {
  const rec = asRecord(raw);
  if (!rec) return {};
  return {
    name: pick(rec, "name", toOptionalString) ?? pick(rec, "driver_name", toOptionalString),
    plate: pick(rec, "plate", toOptionalString),
    assignment_state: pick(rec, "assignment_state", toOptionalString) ?? pick(rec, "driver_assignment_state", toOptionalString),
    phone: pick(rec, "phone", toOptionalString),
  };
}

function normalizeContainerDetail(raw: unknown): OperationalControlContainerDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const root = asRecord(rec.container ?? rec.Container) ?? rec;

  const container_id =
    pick(root, "container_id", toOptionalString) ?? pick(root, "id", toOptionalString);
  if (!container_id) return null;

  const lifecycleRaw = root.lifecycle ?? rec.lifecycle;
  const lifecycleRec = asRecord(lifecycleRaw);
  const lifecycleSteps = normalizeLifecycleSteps(
    lifecycleRec?.steps ?? lifecycleRaw,
  );

  return {
    container_id,
    monitoring_id:
      pick(root, "monitoring_id", toOptionalString) ?? pick(rec, "monitoring_id", toOptionalString),
    container_label:
      pick(root, "container_label", toOptionalString) ??
      pick(root, "container", toOptionalString),
    client_name: pick(root, "client_name", toOptionalString),
    program_name: pick(root, "program_name", toOptionalString),
    rutafy_status: pick(root, "rutafy_status", toOptionalString),
    phase: pick(root, "phase", toOptionalString),
    history_count: pick(root, "history_count", toFiniteNumber),
    driver: normalizeDriver(root.driver ?? rec.driver),
    gps_status: pick(root, "gps_status", toOptionalString),
    gps_last_seen_at: pick(root, "gps_last_seen_at", toOptionalString),
    lifecycle: lifecycleSteps,
    declared_truth: normalizeDeclaredTruth(root.declared_truth ?? rec.declared_truth),
    observed_truth: normalizeObservedTruth(root.observed_truth ?? rec.observed_truth),
    map: normalizeMapData(root.map ?? rec.map),
    timeline: normalizeTimeline(root.timeline ?? rec.timeline),
    history: normalizeHistory(root.history ?? rec.history),
  };
}

function normalizeFilterOptions(raw: unknown): OperationalControlFilterOptions | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  return {
    clients: normalizeStringList(rec.clients),
    programs: normalizeStringList(rec.programs),
    statuses: normalizeStringList(rec.statuses ?? rec.rutafy_statuses),
    ports: normalizeStringList(rec.ports),
    drivers: normalizeStringList(rec.drivers),
    plates: normalizeStringList(rec.plates),
  };
}

function extractContainerList(data: Record<string, unknown>): OperationalControlContainerRow[] {
  const candidates = [data.containers, data.items, data.rows];
  for (const c of candidates) {
    const list = normalizeContainerList(c);
    if (list.length > 0) return list;
  }
  return normalizeContainerList(data.containers);
}

export async function getOperationalControlList(
  params?: OperationalControlListParams,
): Promise<OperationalControlListResult> {
  ensureApiBase();
  const query: Record<string, string> = {};
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      const v = value?.trim();
      if (v && v.toLowerCase() !== "all") query[key] = v;
    }
  }

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      "/v1/admin/operational-control",
      { params: query },
    );

    const counts = normalizeCounts(data.counts ?? data.summary ?? data.cards);
    const kpis = normalizeKpis(data.kpis ?? data.metrics);
    const containers = extractContainerList(data);

    return {
      trace_id: toOptionalString(data.trace_id) ?? undefined,
      counts,
      kpis,
      containers,
      filter_options: normalizeFilterOptions(data.filter_options ?? data.filters),
    };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar centro operacional (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}

export async function getOperationalControlContainerDetail(
  containerId: string,
): Promise<OperationalControlContainerDetail> {
  ensureApiBase();
  const id = containerId.trim();
  if (!id) throw new Error("container_id inválido");

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      `/v1/admin/operational-control/containers/${encodeURIComponent(id)}`,
    );
    const detail = normalizeContainerDetail(data);
    if (!detail) throw new Error("Respuesta de contenedor inválida");
    return detail;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar detalle del contenedor (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}

export async function getOperationalControlMonitoringDetail(
  monitoringId: string,
): Promise<OperationalControlContainerDetail> {
  ensureApiBase();
  const id = monitoringId.trim();
  if (!id) throw new Error("monitoring_id inválido");

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      `/v1/admin/operational-control/monitorings/${encodeURIComponent(id)}`,
    );
    const detail = normalizeContainerDetail(data);
    if (!detail) throw new Error("Respuesta de monitoreo inválida");
    return detail;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar monitoreo (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}
