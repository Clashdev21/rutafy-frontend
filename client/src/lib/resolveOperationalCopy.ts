export type OperationalGeofenceState = "AT_PICKUP" | "AT_DROPOFF";

export type OperationalCopyAudience = "transportista" | "mensajero";

export type ResolveOperationalCopyInput = {
  serviceStatus?: string | null;
  geofenceState?: OperationalGeofenceState | null;
  /** Duración estática de ruta (dispatch); no usar timestamps ISO para countdown. */
  estimatedRouteDurationMinutes?: number | string | null;
  audience?: OperationalCopyAudience;
};

export type OperationalCopy = {
  title: string;
  subtitle: string;
  etaLabel: string | null;
};

/** Countdown hacia ISO; no usar en copy operacional principal. */
export function formatOperationalEtaMinutes(iso?: string | null): string | null {
  if (iso == null || String(iso).trim() === "") return null;
  const targetMs = Date.parse(String(iso));
  if (!Number.isFinite(targetMs)) return null;
  const minutes = (targetMs - Date.now()) / 60_000;
  if (minutes <= 0) return null;
  if (minutes < 1) return "menos de 1 min";
  return `${Math.ceil(minutes)} min`;
}

/** Minutos fijos desde `estimated_route_duration_minutes` (sin Date.now()). */
export function formatStaticRouteDurationMinutes(
  value?: number | string | null,
): string | null {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const minutes = Math.ceil(n);
  if (minutes < 1) return "menos de 1 min";
  return `${minutes} min`;
}

function normalizeStatus(status: unknown): string {
  return String(status ?? "")
    .trim()
    .toUpperCase();
}

function withStaticOperationalEtaLabel(
  prefix: string,
  minutes: string | null | undefined,
): string | null {
  const m = minutes?.trim();
  if (!m) return null;
  return `${prefix} ~${m}`;
}

/**
 * Copy operativo por fase (transportista / mensajero).
 * Geofence tiene prioridad cuando se conecte en tiempo real; sin geofence:
 * CLAIMED → camino a recogida, STARTED → camino a entrega.
 * ETA numérico: solo duración estática de ruta, sin countdown.
 */
export function resolveOperationalCopy(
  input: ResolveOperationalCopyInput,
): OperationalCopy {
  const status = normalizeStatus(input.serviceStatus);
  const geofence = input.geofenceState ?? null;
  const audience = input.audience ?? "transportista";

  const staticRouteMinutes = formatStaticRouteDurationMinutes(
    input.estimatedRouteDurationMinutes,
  );

  if (geofence === "AT_PICKUP") {
    return {
      title: audience === "mensajero" ? "En punto de recogida" : "Mensajero asignado",
      subtitle:
        audience === "mensajero"
          ? "Has llegado al punto de recogida"
          : "El mensajero llegó al punto de recogida",
      etaLabel: "Recogiendo documentos",
    };
  }

  if (geofence === "AT_DROPOFF") {
    return {
      title: "Servicio en curso",
      subtitle:
        audience === "mensajero"
          ? "Has llegado al punto de entrega"
          : "El mensajero llegó al punto de entrega",
      etaLabel: "Finalizando servicio",
    };
  }

  if (status === "STARTED") {
    return {
      title: "Servicio en curso",
      subtitle:
        audience === "mensajero"
          ? "Ve en camino al destino"
          : "El mensajero va en camino al destino",
      etaLabel: withStaticOperationalEtaLabel(
        "Tiempo estimado de trayecto:",
        staticRouteMinutes,
      ),
    };
  }

  if (status === "CLAIMED") {
    return {
      title: audience === "mensajero" ? "Servicio asignado" : "Mensajero asignado",
      subtitle:
        audience === "mensajero"
          ? "Dirígete al punto de recogida"
          : "El mensajero se dirige al punto de recogida",
      etaLabel: withStaticOperationalEtaLabel(
        "Tiempo estimado hacia recogida:",
        staticRouteMinutes,
      ),
    };
  }

  return {
    title: "",
    subtitle: "",
    etaLabel: null,
  };
}
