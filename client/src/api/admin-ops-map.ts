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

export type AdminOpsMapSnapshotResponse = {
  trace_id?: string;
  limit?: number;
  messengers?: OpsMapMessenger[];
  items?: OpsMapMessenger[];
};

export type AdminOpsMapSnapshot = {
  trace_id?: string;
  limit: number;
  messengers: OpsMapMessenger[];
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

  return {
    trace_id: data.trace_id,
    limit: data.limit ?? limit,
    messengers: normalizeMessengersList(data),
  };
}
