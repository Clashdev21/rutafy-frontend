import type { OpsServiceLocation } from "@/api/admin-ops-service";
import {
  MAP_VISIBLE_OPERATIONAL_STATUSES,
  normalizeGeofenceState,
  normalizeOperationalStatus,
  type GeofenceState,
  type OperationalStatus,
} from "@/lib/adminOpsConstants";

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
  map_lat?: number | null;
  map_lng?: number | null;
  location_updated_at?: string | null;
};

export type OpsMapServiceFlags = {
  age_min?: number | null;
  stuck_level?: string | null;
  sla_pickup_breach?: boolean | null;
  sla_delivery_breach?: boolean | null;
  idle_min?: number | null;
  open_alerts?: number | null;
  heartbeat_stale?: boolean | null;
  service_stopped?: boolean | null;
  operational_inconsistency?: boolean | null;
};

/** Servicio en mapa / listas del centro de control (requested + active + fallback). */
export type OpsMapService = {
  service_id: string;
  service_short?: string | null;
  status?: string | null;
  dispatch_status?: string | null;
  geofence_state?: GeofenceState | string | null;
  service_type?: string | null;
  created_at?: string | null;
  mensajero_id?: string | null;
  assigned_messenger_id?: string | null;
  messenger_name?: string | null;
  requester_company_id?: string | null;
  company_name?: string | null;
  requester_plate?: string | null;
  requester_vehicle_type?: string | null;
  requester_vehicle_reference?: string | null;
  origin?: OpsServiceLocation | null;
  destination?: OpsServiceLocation | null;
  eta_pickup_at?: string | null;
  eta_delivery_at?: string | null;
  sla_pickup_deadline_at?: string | null;
  sla_delivery_deadline_at?: string | null;
  operational_flags?: OpsMapServiceFlags | null;
};

/** Alias explícito para capas del snapshot admin ops map. */
export type AdminOpsMapService = OpsMapService;

/** @deprecated Alias de OpsMapService */
export type RequestedOpsService = OpsMapService;

/** @deprecated Alias de RequestedOpsServiceFlags */
export type RequestedOpsServiceFlags = OpsMapServiceFlags;

export type AdminOpsMapSnapshotResponse = {
  trace_id?: string;
  limit?: number;
  messengers?: OpsMapMessenger[];
  items?: OpsMapMessenger[];
  requested_services?: unknown[];
  active_services?: unknown[];
  services?: unknown[];
};

export type AdminOpsMapSnapshot = {
  trace_id?: string;
  limit: number;
  messengers: OpsMapMessenger[];
  /** Lista unificada sin duplicados (prioridad: active > requested > items fallback). */
  map_services: OpsMapService[];
  /** Capa REQUESTED del backend (normalizada). */
  requested_services: OpsMapService[];
  /** Capa CLAIMED/STARTED del backend (normalizada). */
  active_services: OpsMapService[];
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

function normalizeServiceFlags(raw: unknown): OpsMapServiceFlags | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const ageMin = pick(rec, "age_min", toFiniteNumber);
  const stuckLevel = pick(rec, "stuck_level", toOptionalString);
  const slaPickupBreach = pick(rec, "sla_pickup_breach", toOptionalBoolean);
  const slaDeliveryBreach = pick(rec, "sla_delivery_breach", toOptionalBoolean);
  const idleMin = pick(rec, "idle_min", toFiniteNumber);
  const openAlerts = pick(rec, "open_alerts", toFiniteNumber);
  const heartbeatStale = pick(rec, "heartbeat_stale", toOptionalBoolean);
  const serviceStopped = pick(rec, "service_stopped", toOptionalBoolean);
  const operationalInconsistency = pick(
    rec,
    "operational_inconsistency",
    toOptionalBoolean,
  );

  if (
    ageMin == null &&
    !stuckLevel &&
    slaPickupBreach == null &&
    slaDeliveryBreach == null &&
    idleMin == null &&
    openAlerts == null &&
    heartbeatStale == null &&
    serviceStopped == null &&
    operationalInconsistency == null
  ) {
    return null;
  }

  return {
    age_min: ageMin,
    stuck_level: stuckLevel,
    sla_pickup_breach: slaPickupBreach,
    sla_delivery_breach: slaDeliveryBreach,
    idle_min: idleMin,
    open_alerts: openAlerts,
    heartbeat_stale: heartbeatStale,
    service_stopped: serviceStopped,
    operational_inconsistency: operationalInconsistency,
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

  const mapLat = pick(rec, "map_lat", toFiniteNumber);
  const mapLng = pick(rec, "map_lng", toFiniteNumber);
  const lat = mapLat ?? pick(rec, "lat", toFiniteNumber);
  const lng = mapLng ?? pick(rec, "lng", toFiniteNumber);
  const location_updated_at = pick(rec, "location_updated_at", toOptionalString);

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
    map_lat: mapLat ?? lat,
    map_lng: mapLng ?? lng,
    location_updated_at,
  };
}

