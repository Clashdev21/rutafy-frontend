export type OperationalTimelineStepState = "done" | "active" | "pending";

export type OperationalTimelineStep = {
  id: string;
  label: string;
  state: OperationalTimelineStepState;
  timestamp?: string | null;
};

export type ResolveOperationalTimelineInput = {
  status: string;
  createdAt?: string | null;
  geofenceState?: string | null;
  hasAssignedMessenger?: boolean;
  claimedAt?: string | null;
  startedAt?: string | null;
  closedAt?: string | null;
};

const SEARCHING_STATUSES = new Set([
  "REQUESTED",
  "OFFERED",
  "PENDING",
  "SEARCHING",
]);

const CANCELLED_STATUSES = new Set([
  "CANCELLED_BY_SYSTEM",
  "CANCELLED_BY_TRANSPORTER",
  "CANCELLED_BY_MESSENGER",
  "EXPIRED",
  "FAILED",
  "FAILED_PICKUP",
  "FAILED_DROPOFF",
  "NO_SHOW",
]);

function normalizeStatus(status: unknown): string {
  return String(status ?? "")
    .trim()
    .toUpperCase();
}

function normalizeGeofence(
  geofenceState: unknown,
): "AT_PICKUP" | "AT_DROPOFF" | null {
  const value = String(geofenceState ?? "")
    .trim()
    .toUpperCase();
  if (value === "AT_PICKUP" || value === "AT_DROPOFF") return value;
  return null;
}

function step(
  id: string,
  label: string,
  state: OperationalTimelineStepState,
  timestamp?: string | null,
): OperationalTimelineStep {
  const ts = timestamp?.trim();
  return {
    id,
    label,
    state,
    timestamp: ts && ts.length > 0 ? ts : undefined,
  };
}

export function formatTimelineTimestamp(iso?: string | null): string | null {
  if (iso == null || String(iso).trim() === "") return null;
  const ms = Date.parse(String(iso));
  if (!Number.isFinite(ms)) return null;
  try {
    return new Date(ms).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export function resolveOperationalTimeline(
  input: ResolveOperationalTimelineInput,
): OperationalTimelineStep[] {
  const status = normalizeStatus(input.status);
  const geofence = normalizeGeofence(input.geofenceState);
  const createdAt = input.createdAt ?? null;
  const claimedAt = input.claimedAt ?? null;
  const startedAt = input.startedAt ?? null;
  const closedAt = input.closedAt ?? null;

  if (status === "CLOSED") {
    return [
      step("created", "Solicitud creada", "done", createdAt),
      step("in_progress", "Servicio en curso", "done", startedAt),
      step("finished", "Servicio finalizado", "done", closedAt),
    ];
  }

  if (CANCELLED_STATUSES.has(status)) {
    return [
      step("created", "Solicitud creada", "done", createdAt),
      step("cancelled", "Servicio cancelado", "active"),
    ];
  }

  if (geofence === "AT_PICKUP") {
    return [
      step("created", "Solicitud creada", "done", createdAt),
      step("assigned", "Mensajero asignado", "done", claimedAt),
      step("at_pickup", "Llegó al punto de recogida", "active"),
      step("in_progress", "Servicio en curso", "pending"),
      step("finished", "Finalizado", "pending"),
    ];
  }

  if (geofence === "AT_DROPOFF") {
    return [
      step("created", "Solicitud creada", "done", createdAt),
      step("in_progress", "Servicio en curso", "done", startedAt),
      step("at_dropoff", "Llegó al destino", "active"),
      step("finished", "Finalizado", "pending"),
    ];
  }

  if (status === "STARTED") {
    return [
      step("created", "Solicitud creada", "done", createdAt),
      step("pickup_done", "Recogida completada", "done", startedAt),
      step("in_progress", "Servicio en curso", "active", startedAt),
      step("finished", "Finalizado", "pending"),
    ];
  }

  if (status === "CLAIMED") {
    return [
      step("created", "Solicitud creada", "done", createdAt),
      step("assigned", "Mensajero asignado", "done", claimedAt),
      step("en_route_pickup", "En camino al punto", "active"),
      step("in_progress", "Servicio en curso", "pending"),
      step("finished", "Finalizado", "pending"),
    ];
  }

  if (SEARCHING_STATUSES.has(status)) {
    return [
      step("created", "Solicitud creada", "done", createdAt),
      step("searching", "Buscando mensajero", "active"),
      step("in_progress", "Servicio en curso", "pending"),
      step("finished", "Finalizado", "pending"),
    ];
  }

  return [
    step("created", "Solicitud creada", "done", createdAt),
    step("searching", "Buscando mensajero", "active"),
    step("in_progress", "Servicio en curso", "pending"),
    step("finished", "Finalizado", "pending"),
  ];
}
