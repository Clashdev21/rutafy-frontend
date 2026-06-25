export const TRACKING_ALERT_TYPE_LABELS: Record<string, string> = {
  tracking_incomplete: "Captura incompleta",
  tracking_poor_quality: "Calidad deficiente",
  tracking_low_coverage: "Cobertura baja",
  tracking_large_gap: "Hueco GPS prolongado",
};

export const TRACKING_SEVERITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const SEVERITY_FILTER_OPTIONS = [
  { value: "all", label: "Todas las severidades" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
] as const;

export const ALERT_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "Todos los tipos" },
  { value: "tracking_incomplete", label: "Captura incompleta" },
  { value: "tracking_poor_quality", label: "Calidad deficiente" },
  { value: "tracking_low_coverage", label: "Cobertura baja" },
  { value: "tracking_large_gap", label: "Hueco GPS prolongado" },
] as const;

export const SINCE_FILTER_OPTIONS = [
  { value: "24h", label: "Últimas 24 h" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "all", label: "Todo" },
] as const;

export type SeverityFilter = (typeof SEVERITY_FILTER_OPTIONS)[number]["value"];
export type AlertTypeFilter = (typeof ALERT_TYPE_FILTER_OPTIONS)[number]["value"];
export type SinceFilter = (typeof SINCE_FILTER_OPTIONS)[number]["value"];

export function normalizeSeverity(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function normalizeAlertType(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function trackingAlertTypeLabel(value?: string | null): string {
  const key = normalizeAlertType(value);
  return TRACKING_ALERT_TYPE_LABELS[key] ?? (key ? key : "—");
}

export function trackingSeverityLabel(value?: string | null): string {
  const key = normalizeSeverity(value);
  return TRACKING_SEVERITY_LABELS[key] ?? (key ? key : "—");
}

export function trackingSeverityBadgeClass(value?: string | null): string {
  switch (normalizeSeverity(value)) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200";
    case "medium":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "low":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

/** Convierte preset since a ISO timestamp (UTC) o null para "all". */
export function sincePresetToIso(preset: SinceFilter, now = Date.now()): string | null {
  switch (preset) {
    case "24h":
      return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    case "all":
    default:
      return null;
  }
}

export function formatAlertCount(value: number): string {
  return String(Math.round(value));
}
