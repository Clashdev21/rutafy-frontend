/**
 * Constantes del Centro de Control Operacional (admin /ops/map).
 *
 * Evolución futura (solo estructura; no implementado):
 * - Congestión portuaria
 * - Eventos geofence en timeline
 * - Permanencia en terminales
 * - ETA operacional dinámico
 * - Validación puerto declarado vs real
 * - Inteligencia operacional / mapa de calor
 */
export const OPS_MAP_CENTER = { lat: 3.8801, lng: -77.0312 };
export const OPS_MAP_DEFAULT_ZOOM = 13;

/** Ciclo operacional real (services.status). */
export const OPERATIONAL_STATUSES = [
  "REQUESTED",
  "CLAIMED",
  "STARTED",
  "CLOSED",
] as const;

export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number];

/** Servicios visibles en mapa V1. */
export const MAP_VISIBLE_OPERATIONAL_STATUSES: OperationalStatus[] = [
  "REQUESTED",
  "CLAIMED",
  "STARTED",
];

/** Pipeline de asignación (services.dispatch_status). */
export const DISPATCH_STATUSES = [
  "PENDING",
  "SEARCHING",
  "OFFERED",
  "CLAIMED",
  "COMPLETED",
  "EXHAUSTED",
  "INVALID",
] as const;

export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export const OPERATIONAL_STATUS_LABELS: Record<OperationalStatus, string> = {
  REQUESTED: "Solicitado",
  CLAIMED: "Reclamado",
  STARTED: "En curso",
  CLOSED: "Cerrado",
};

export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
  PENDING: "Pendiente",
  SEARCHING: "Buscando",
  OFFERED: "Ofertado",
  CLAIMED: "Reclamado (dispatch)",
  COMPLETED: "Completado",
  EXHAUSTED: "Agotado",
  INVALID: "Inválido",
};

/** Colores de pin de servicio por status operacional. */
export const OPERATIONAL_STATUS_PIN_COLORS: Record<
  OperationalStatus,
  string
> = {
  REQUESTED: "#eab308",
  CLAIMED: "#3b82f6",
  STARTED: "#22c55e",
  CLOSED: "#64748b",
};

export type GeofenceState =
  | "FAR_PICKUP"
  | "NEAR_PICKUP"
  | "AT_PICKUP"
  | "FAR_DESTINATION"
  | "NEAR_DESTINATION"
  | "AT_DESTINATION";

export const GEOFENCE_STATE_LABELS: Record<GeofenceState, string> = {
  FAR_PICKUP: "Lejos · recogida",
  NEAR_PICKUP: "Cerca · recogida",
  AT_PICKUP: "En recogida",
  FAR_DESTINATION: "Lejos · destino",
  NEAR_DESTINATION: "Cerca · destino",
  AT_DESTINATION: "En destino",
};

export const GEOFENCE_BADGE_CLASS: Record<GeofenceState, string> = {
  FAR_PICKUP: "bg-slate-100 text-slate-700 border-slate-200",
  NEAR_PICKUP: "bg-sky-100 text-sky-800 border-sky-200",
  AT_PICKUP: "bg-emerald-100 text-emerald-800 border-emerald-200",
  FAR_DESTINATION: "bg-slate-100 text-slate-700 border-slate-200",
  NEAR_DESTINATION: "bg-violet-100 text-violet-800 border-violet-200",
  AT_DESTINATION: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export type OpsMessengerState =
  | "AVAILABLE"
  | "ASSIGNED"
  | "IN_SERVICE"
  | "BUSY_IDLE"
  | "OFFLINE";

export const OPS_MESSENGER_STATE_LABELS: Record<OpsMessengerState, string> = {
  AVAILABLE: "Disponible",
  ASSIGNED: "Asignado",
  IN_SERVICE: "En servicio",
  BUSY_IDLE: "Busy idle",
  OFFLINE: "Offline",
};

export const OPS_MESSENGER_PIN_COLORS: Record<OpsMessengerState, string> = {
  AVAILABLE: "#22c55e",
  ASSIGNED: "#3b82f6",
  IN_SERVICE: "#8b5cf6",
  BUSY_IDLE: "#f59e0b",
  OFFLINE: "#9ca3af",
};

export function normalizeOperationalStatus(
  raw: unknown,
): OperationalStatus | null {
  const value = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (OPERATIONAL_STATUSES.includes(value as OperationalStatus)) {
    return value as OperationalStatus;
  }
  return null;
}

export function normalizeDispatchStatus(raw: unknown): DispatchStatus | null {
  const value = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (DISPATCH_STATUSES.includes(value as DispatchStatus)) {
    return value as DispatchStatus;
  }
  return null;
}

export function normalizeGeofenceState(raw: unknown): GeofenceState | null {
  const value = String(raw ?? "")
    .trim()
    .toUpperCase();
  const allowed: GeofenceState[] = [
    "FAR_PICKUP",
    "NEAR_PICKUP",
    "AT_PICKUP",
    "FAR_DESTINATION",
    "NEAR_DESTINATION",
    "AT_DESTINATION",
  ];
  if (allowed.includes(value as GeofenceState)) {
    return value as GeofenceState;
  }
  return null;
}

export function operationalStatusBadgeClass(status: OperationalStatus): string {
  switch (status) {
    case "REQUESTED":
      return "bg-amber-100 text-amber-900 border-amber-200";
    case "CLAIMED":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "STARTED":
      return "bg-green-100 text-green-800 border-green-200";
    case "CLOSED":
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function dispatchStatusBadgeClass(status: DispatchStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "SEARCHING":
      return "bg-cyan-100 text-cyan-800 border-cyan-200";
    case "OFFERED":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "CLAIMED":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "EXHAUSTED":
      return "bg-orange-100 text-orange-900 border-orange-200";
    case "INVALID":
      return "bg-red-100 text-red-800 border-red-200";
  }
}
