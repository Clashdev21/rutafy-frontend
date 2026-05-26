export type OperationalGeofenceState = "AT_PICKUP" | "AT_DROPOFF";

export type OperationalCopyAudience = "transportista" | "mensajero";

export type ResolveOperationalCopyInput = {
  serviceStatus?: string | null;
  geofenceState?: OperationalGeofenceState | null;
  /** Minutos formateados (p. ej. "8 min"); si se omite, se deriva de los ISO. */
  etaMinutes?: string | null;
  etaPickupAt?: string | null;
  etaDeliveryAt?: string | null;
  audience?: OperationalCopyAudience;
};

export type OperationalCopy = {
  title: string;
  subtitle: string;
  etaLabel: string | null;
};

export function formatOperationalEtaMinutes(iso?: string | null): string | null {
  if (iso == null || String(iso).trim() === "") return null;
  const targetMs = Date.parse(String(iso));
  if (!Number.isFinite(targetMs)) return null;
  const minutes = (targetMs - Date.now()) / 60_000;
  if (minutes <= 0) return null;
  if (minutes < 1) return "menos de 1 min";
  return `${Math.ceil(minutes)} min`;
}

function normalizeStatus(status: unknown): string {
  return String(status ?? "")
    .trim()
    .toUpperCase();
}

function withEtaPrefix(prefix: string, minutes: string | null | undefined): string | null {
  const m = minutes?.trim();
  if (!m) return null;
  return `${prefix} ~${m}`;
}

function resolvePickupEtaMinutes(input: ResolveOperationalCopyInput): string | null {
  return input.etaMinutes?.trim() || formatOperationalEtaMinutes(input.etaPickupAt);
}

function resolveDeliveryEtaMinutes(input: ResolveOperationalCopyInput): string | null {
  return input.etaMinutes?.trim() || formatOperationalEtaMinutes(input.etaDeliveryAt);
}

/**
 * Copy operativo por fase (transportista / mensajero).
 * Geofence tiene prioridad cuando se conecte en tiempo real; sin geofence:
 * CLAIMED → camino a recogida, STARTED → camino a entrega.
 */
export function resolveOperationalCopy(
  input: ResolveOperationalCopyInput,
): OperationalCopy {
  const status = normalizeStatus(input.serviceStatus);
  const geofence = input.geofenceState ?? null;
  const audience = input.audience ?? "transportista";

  const pickupMinutes = resolvePickupEtaMinutes(input);
  const deliveryMinutes = resolveDeliveryEtaMinutes(input);

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
      etaLabel: withEtaPrefix("Entrega estimada en", deliveryMinutes),
    };
  }

  if (status === "CLAIMED") {
    const pickupEta =
      audience === "mensajero"
        ? withEtaPrefix("Llegarás al punto de recogida en", pickupMinutes)
        : withEtaPrefix("Llegada al punto de recogida en", pickupMinutes);

    return {
      title: audience === "mensajero" ? "Servicio asignado" : "Mensajero asignado",
      subtitle:
        audience === "mensajero"
          ? "Dirígete al punto de recogida"
          : "El mensajero se dirige al punto de recogida",
      etaLabel: pickupEta,
    };
  }

  return {
    title: "",
    subtitle: "",
    etaLabel: null,
  };
}
