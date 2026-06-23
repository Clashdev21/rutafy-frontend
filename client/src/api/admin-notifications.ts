import { adminHttp, parseAdminApiError } from "@/api/adminHttp";
import axios from "axios";

export type AdminNotificationSummary = {
  devices_active: number;
  deliveries_total: number;
  deliveries_sent: number;
  deliveries_failed: number;
  deliveries_skipped: number;
  by_event_type: Record<string, number>;
};

export type AdminNotificationDelivery = {
  id: string;
  created_at?: string | null;
  event_type?: string | null;
  status?: string | null;
  user_id?: string | null;
  actor_type?: string | null;
  actor_id?: string | null;
  platform?: string | null;
  environment?: string | null;
  title?: string | null;
  body?: string | null;
  error?: string | null;
  token_masked?: string | null;
};

export type AdminNotificationDevice = {
  id: string;
  actor_type?: string | null;
  user_id?: string | null;
  platform?: string | null;
  environment?: string | null;
  enabled: boolean;
  last_seen_at?: string | null;
  last_notification_at?: string | null;
  deliveries_7d?: number | null;
  failed_7d?: number | null;
  token_masked?: string | null;
};

export type AdminNotificationPreferences = {
  user_id: string;
  push_enabled?: boolean | null;
  event_types?: string[] | null;
  updated_at?: string | null;
};

export type ListAdminNotificationDeliveriesOptions = {
  limit?: number;
  status?: string;
  event_type?: string;
};

export type ListAdminNotificationDevicesOptions = {
  limit?: number;
};

export type ListAdminNotificationDeliveriesResult = {
  trace_id?: string;
  limit: number;
  deliveries: AdminNotificationDelivery[];
};

export type ListAdminNotificationDevicesResult = {
  trace_id?: string;
  limit: number;
  devices: AdminNotificationDevice[];
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

function toBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return defaultValue;
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

function normalizeByEventType(raw: unknown): Record<string, number> {
  const rec = asRecord(raw);
  if (!rec) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(rec)) {
    const n = toFiniteNumber(value);
    if (n != null) out[key] = n;
  }
  return out;
}

function normalizeSummary(raw: unknown): AdminNotificationSummary {
  const defaults: AdminNotificationSummary = {
    devices_active: 0,
    deliveries_total: 0,
    deliveries_sent: 0,
    deliveries_failed: 0,
    deliveries_skipped: 0,
    by_event_type: {},
  };
  if (!raw || typeof raw !== "object") return defaults;
  const rec = raw as Record<string, unknown>;

  const devices = asRecord(rec.devices ?? rec.Devices);
  const deliveries = asRecord(rec.deliveries ?? rec.Deliveries);

  return {
    devices_active:
      (devices ? pick(devices, "active", toFiniteNumber) : null) ??
      pick(rec, "devices_active", toFiniteNumber) ??
      pick(rec, "active_devices", toFiniteNumber) ??
      defaults.devices_active,
    deliveries_total:
      (deliveries ? pick(deliveries, "total", toFiniteNumber) : null) ??
      pick(rec, "deliveries_total", toFiniteNumber) ??
      defaults.deliveries_total,
    deliveries_sent:
      (deliveries ? pick(deliveries, "sent", toFiniteNumber) : null) ??
      pick(rec, "deliveries_sent", toFiniteNumber) ??
      pick(rec, "sent", toFiniteNumber) ??
      defaults.deliveries_sent,
    deliveries_failed:
      (deliveries ? pick(deliveries, "failed", toFiniteNumber) : null) ??
      pick(rec, "deliveries_failed", toFiniteNumber) ??
      pick(rec, "failed", toFiniteNumber) ??
      defaults.deliveries_failed,
    deliveries_skipped:
      (deliveries ? pick(deliveries, "skipped", toFiniteNumber) : null) ??
      pick(rec, "deliveries_skipped", toFiniteNumber) ??
      pick(rec, "skipped", toFiniteNumber) ??
      defaults.deliveries_skipped,
    by_event_type: normalizeByEventType(
      rec.by_event_type ?? rec.byEventType ?? rec.event_type_counts,
    ),
  };
}

function normalizeDelivery(raw: unknown): AdminNotificationDelivery | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const id =
    pick(rec, "id", toOptionalString) ??
    pick(rec, "delivery_id", toOptionalString);
  if (!id) return null;

  const device = asRecord(rec.device ?? rec.Device);

  return {
    id,
    created_at: pick(rec, "created_at", toOptionalString),
    event_type: pick(rec, "event_type", toOptionalString),
    status: pick(rec, "status", toOptionalString),
    user_id: pick(rec, "user_id", toOptionalString),
    actor_type: pick(rec, "actor_type", toOptionalString),
    actor_id: pick(rec, "actor_id", toOptionalString),
    platform:
      pick(rec, "platform", toOptionalString) ??
      (device ? pick(device, "platform", toOptionalString) : null),
    environment:
      pick(rec, "environment", toOptionalString) ??
      (device ? pick(device, "environment", toOptionalString) : null),
    title: pick(rec, "title", toOptionalString),
    body: pick(rec, "body", toOptionalString),
    error: pick(rec, "error", toOptionalString),
    token_masked: pick(rec, "token_masked", toOptionalString),
  };
}

function normalizeDeliveryList(raw: unknown): AdminNotificationDelivery[] {
  if (!Array.isArray(raw)) return [];
  const out: AdminNotificationDelivery[] = [];
  for (const item of raw) {
    const normalized = normalizeDelivery(item);
    if (normalized) out.push(normalized);
  }
  return out;
}