function normalizeMapService(raw: unknown): OpsMapService | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const serviceId = String(rec.service_id ?? rec.serviceId ?? "").trim();
  if (!serviceId) return null;

  const statusRaw = pick(rec, "status", toOptionalString);
  const opStatus = normalizeOperationalStatus(statusRaw);
  if (!opStatus || !MAP_VISIBLE_OPERATIONAL_STATUSES.includes(opStatus)) {
    return null;
  }

  const geofenceRaw = pick(rec, "geofence_state", toOptionalString);
  const mensajeroId =
    pick(rec, "mensajero_id", toOptionalString) ??
    pick(rec, "assigned_messenger_id", toOptionalString);

  return {
    service_id: serviceId,
    service_short: pick(rec, "service_short", toOptionalString),
    status: opStatus,
    dispatch_status: pick(rec, "dispatch_status", toOptionalString),
    geofence_state: normalizeGeofenceState(geofenceRaw) ?? geofenceRaw,
    service_type: pick(rec, "service_type", toOptionalString),
    created_at: pick(rec, "created_at", toOptionalString),
    mensajero_id: mensajeroId,
    assigned_messenger_id:
      pick(rec, "assigned_messenger_id", toOptionalString) ?? mensajeroId,
    messenger_name: pick(rec, "messenger_name", toOptionalString),
    requester_company_id: pick(rec, "requester_company_id", toOptionalString),
    company_name: pick(rec, "company_name", toOptionalString),
    requester_plate: pick(rec, "requester_plate", toOptionalString),
    requester_vehicle_type: pick(rec, "requester_vehicle_type", toOptionalString),
    requester_vehicle_reference: pick(
      rec,
      "requester_vehicle_reference",
      toOptionalString,
    ),
    origin: normalizeLocation(rec.origin),
    destination: normalizeLocation(rec.destination),
    eta_pickup_at: pick(rec, "eta_pickup_at", toOptionalString),
    eta_delivery_at: pick(rec, "eta_delivery_at", toOptionalString),
    sla_pickup_deadline_at: pick(rec, "sla_pickup_deadline_at", toOptionalString),
    sla_delivery_deadline_at: pick(
      rec,
      "sla_delivery_deadline_at",
      toOptionalString,
    ),
    operational_flags: normalizeServiceFlags(
      rec.operational_flags ?? rec.operationalFlags,
    ),
  };
}

function normalizeMapServiceList(raw: unknown[] | undefined): OpsMapService[] {
  if (!Array.isArray(raw)) return [];
  const out: OpsMapService[] = [];
  for (const item of raw) {
    const normalized = normalizeMapService(item);
    if (normalized) out.push(normalized);
  }
  return out;
}

/**
 * Fallback mínimo desde items[].active_service cuando active_services[] viene vacío.
 */
function normalizeMapServiceFromMessengerFallback(
  messenger: OpsMapMessenger,
): OpsMapService | null {
  const active = messenger.active_service;
  if (!active?.service_id) return null;

  const opStatus = normalizeOperationalStatus(active.status);
  if (!opStatus || !MAP_VISIBLE_OPERATIONAL_STATUSES.includes(opStatus)) {
    return null;
  }

  return {
    service_id: active.service_id,
    service_short: null,
    status: opStatus,
    dispatch_status: null,
    mensajero_id: messenger.messenger_id,
    assigned_messenger_id: messenger.messenger_id,
    messenger_name: messenger.full_name ?? null,
    origin: null,
    destination: null,
    operational_flags: null,
  };
}

/**
 * Unifica capas sin duplicar service_id.
 * Prioridad en conflicto: active_services > requested_services > items[].active_service.
 */
export function mergeAdminOpsMapServices(
  messengers: OpsMapMessenger[],
  requestedRaw: unknown[] | undefined,
  activeRaw: unknown[] | undefined,
): {
  map_services: OpsMapService[];
  requested_services: OpsMapService[];
  active_services: OpsMapService[];
} {
  const requested_services = normalizeMapServiceList(requestedRaw);
  const active_services = normalizeMapServiceList(activeRaw ?? []);

  const byId = new Map<string, OpsMapService>();

  for (const messenger of messengers) {
    const stub = normalizeMapServiceFromMessengerFallback(messenger);
    if (stub) byId.set(stub.service_id, stub);
  }

  for (const service of requested_services) {
    byId.set(service.service_id, service);
  }

  for (const service of active_services) {
    byId.set(service.service_id, service);
  }

  return {
    map_services: Array.from(byId.values()),
    requested_services,
    active_services,
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

  const messengers = normalizeMessengersList(data);
  const { map_services, requested_services, active_services } =
    mergeAdminOpsMapServices(
      messengers,
      data.requested_services,
      data.active_services ?? [],
    );

  return {
    trace_id: data.trace_id,
    limit: data.limit ?? limit,
    messengers,
    map_services,
    requested_services,
    active_services,
  };
}

export function serviceHasSlaBreach(service: OpsMapService): boolean {
  const flags = service.operational_flags;
  return (
    flags?.sla_pickup_breach === true || flags?.sla_delivery_breach === true
  );
}
