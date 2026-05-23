import type { OpsServiceLocation } from "@/api/admin-ops-service";

export type OpsMessengerState =
  | "AVAILABLE"
  | "ASSIGNED"
  | "IN_SERVICE"
  | "BUSY_IDLE"
  | "OFFLINE";

export type OpsActiveService = {
  service_id: string;
  status: string;
};

export type OpsMapMessenger = {
  messenger_id: string;
  full_name?: string | null;
  phone?: string | null;
  plate?: string | null;
  ops_state: OpsMessengerState;
  is_online?: boolean;
  active_service?: OpsActiveService | null;
  lat?: number | null;
  lng?: number | null;
};

export type RequestedOpsServiceFlags = {
  age_min?: number | null;
  stuck_level?: string | null;
  sla_pickup_breach?: boolean | null;
};

export type RequestedOpsService = {
  service_id: string;
  service_short?: string | null;
  status?: string | null;
  service_type?: string | null;
  created_at?: string | null;
  requester_company_id?: string | null;
  company_name?: string | null;
  origin?: OpsServiceLocation | null;
  destination?: OpsServiceLocation | null;
  operational_flags?: RequestedOpsServiceFlags | null;
};

export type AdminOpsMapSnapshotResponse = {
  trace_id?: string;
  limit?: number;
  messengers?: OpsMapMessenger[];
  items?: OpsMapMessenger[];
  requested_services?: unknown[];
};

export type AdminOpsMapSnapshot = {
  trace_id?: string;
  limit: number;
  messengers: OpsMapMessenger[];
  requested_services: RequestedOpsService[];
};

export type GetAdminOpsMapSnapshotOptions = {
  limit?: number;
};

const OPS_STATES: OpsMessengerState[] = [
  "AVAILABLE",
  "ASSIGNED",
  "IN_SERVICE",
  "BUSY_IDLE",
  "OFFLINE",
];

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

function pick<T>(
  rec: Record<string, unknown>,
  snake: string,
  read: (value: unknown) => T | null,
): T | null {
  const camel = snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return read(rec[snake] ?? rec[camel]);
}

function normalizeLocation(raw: unknown): OpsServiceLocation | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const label = pick(rec, "label", toOptionalString);
  const sub_location = pick(rec, "sub_location", toOptionalString);
  const lat = pick(rec, "lat", toFiniteNumber);
  const lng = pick(rec, "lng", toFiniteNumber);
  if (!label && !sub_location && lat == null && lng == null) return null;
  return { label, sub_location, lat, lng, node: null };
}

function normalizeRequestedFlags(raw: unknown): RequestedOpsServiceFlags | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const ageMin = pick(rec, "age_min", toFiniteNumber);
  const stuckLevel = pick(rec, "stuck_level", toOptionalString);
  const slaPickupBreach =
    rec.sla_pickup_breach === true ||
    rec.slaPickupBreach === true ||
    rec.sla_pickup_breach === "true"
      ? true
      : rec.sla_pickup_breach === false || rec.slaPickupBreach === false
        ? false
        : null;
  if (ageMin == null && !stuckLevel && slaPickupBreach == null) return null;
  return {
    age_min: ageMin,
    stuck_level: stuckLevel,
    sla_pickup_breach: slaPickupBreach,
  };
}

function normalizeOpsState(raw: unknown): OpsMessengerState {
  const value = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (OPS_STATES.includes(value as OpsMessengerState)) {
    return value as OpsMessengerState;
  }
  return "OFFLINE";
}

function normalizeActiveService(raw: unknown): OpsActiveService | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const serviceId = String(rec.service_id ?? rec.serviceId ?? "").trim();
  if (!serviceId) return null;
  const status = String(rec.status ?? rec.service_status ?? "").trim();
  return {
    service_id: serviceId,
    status: status || "—",
  };
}

function normalizeMessenger(raw: unknown): OpsMapMessenger | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const messengerId = String(
    rec.messenger_id ?? rec.mensajero_id ?? rec.id ?? "",
  ).trim();
  if (!messengerId) return null;

  const latRaw = rec.lat;
  const lngRaw = rec.lng;
  const lat =
    typeof latRaw === "number" && Number.isFinite(latRaw) ? latRaw : null;
  const lng =
    typeof lngRaw === "number" && Number.isFinite(lngRaw) ? lngRaw : null;

  return {
    messenger_id: messengerId,
    full_name:
      rec.full_name != null
        ? String(rec.full_name)
        : rec.name != null
          ? String(rec.name)
          : null,
    phone: rec.phone != null ? String(rec.phone) : null,
    plate: rec.plate != null ? String(rec.plate) : null,
    ops_state: normalizeOpsState(rec.ops_state ?? rec.opsState),
    is_online:
      typeof rec.is_online === "boolean"
        ? rec.is_online
        : typeof rec.isOnline === "boolean"
          ? rec.isOnline
          : undefined,
    active_service: normalizeActiveService(
      rec.active_service ?? rec.activeService,
    ),
    lat,
    lng,
  };
}

function normalizeRequestedService(raw: unknown): RequestedOpsService | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const serviceId = String(rec.service_id ?? rec.serviceId ?? "").trim();
  if (!serviceId) return null;

  return {
    service_id: serviceId,
    service_short: pick(rec, "service_short", toOptionalString),
    status: pick(rec, "status", toOptionalString),
    service_type: pick(rec, "service_type", toOptionalString),
    created_at: pick(rec, "created_at", toOptionalString),
    requester_company_id: pick(rec, "requester_company_id", toOptionalString),
    company_name: pick(rec, "company_name", toOptionalString),
    origin: normalizeLocation(rec.origin),
    destination: normalizeLocation(rec.destination),
    operational_flags: normalizeRequestedFlags(
      rec.operational_flags ?? rec.operationalFlags,
    ),
  };
}

function normalizeMessengersList(data: AdminOpsMapSnapshotResponse): OpsMapMessenger[] {
  const raw = data.messengers ?? data.items ?? [];
  if (!Array.isArray(raw)) return [];
  const out: OpsMapMessenger[] = [];
  for (const item of raw) {
    const normalized = normalizeMessenger(item);
    if (normalized) out.push(normalized);
  }
  return out;
}

function normalizeRequestedList(
  data: AdminOpsMapSnapshotResponse,
): RequestedOpsService[] {
  const raw = data.requested_services ?? [];
  if (!Array.isArray(raw)) return [];
  const out: RequestedOpsService[] = [];
  for (const item of raw) {
    const normalized = normalizeRequestedService(item);
    if (normalized) out.push(normalized);
  }
  return out;
}

export async function getAdminOpsMapSnapshot(
  options?: GetAdminOpsMapSnapshotOptions,
): Promise<AdminOpsMapSnapshot> {
  const { apiBase, adminKey } = ensureAdminConfig();
  const limit = options?.limit ?? 200;

  const url = new URL(`${apiBase}/v1/admin/ops/map`);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
  });

  const data = (await response.json()) as AdminOpsMapSnapshotResponse & {
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      parseErrorMessage(data, `Error al cargar mapa ops (${response.status})`),
    );
  }

  return {
    trace_id: data.trace_id,
    limit: data.limit ?? limit,
    messengers: normalizeMessengersList(data),
    requested_services: normalizeRequestedList(data),
  };
}
