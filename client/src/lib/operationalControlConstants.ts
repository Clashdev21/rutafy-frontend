import type { OperationalControlContainerRow } from "@/api/operational-control";

export const OPERATIONAL_PHASE_LABELS: Record<string, string> = {
  EMAIL: "Correo",
  DECLARATION: "Declaración",
  MATCHING: "Matching",
  MONITORING: "Monitoring",
  GPS: "GPS",
  MOVEMENT: "Movimiento",
  ACTIVE: "Activo",
  COMPLETED: "Finalizado",
};

export const RUTAFY_STATUS_LABELS: Record<string, string> = {
  PROGRAMADO: "Programado",
  ESPERANDO_GPS: "Esperando GPS",
  ESPERANDO_MOVIMIENTO: "Esperando movimiento",
  EN_PUERTO: "En puerto",
  EN_RUTA: "En ruta",
  FINALIZADO: "Finalizado",
  ALERTA: "Alerta",
};

export const DRIVER_ASSIGNMENT_DISPLAY: Record<
  string,
  { emoji: string; label: string }
> = {
  none: { emoji: "⚪", label: "Sin conductor" },
  unassigned: { emoji: "⚪", label: "Sin conductor" },
  no_driver: { emoji: "⚪", label: "Sin conductor" },
  assigned: { emoji: "🟡", label: "Conductor asignado" },
  driver_assigned: { emoji: "🟡", label: "Conductor asignado" },
  gps_active: { emoji: "🟢", label: "GPS activo" },
  active_gps: { emoji: "🟢", label: "GPS activo" },
};

export const GPS_STATUS_DISPLAY: Record<string, { emoji: string; label: string }> = {
  ONLINE: { emoji: "🟢", label: "ONLINE" },
  STALE: { emoji: "🟡", label: "STALE" },
  OFFLINE: { emoji: "⚪", label: "OFFLINE" },
};

export const SORT_PRIORITY_ORDER: Record<string, number> = {
  CRITICO: 0,
  CRITICAL: 0,
  ALTO: 1,
  HIGH: 1,
  ACTIVE: 2,
  WAITING_GPS: 3,
  ESPERANDO_GPS: 3,
  SCHEDULED: 4,
  PROGRAMADO: 4,
  COMPLETED: 5,
  FINALIZADO: 5,
};

export const LIFECYCLE_DEFAULT_STEPS = [
  { key: "email", label: "Correo" },
  { key: "declaration", label: "Declaración" },
  { key: "matching", label: "Matching" },
  { key: "monitoring", label: "Monitoring" },
  { key: "first_gps", label: "Primer GPS" },
  { key: "movement", label: "Movimiento" },
  { key: "port_confirmed", label: "Puerto confirmado" },
  { key: "en_route", label: "En ruta" },
  { key: "completed", label: "Finalizado" },
] as const;

export const FUTURE_ACTIONS = [
  { id: "reassign", label: "Reasignar", disabled: true },
  { id: "close", label: "Cerrar", disabled: true },
  { id: "release", label: "Liberar", disabled: true },
  { id: "tracking", label: "Ver tracking", disabled: true },
  { id: "navigation", label: "Abrir navegación", disabled: true },
] as const;

