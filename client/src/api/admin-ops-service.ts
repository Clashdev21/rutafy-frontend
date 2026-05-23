export type OpsServiceNode = {
  node_id?: string | null;
  code?: string | null;
  name?: string | null;
};

export type OpsServiceLocation = {
  label?: string | null;
  sub_location?: string | null;
  lat?: number | null;
  lng?: number | null;
  node?: OpsServiceNode | null;
};

export type OpsServiceSla = {
  estimated_route_distance_km?: number | null;
  estimated_route_duration_minutes?: number | null;
  eta_pickup_at?: string | null;
  eta_delivery_at?: string | null;
  sla_pickup_deadline_at?: string | null;
  sla_delivery_deadline_at?: string | null;
};

export type OpsServiceCompany = {
  company_id?: string | null;
  name?: string | null;
  phone?: string | null;
};

export type OpsServiceMessenger = {
  messenger_id?: string | null;
  full_name?: string | null;
  phone?: string | null;
  plate?: string | null;
  vehicle_type?: string | null;
  availability_status?: string | null;
  map_lat?: number | null;
  map_lng?: number | null;
  is_online?: boolean | null;
};

export type OpsServiceOperationalFlags = {
  stuck_level?: string | number | null;
  age_min?: number | null;
  idle_min?: number | null;
  sla_pickup_breach?: boolean | null;
  sla_delivery_breach?: boolean | null;
  open_alerts?: number | null;
};

export type OpsServiceTimelineEvent = {
  history_id?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  actor_role?: string | null;
  actor_id?: string | null;
  note?: string | null;
  trace_id?: string | null;
  created_at?: string | null;
};

export type AdminOpsServiceDetail = {
  service_id: string;
  service_short?: string | null;
  status?: string | null;
  dispatch_status?: string | null;
  request_mode?: string | null;
  scheduled_for?: string | null;
  service_type?: string | null;
  origin?: OpsServiceLocation | null;
  destination?: OpsServiceLocation | null;
  sla?: OpsServiceSla | null;
  company?: OpsServiceCompany | null;
  messenger?: OpsServiceMessenger | null;
  operational_flags?: OpsServiceOperationalFlags | null;
  timeline: OpsServiceTimelineEvent[];
};

type AdminOpsServiceDetailResponse = Record<string, unknown>;

function getApiBase(): string {
  const base = import.meta.env.VITE_RUTAFY_API_BASE;
  if (typeof base === "string" && base.trim()) {
    return base.trim().replace(/\/$/, "");
  }
  return "";
}

function getAdminKey(): string {
  const key = import.meta.env.VITE_RUTAFY_ADMIN_KEY;
  return typeof key === "string" ? key.trim() : "";
}

function ensureAdminConfig(): { apiBase: string; adminKey: string } {
  const apiBase = getApiBase();
  const adminKey = getAdminKey();
  if (!apiBase) {
    throw new Error("VITE_RUTAFY_API_BASE no está configurado");
  }
  if (!adminKey) {
    throw new Error("VITE_RUTAFY_ADMIN_KEY no está configurado");
  }
  return { apiBase, adminKey };
}

function parseErrorMessage(
  data: { error?: string; message?: string } | null,
  fallback: string,
): string {
  return data?.error || data?.message || fallback;
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

function normalizeNode(raw: unknown): OpsServiceNode | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const node_id = pick(rec, "node_id", toOptionalString);
  const code = pick(rec, "code", toOptionalString);
  const name = pick(rec, "name", toOptionalString);
  if (!node_id && !code && !name) return null;
  return { node_id, code, name };
}

function normalizeLocation(raw: unknown): OpsServiceLocation | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const label = pick(rec, "label", toOptionalString);
  const sub_location = pick(rec, "sub_location", toOptionalString);
  const lat = pick(rec, "lat", toFiniteNumber);
  const lng = pick(rec, "lng", toFiniteNumber);
  const node = normalizeNode(rec.node);
  if (!label && !sub_location && lat == null && lng == null && !node) return null;
  return { label, sub_location, lat, lng, node };
}

function normalizeSla(raw: unknown): OpsServiceSla | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  return {
    estimated_route_distance_km: pick(
      rec,
      "estimated_route_distance_km",
      toFiniteNumber,
    ),
    estimated_route_duration_minutes: pick(
      rec,
      "estimated_route_duration_minutes",
      toFiniteNumber,
    ),
    eta_pickup_at: pick(rec, "eta_pickup_at", toOptionalString),
    eta_delivery_at: pick(rec, "eta_delivery_at", toOptionalString),
    sla_pickup_deadline_at: pick(rec, "sla_pickup_deadline_at", toOptionalString),
    sla_delivery_deadline_at: pick(
      rec,
      "sla_delivery_deadline_at",
      toOptionalString,
    ),
  };
}

function normalizeCompany(raw: unknown): OpsServiceCompany | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const company_id = pick(rec, "company_id", toOptionalString);
  const name = pick(rec, "name", toOptionalString);
  const phone = pick(rec, "phone", toOptionalString);
  if (!company_id && !name && !phone) return null;
  return { company_id, name, phone };
}