function normalizeDevice(raw: unknown): AdminNotificationDevice | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const id =
    pick(rec, "id", toOptionalString) ??
    pick(rec, "device_id", toOptionalString);
  if (!id) return null;

  return {
    id,
    actor_type: pick(rec, "actor_type", toOptionalString),
    user_id: pick(rec, "user_id", toOptionalString),
    platform: pick(rec, "platform", toOptionalString),
    environment: pick(rec, "environment", toOptionalString),
    enabled: toBoolean(rec.enabled ?? rec.is_enabled, false),
    last_seen_at: pick(rec, "last_seen_at", toOptionalString),
    last_notification_at: pick(rec, "last_notification_at", toOptionalString),
    deliveries_7d: pick(rec, "deliveries_7d", toFiniteNumber),
    failed_7d: pick(rec, "failed_7d", toFiniteNumber),
    token_masked: pick(rec, "token_masked", toOptionalString),
  };
}

function normalizeDeviceList(raw: unknown): AdminNotificationDevice[] {
  if (!Array.isArray(raw)) return [];
  const out: AdminNotificationDevice[] = [];
  for (const item of raw) {
    const normalized = normalizeDevice(item);
    if (normalized) out.push(normalized);
  }
  return out;
}

function normalizePreferences(raw: unknown): AdminNotificationPreferences | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const user_id = pick(rec, "user_id", toOptionalString);
  if (!user_id) return null;

  const eventTypesRaw = rec.event_types ?? rec.eventTypes;
  let event_types: string[] | null = null;
  if (Array.isArray(eventTypesRaw)) {
    event_types = eventTypesRaw
      .map((v) => toOptionalString(v))
      .filter((v): v is string => v != null);
  }

  return {
    user_id,
    push_enabled:
      rec.push_enabled != null || rec.pushEnabled != null
        ? toBoolean(rec.push_enabled ?? rec.pushEnabled)
        : null,
    event_types,
    updated_at: pick(rec, "updated_at", toOptionalString),
  };
}

function extractListPayload(data: Record<string, unknown>): unknown[] {
  const candidates = [
    data.deliveries,
    data.devices,
    data.items,
    data.results,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

export async function getAdminNotificationSummary(): Promise<AdminNotificationSummary> {
  ensureApiBase();
  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      "/v1/admin/notifications/summary",
    );
    const summaryRaw =
      data.summary && typeof data.summary === "object"
        ? data.summary
        : data;
    return normalizeSummary(summaryRaw);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar resumen de notificaciones (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}

export async function listAdminNotificationDeliveries(
  options?: ListAdminNotificationDeliveriesOptions,
): Promise<ListAdminNotificationDeliveriesResult> {
  ensureApiBase();
  const limit = options?.limit ?? 50;
  const params: Record<string, string | number> = { limit };
  const status = options?.status?.trim();
  const eventType = options?.event_type?.trim();
  if (status && status.toLowerCase() !== "all") params.status = status;
  if (eventType && eventType.toLowerCase() !== "all") {
    params.event_type = eventType;
  }

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      "/v1/admin/notifications/deliveries",
      { params },
    );
    const list = extractListPayload(data);
    const deliveries =
      list.length > 0 ? normalizeDeliveryList(list) : normalizeDeliveryList(data.deliveries);

    return {
      trace_id: toOptionalString(data.trace_id) ?? undefined,
      limit: toFiniteNumber(data.limit) ?? limit,
      deliveries,
    };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar entregas push (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}

export async function getAdminNotificationDelivery(
  deliveryId: string,
): Promise<AdminNotificationDelivery> {
  ensureApiBase();
  const id = deliveryId.trim();
  if (!id) throw new Error("delivery_id inválido");

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      `/v1/admin/notifications/deliveries/${encodeURIComponent(id)}`,
    );
    const raw =
      data.delivery && typeof data.delivery === "object" ? data.delivery : data;
    const delivery = normalizeDelivery(raw);
    if (!delivery) throw new Error("Respuesta de entrega inválida");
    return delivery;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar entrega push (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}

export async function listAdminNotificationDevices(
  options?: ListAdminNotificationDevicesOptions,
): Promise<ListAdminNotificationDevicesResult> {
  ensureApiBase();
  const limit = options?.limit ?? 50;

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      "/v1/admin/notifications/devices",
      { params: { limit } },
    );
    const list = extractListPayload(data);
    const devices =
      list.length > 0 ? normalizeDeviceList(list) : normalizeDeviceList(data.devices);

    return {
      trace_id: toOptionalString(data.trace_id) ?? undefined,
      limit: toFiniteNumber(data.limit) ?? limit,
      devices,
    };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar dispositivos push (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}

export async function getAdminNotificationDevice(
  deviceId: string,
): Promise<AdminNotificationDevice> {
  ensureApiBase();
  const id = deviceId.trim();
  if (!id) throw new Error("device_id inválido");

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      `/v1/admin/notifications/devices/${encodeURIComponent(id)}`,
    );
    const raw =
      data.device && typeof data.device === "object" ? data.device : data;
    const device = normalizeDevice(raw);
    if (!device) throw new Error("Respuesta de dispositivo inválida");
    return device;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar dispositivo push (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}

export async function getAdminNotificationPreferences(
  userId: string,
): Promise<AdminNotificationPreferences> {
  ensureApiBase();
  const id = userId.trim();
  if (!id) throw new Error("user_id inválido");

  try {
    const { data } = await adminHttp.get<Record<string, unknown>>(
      `/v1/admin/notifications/preferences/${encodeURIComponent(id)}`,
    );
    const raw =
      data.preferences && typeof data.preferences === "object"
        ? data.preferences
        : data;
    const preferences = normalizePreferences(raw);
    if (!preferences) throw new Error("Respuesta de preferencias inválida");
    return preferences;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar preferencias push (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}
