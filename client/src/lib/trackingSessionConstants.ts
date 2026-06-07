export const TRACKING_ACTOR_TYPE_LABELS: Record<string, string> = {
  messenger: "Mensajero",
  transporter: "Transportista",
  admin: "Admin",
};

export const TRACKING_STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  ended: "Finalizada",
  abandoned: "Abandonada",
};

export const TRACKING_PURPOSE_LABELS: Record<string, string> = {
  terminal: "Terminal",
  patio: "Patio",
  puerto: "Puerto",
  operacion_interna: "Operación interna",
};

export function trackingActorTypeLabel(value?: string | null): string {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  return TRACKING_ACTOR_TYPE_LABELS[key] ?? (key ? key : "—");
}

export function trackingStatusLabel(value?: string | null): string {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  return TRACKING_STATUS_LABELS[key] ?? (key ? key : "—");
}

export function trackingPurposeLabel(value?: string | null): string {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  return TRACKING_PURPOSE_LABELS[key] ?? (key ? key : "—");
}

export function trackingStatusBadgeClass(status?: string | null): string {
  const key = String(status ?? "")
    .trim()
    .toLowerCase();
  switch (key) {
    case "active":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "ended":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "abandoned":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}
