import type { OperationalControlContainerRow } from "@/api/operational-control";

export type RiskBand = "critical" | "upcoming" | "delayed" | "normal" | "completed";

export type QuickTab = "all" | "critical" | "at_risk" | "normal" | "completed";

export const TIMELINE_OPERATION_STEPS = [
  "Correo recibido",
  "Matching",
  "Asignación",
  "GPS activo",
  "Puerto",
  "Salida",
  "Ruta",
  "Entrega",
] as const;

function normalizeKey(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

/** Banda visual derivada solo de campos ya presentes en el payload. */
export function deriveRiskBand(row: OperationalControlContainerRow): RiskBand {
  const explicit = String(row.risk_band ?? "")
    .trim()
    .toLowerCase();
  if (explicit === "critical" || explicit === "critico") return "critical";
  if (explicit === "delayed" || explicit === "retrasado") return "delayed";
  if (explicit === "upcoming" || explicit === "proximo") return "upcoming";
  if (explicit === "completed" || explicit === "completado") return "completed";
  if (explicit === "normal") return "normal";

  const status = normalizeKey(row.rutafy_status);
  const priority = normalizeKey(row.sort_priority);

  if (status === "FINALIZADO" || priority === "COMPLETED" || priority === "FINALIZADO") {
    return "completed";
  }
  if (
    priority === "CRITICO" ||
    priority === "CRITICAL" ||
    status === "ALERTA" ||
    row.alerts.some((a) => /critical|critico/i.test(a))
  ) {
    return "critical";
  }
  if (
    priority === "ALTO" ||
    priority === "HIGH" ||
    status === "ESPERANDO_GPS" ||
    status === "ESPERANDO_MOVIMIENTO" ||
    normalizeKey(row.gps_status) === "OFFLINE" ||
    normalizeKey(row.gps_status) === "STALE"
  ) {
    return "delayed";
  }
  if (row.alerts.length > 0 || priority === "WAITING_GPS" || priority === "SCHEDULED") {
    return "upcoming";
  }
  return "normal";
}

export function riskBandLabel(band: RiskBand): string {
  switch (band) {
    case "critical":
      return "Crítico";
    case "upcoming":
      return "Próximo";
    case "delayed":
      return "Retrasado";
    case "completed":
      return "Completado";
    default:
      return "Normal";
  }
}

export function riskBandBarClass(band: RiskBand): string {
  switch (band) {
    case "critical":
      return "bg-red-500";
    case "upcoming":
      return "bg-amber-400";
    case "delayed":
      return "bg-orange-500";
    case "completed":
      return "bg-slate-300";
    default:
      return "bg-emerald-500";
  }
}

export function riskBandRowBgClass(band: RiskBand): string {
  switch (band) {
    case "critical":
      return "bg-red-50/80 hover:bg-red-50";
    case "upcoming":
      return "bg-amber-50/50 hover:bg-amber-50";
    case "delayed":
      return "bg-orange-50/60 hover:bg-orange-50";
    case "completed":
      return "bg-slate-50/80 hover:bg-slate-50";
    default:
      return "hover:bg-emerald-50/40";
  }
}

export function filterByQuickTab(
  rows: OperationalControlContainerRow[],
  tab: QuickTab,
): OperationalControlContainerRow[] {
  if (tab === "all") return rows;
  return rows.filter((row) => {
    const band = deriveRiskBand(row);
    switch (tab) {
      case "critical":
        return band === "critical";
      case "at_risk":
        return band === "critical" || band === "delayed" || band === "upcoming";
      case "normal":
        return band === "normal";
      case "completed":
        return band === "completed";
      default:
        return true;
    }
  });
}

export function countByQuickTab(rows: OperationalControlContainerRow[]): Record<QuickTab, number> {
  return {
    all: rows.length,
    critical: filterByQuickTab(rows, "critical").length,
    at_risk: filterByQuickTab(rows, "at_risk").length,
    normal: filterByQuickTab(rows, "normal").length,
    completed: filterByQuickTab(rows, "completed").length,
  };
}

export function pickCriticalContainers(
  rows: OperationalControlContainerRow[],
  limit = 6,
): OperationalControlContainerRow[] {
  return rows
    .filter((row) => {
      const band = deriveRiskBand(row);
      return band === "critical" || band === "delayed" || band === "upcoming";
    })
    .slice(0, limit);
}

export function matchesCommandSearch(
  row: OperationalControlContainerRow,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    row.container_label,
    row.container_id,
    row.plate,
    row.driver_name,
    row.driver_doc_id,
    row.program_name,
    row.client_name,
    row.declared_port,
    row.declared_port_code,
    row.confirmed_port_code,
    row.destination,
    row.destination_code,
    row.declared_destination_code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function buildRiskAlerts(
  row: Pick<
    OperationalControlContainerRow,
    | "alerts"
    | "rutafy_status"
    | "gps_status"
    | "driver_assignment_state"
    | "delay_label"
    | "observed_delay"
    | "sort_priority"
  > & { container_id?: string },
): string[] {
  const alerts = [...row.alerts];
  const gps = normalizeKey(row.gps_status);
  if (gps === "OFFLINE" && !alerts.some((a) => /gps|offline/i.test(a))) {
    alerts.unshift("GPS OFFLINE");
  }
  if (deriveRiskBand(row as OperationalControlContainerRow) === "critical" && !alerts.some((a) => /critical|critico/i.test(a))) {
    alerts.unshift("CRITICAL RISK");
  }
  if (
    (row.delay_label || row.observed_delay) &&
    !alerts.some((a) => /delay|retraso/i.test(a))
  ) {
    alerts.push(String(row.delay_label ?? "DELAY"));
  }
  const assignment = String(row.driver_assignment_state ?? "").toLowerCase();
  if (
    (assignment === "none" || assignment === "unassigned" || assignment === "no_driver") &&
    !alerts.some((a) => /match|conductor/i.test(a))
  ) {
    alerts.push("SIN MATCH");
  }
  return alerts;
}
