export type DeliveryStatusKey =
  | "sent"
  | "failed"
  | "skipped"
  | "pending"
  | string;

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  sent: "Enviado",
  failed: "Fallido",
  skipped: "Omitido",
  pending: "Pendiente",
};

export const DELIVERY_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "sent", label: "Enviado" },
  { value: "failed", label: "Fallido" },
  { value: "skipped", label: "Omitido" },
  { value: "pending", label: "Pendiente" },
] as const;

export const EVENT_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "Todos los eventos" },
  { value: "dispatch_offer", label: "Oferta dispatch" },
  { value: "test", label: "Prueba" },
] as const;

export const EVENT_TYPE_LABELS: Record<string, string> = {
  dispatch_offer: "Oferta dispatch",
  test: "Prueba",
};

export const ACTOR_TYPE_LABELS: Record<string, string> = {
  messenger: "Mensajero",
  transporter: "Transportista",
  admin: "Admin",
};

export function normalizeDeliveryStatus(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function deliveryStatusLabel(value?: string | null): string {
  const key = normalizeDeliveryStatus(value);
  return DELIVERY_STATUS_LABELS[key] ?? (key ? key : "—");
}

export function deliveryStatusBadgeClass(value?: string | null): string {
  switch (normalizeDeliveryStatus(value)) {
    case "sent":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "failed":
      return "bg-red-100 text-red-800 border-red-200";
    case "skipped":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "pending":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function eventTypeLabel(value?: string | null): string {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  return EVENT_TYPE_LABELS[key] ?? (key ? key : "—");
}

export function actorTypeLabel(value?: string | null): string {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  return ACTOR_TYPE_LABELS[key] ?? (key ? key : "—");
}

export function truncateId(id?: string | null, head = 8, tail = 4): string {
  const s = String(id ?? "").trim();
  if (!s) return "—";
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function truncateText(
  value?: string | null,
  maxLen = 48,
): string {
  const s = String(value ?? "").trim();
  if (!s) return "—";
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}…`;
}

export function formatNotificationDateTime(iso?: string | null): string {
  if (iso == null || String(iso).trim() === "") return "—";
  const ms = Date.parse(String(iso));
  if (!Number.isFinite(ms)) return String(iso);
  return new Date(ms).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatCount(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return String(Math.round(value));
}

export function enabledBadgeClass(enabled: boolean): string {
  return enabled
    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : "bg-gray-100 text-gray-600 border-gray-200";
}

export function enabledLabel(enabled: boolean): string {
  return enabled ? "Activo" : "Inactivo";
}

export function platformEnvironmentLabel(
  platform?: string | null,
  environment?: string | null,
): string {
  const p = String(platform ?? "").trim();
  const e = String(environment ?? "").trim();
  if (p && e) return `${p} · ${e}`;
  return p || e || "—";
}