function normalizeMessenger(raw: unknown): OpsServiceMessenger | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const messenger_id = pick(rec, "messenger_id", toOptionalString);
  const full_name = pick(rec, "full_name", toOptionalString);
  const phone = pick(rec, "phone", toOptionalString);
  const plate = pick(rec, "plate", toOptionalString);
  const vehicle_type = pick(rec, "vehicle_type", toOptionalString);
  const availability_status = pick(rec, "availability_status", toOptionalString);
  const map_lat = pick(rec, "map_lat", toFiniteNumber);
  const map_lng = pick(rec, "map_lng", toFiniteNumber);
  const is_online = pick(rec, "is_online", toOptionalBoolean);
  if (
    !messenger_id &&
    !full_name &&
    !phone &&
    !plate &&
    !vehicle_type &&
    !availability_status &&
    map_lat == null &&
    map_lng == null &&
    is_online == null
  ) {
    return null;
  }
  return {
    messenger_id,
    full_name,
    phone,
    plate,
    vehicle_type,
    availability_status,
    map_lat,
    map_lng,
    is_online,
  };
}

function normalizeOperationalFlags(raw: unknown): OpsServiceOperationalFlags | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const stuckRaw = pick(rec, "stuck_level", (v) => v);
  const stuck_level =
    stuckRaw != null && String(stuckRaw).trim() !== ""
      ? typeof stuckRaw === "number"
        ? stuckRaw
        : String(stuckRaw)
      : null;

  const openAlertsRaw = rec.open_alerts ?? rec.openAlerts;
  let open_alerts: number | null = null;
  if (typeof openAlertsRaw === "number" && Number.isFinite(openAlertsRaw)) {
    open_alerts = openAlertsRaw;
  } else if (Array.isArray(openAlertsRaw)) {
    open_alerts = openAlertsRaw.length;
  }

  return {
    stuck_level,
    age_min: pick(rec, "age_min", toFiniteNumber),
    idle_min: pick(rec, "idle_min", toFiniteNumber),
    sla_pickup_breach: pick(rec, "sla_pickup_breach", toOptionalBoolean),
    sla_delivery_breach: pick(rec, "sla_delivery_breach", toOptionalBoolean),
    open_alerts,
  };
}

function normalizeTimelineEvent(raw: unknown): OpsServiceTimelineEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const history_id = pick(rec, "history_id", toOptionalString);
  const from_status = pick(rec, "from_status", toOptionalString);
  const to_status = pick(rec, "to_status", toOptionalString);
  const actor_role = pick(rec, "actor_role", toOptionalString);
  const actor_id = pick(rec, "actor_id", toOptionalString);
  const note = pick(rec, "note", toOptionalString);
  const trace_id = pick(rec, "trace_id", toOptionalString);
  const created_at = pick(rec, "created_at", toOptionalString);
  if (
    !history_id &&
    !from_status &&
    !to_status &&
    !actor_role &&
    !actor_id &&
    !note &&
    !trace_id &&
    !created_at
  ) {
    return null;
  }
  return {
    history_id,
    from_status,
    to_status,
    actor_role,
    actor_id,
    note,
    trace_id,
    created_at,
  };
}

function normalizeTimeline(raw: unknown): OpsServiceTimelineEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: OpsServiceTimelineEvent[] = [];
  for (const item of raw) {
    const normalized = normalizeTimelineEvent(item);
    if (normalized) out.push(normalized);
  }
  return out;
}

function normalizeServiceDetail(
  raw: AdminOpsServiceDetailResponse,
  serviceId: string,
): AdminOpsServiceDetail {
  const service =
    raw.service && typeof raw.service === "object"
      ? (raw.service as Record<string, unknown>)
      : (raw as Record<string, unknown>);

  const id =
    pick(service, "service_id", toOptionalString) ??
    pick(raw, "service_id", toOptionalString) ??
    serviceId;

  return {
    service_id: id,
    service_short: pick(service, "service_short", toOptionalString),
    status: pick(service, "status", toOptionalString),
    dispatch_status: pick(service, "dispatch_status", toOptionalString),
    request_mode: pick(service, "request_mode", toOptionalString),
    scheduled_for: pick(service, "scheduled_for", toOptionalString),
    service_type: pick(service, "service_type", toOptionalString),
    origin: normalizeLocation(raw.origin),
    destination: normalizeLocation(raw.destination),
    sla: normalizeSla(raw.sla),
    company: normalizeCompany(raw.company),
    messenger: normalizeMessenger(raw.messenger),
    operational_flags: normalizeOperationalFlags(raw.operational_flags),
    timeline: normalizeTimeline(raw.timeline),
  };
}

export async function getAdminOpsServiceDetail(
  serviceId: string,
): Promise<AdminOpsServiceDetail> {
  const { apiBase, adminKey } = ensureAdminConfig();
  const id = serviceId.trim();
  if (!id) {
    throw new Error("service_id inválido");
  }

  const url = `${apiBase}/v1/admin/ops/services/${encodeURIComponent(id)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
  });

  const data = (await response.json()) as AdminOpsServiceDetailResponse & {
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      parseErrorMessage(
        data,
        `Error al cargar detalle del servicio (${response.status})`,
      ),
    );
  }

  return normalizeServiceDetail(data, id);
}