function normalizeKey(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

export function phaseLabel(value?: string | null): string {
  const key = normalizeKey(value);
  return OPERATIONAL_PHASE_LABELS[key] ?? (key ? key.replace(/_/g, " ") : "—");
}

export function phaseBadgeClass(value?: string | null): string {
  const key = normalizeKey(value);
  switch (key) {
    case "EMAIL":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "DECLARATION":
    case "MATCHING":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "MONITORING":
    case "GPS":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "MOVEMENT":
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "COMPLETED":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function rutafyStatusLabel(value?: string | null): string {
  const key = normalizeKey(value);
  return RUTAFY_STATUS_LABELS[key] ?? (key ? key.replace(/_/g, " ") : "—");
}

export function rutafyStatusBadgeClass(value?: string | null): string {
  const key = normalizeKey(value);
  switch (key) {
    case "PROGRAMADO":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "ESPERANDO_GPS":
    case "ESPERANDO_MOVIMIENTO":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "EN_PUERTO":
    case "EN_RUTA":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "FINALIZADO":
      return "bg-gray-100 text-gray-600 border-gray-200";
    case "ALERTA":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function driverAssignmentDisplay(value?: string | null): string {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  const entry = DRIVER_ASSIGNMENT_DISPLAY[key];
  if (!entry) return "⚪ Sin conductor";
  return `${entry.emoji} ${entry.label}`;
}

export function gpsStatusDisplay(value?: string | null): string {
  const key = normalizeKey(value);
  const entry = GPS_STATUS_DISPLAY[key];
  if (!entry) return "⚪ OFFLINE";
  return `${entry.emoji} ${entry.label}`;
}

export function formatOperationalDateTime(iso?: string | null): string {
  if (iso == null || String(iso).trim() === "") return "—";
  const ms = Date.parse(String(iso));
  if (!Number.isFinite(ms)) return String(iso);
  return new Date(ms).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatGpsAge(iso?: string | null, now = Date.now()): string | null {
  if (iso == null || String(iso).trim() === "") return null;
  const ms = Date.parse(String(iso));
  if (!Number.isFinite(ms)) return null;
  const diffSec = Math.max(0, Math.floor((now - ms) / 1000));
  if (diffSec < 60) return `Hace ${diffSec} segundos`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `Hace ${mins} minutos`;
  const hours = Math.floor(mins / 60);
  return `Hace ${hours} h`;
}

export function formatPercent(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
}

export function formatCount(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "0";
  return String(Math.round(value));
}

export function historyBadgeLabel(count?: number | null): string | null {
  if (count == null || !Number.isFinite(count) || count <= 1) return null;
  return `Historial (${Math.round(count)})`;
}

export function sortOperationalContainers(
  rows: OperationalControlContainerRow[],
): OperationalControlContainerRow[] {
  return [...rows].sort((a, b) => {
    const pa =
      SORT_PRIORITY_ORDER[normalizeKey(a.sort_priority)] ??
      SORT_PRIORITY_ORDER[normalizeKey(a.rutafy_status)] ??
      99;
    const pb =
      SORT_PRIORITY_ORDER[normalizeKey(b.sort_priority)] ??
      SORT_PRIORITY_ORDER[normalizeKey(b.rutafy_status)] ??
      99;
    if (pa !== pb) return pa - pb;

    const sa = a.scheduled_at ? Date.parse(a.scheduled_at) : 0;
    const sb = b.scheduled_at ? Date.parse(b.scheduled_at) : 0;
    return (Number.isFinite(sb) ? sb : 0) - (Number.isFinite(sa) ? sa : 0);
  });
}

export function clientFilterContainers(
  rows: OperationalControlContainerRow[],
  filters: {
    client?: string;
    program?: string;
    status?: string;
    port?: string;
    driver?: string;
    plate?: string;
    container?: string;
    date?: string;
  },
): OperationalControlContainerRow[] {
  const client = filters.client?.trim().toLowerCase();
  const program = filters.program?.trim().toLowerCase();
  const status = filters.status?.trim().toLowerCase();
  const port = filters.port?.trim().toLowerCase();
  const driver = filters.driver?.trim().toLowerCase();
  const plate = filters.plate?.trim().toLowerCase();
  const container = filters.container?.trim().toLowerCase();
  const date = filters.date?.trim();

  return rows.filter((row) => {
    if (client && client !== "all") {
      if (!String(row.client_name ?? "").toLowerCase().includes(client)) return false;
    }
    if (program && program !== "all") {
      if (!String(row.program_name ?? "").toLowerCase().includes(program)) return false;
    }
    if (status && status !== "all") {
      if (normalizeKey(row.rutafy_status) !== normalizeKey(status)) return false;
    }
    if (port && port !== "all") {
      if (!String(row.declared_port ?? "").toLowerCase().includes(port)) return false;
    }
    if (driver && driver !== "all") {
      if (!String(row.driver_name ?? "").toLowerCase().includes(driver)) return false;
    }
    if (plate && plate !== "all") {
      if (!String(row.plate ?? "").toLowerCase().includes(plate)) return false;
    }
    if (container?.trim()) {
      const hay = String(row.container_label ?? row.container_id).toLowerCase();
      if (!hay.includes(container)) return false;
    }
    if (date?.trim()) {
      const scheduled = row.scheduled_at?.slice(0, 10) ?? "";
      if (scheduled !== date) return false;
    }
    return true;
  });
}
