import type { BackendService } from "@/hooks/useMessengerOperationalState";
import type { ServiceEvidence } from "@/hooks/useMessengerOperationalState";
import {
  formatServiceRouteEndpoint,
  parseServiceRouteCoords,
} from "@/lib/formatOperationalLocation";
import type { OperationalGeofenceState } from "@/lib/resolveOperationalCopy";
import { formatStaticRouteDurationMinutes } from "@/lib/resolveOperationalCopy";
import {
  formatOperationalDistance,
  haversineDistanceMeters,
} from "@/lib/resolveOperationalDistance";
import { resolveOperationalProximity } from "@/lib/resolveOperationalProximity";

type ServiceWithExtras = BackendService & {
  fare_amount?: number | string | null;
  fare_currency?: string | null;
  estimated_route_duration_minutes?: number | string | null;
  claimed_at?: string | null;
  started_at?: string | null;
  closed_at?: string | null;
};

function toOptionalString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function getMessengerOrigin(service: BackendService): string {
  return formatServiceRouteEndpoint(
    service.origin,
    service.meta ?? undefined,
    "origin",
    "Origen",
  );
}

export function getMessengerDestination(service: BackendService): string {
  return formatServiceRouteEndpoint(
    service.destination,
    service.meta ?? undefined,
    "destination",
    "Destino",
  );
}

/** Etiqueta corta para UI tipo Uber (SPIA, CDR Yumbo). */
export function getShortRouteLabel(service: BackendService, which: "origin" | "destination"): string {
  const full = which === "origin" ? getMessengerOrigin(service) : getMessengerDestination(service);
  const parts = full.split(/[·,]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return full;
  const first = parts[0];
  if (first.length <= 24) return first;
  return `${first.slice(0, 22)}…`;
}

export function resolveServiceContainerRef(service: BackendService): string | null {
  const meta = service.meta ?? {};
  return (
    toOptionalString(meta.container_number) ??
    toOptionalString(meta.container_id) ??
    toOptionalString(meta.container_code) ??
    toOptionalString(meta.node_reference) ??
    toOptionalString(meta.reference) ??
    null
  );
}

export function formatMessengerFare(service: BackendService): string | null {
  const ext = service as ServiceWithExtras;
  const meta = service.meta ?? {};
  const amount =
    toFiniteNumber(ext.fare_amount) ??
    toFiniteNumber(meta.fare_amount) ??
    toFiniteNumber(meta.estimated_fare) ??
    toFiniteNumber(meta.price);
  if (amount == null || amount <= 0) return null;

  const currency =
    toOptionalString(ext.fare_currency) ??
    toOptionalString(meta.fare_currency) ??
    toOptionalString(meta.currency) ??
    "COP";

  if (currency.toUpperCase() === "COP") {
    return `$${Math.round(amount).toLocaleString("es-CO")}`;
  }
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`;
}

export function resolveMessengerRouteDistance(
  service: BackendService,
  messengerLat?: number | null,
  messengerLng?: number | null,
  locationFresh?: boolean,
): string | null {
  const origin = parseServiceRouteCoords(service, "origin");
  const destination = parseServiceRouteCoords(service, "destination");

  if (origin && destination) {
    const meters = haversineDistanceMeters(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng,
    );
    const km = Math.round(meters / 1000);
    if (km >= 1) return `${km} km`;
    return formatOperationalDistance(meters).replace(/^~/, "");
  }

  if (locationFresh && messengerLat != null && messengerLng != null && origin) {
    const meters = haversineDistanceMeters(
      messengerLat,
      messengerLng,
      origin.lat,
      origin.lng,
    );
    const km = Math.round(meters / 1000);
    if (km >= 1) return `${km} km`;
    return formatOperationalDistance(meters).replace(/^~/, "");
  }

  return null;
}

export function resolveMessengerEtaMinutes(service: BackendService): string | null {
  const ext = service as ServiceWithExtras;
  const meta = service.meta ?? {};
  const minutes =
    formatStaticRouteDurationMinutes(ext.estimated_route_duration_minutes) ??
    formatStaticRouteDurationMinutes(meta.estimated_route_duration_minutes) ??
    formatStaticRouteDurationMinutes(meta.eta_minutes);
  return minutes;
}

export function resolveMessengerZoneLabel(
  services: BackendService[],
  metaZone?: string | null,
): string {
  const zone = metaZone?.trim();
  if (zone) return zone;

  for (const svc of services) {
    const origin = getMessengerOrigin(svc);
    const match = origin.match(/Buenaventura|Yumbo|Cali|Bogotá|Medellín/i);
    if (match) return match[0];
    const short = getShortRouteLabel(svc, "origin");
    if (short && short !== "Origen") return short;
  }

  return "Tu zona";
}

export function formatRelativeTimeEs(iso?: string | null): string {
  if (iso == null || String(iso).trim() === "") return "—";
  const ms = Date.parse(String(iso));
  if (!Number.isFinite(ms)) return "—";
  const diff = Date.now() - ms;
  if (diff < 0) return "Ahora";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "Hace 1 hora" : `Hace ${hours} horas`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Hace 1 día" : `Hace ${days} días`;
}

export type MessengerJourneyNode = {
  key: string;
  label: string;
  completed: boolean;
  current: boolean;
};

export function resolveMessengerJourneyNodes(
  service: BackendService,
  geofenceState?: OperationalGeofenceState | null,
  serviceStatus?: string,
): MessengerJourneyNode[] {
  const origin = getShortRouteLabel(service, "origin");
  const destination = getShortRouteLabel(service, "destination");
  const status = String(serviceStatus ?? service.status ?? "").toUpperCase();
  const geofence = geofenceState ?? null;

  const nodes: MessengerJourneyNode[] = [
    { key: "puerto", label: origin || "Puerto", completed: false, current: false },
    { key: "ruta", label: "Ruta", completed: false, current: false },
    { key: "transit", label: destination.split(" ")[0] || "Tránsito", completed: false, current: false },
    { key: "cdr", label: destination || "CDR", completed: false, current: false },
  ];

  if (status === "CLAIMED") {
    if (geofence === "AT_PICKUP") {
      nodes[0].completed = true;
      nodes[0].current = false;
      nodes[1].current = true;
    } else {
      nodes[0].current = true;
    }
    return nodes;
  }

  if (status === "STARTED") {
    nodes[0].completed = true;
    if (geofence === "AT_DROPOFF") {
      nodes[1].completed = true;
      nodes[2].completed = true;
      nodes[3].current = true;
    } else {
      nodes[1].current = true;
      nodes[2].completed = false;
    }
    return nodes;
  }

  nodes[0].current = true;
  return nodes;
}

export function resolveMessengerJourneyPercent(
  service: BackendService,
  geofenceState?: OperationalGeofenceState | null,
  messengerLat?: number | null,
  messengerLng?: number | null,
  locationFresh?: boolean,
): number {
  const status = String(service.status ?? "").toUpperCase();
  const geofence = geofenceState ?? null;

  if (geofence === "AT_DROPOFF") return 92;
  if (geofence === "AT_PICKUP") return 28;

  const proximity = resolveOperationalProximity({
    serviceStatus: service.status,
    geofenceState,
    messengerLat,
    messengerLng,
    originLat: parseServiceRouteCoords(service, "origin")?.lat,
    originLng: parseServiceRouteCoords(service, "origin")?.lng,
    destinationLat: parseServiceRouteCoords(service, "destination")?.lat,
    destinationLng: parseServiceRouteCoords(service, "destination")?.lng,
    locationUpdatedAt: locationFresh ? new Date().toISOString() : null,
  });

  if (status === "STARTED" && proximity) {
    return Math.round(45 + proximity.progress * 45);
  }
  if (status === "CLAIMED" && proximity) {
    return Math.round(8 + proximity.progress * 20);
  }
  if (status === "STARTED") return 55;
  if (status === "CLAIMED") return 15;
  return 5;
}

export type MessengerLogisticsStep = {
  id: string;
  time: string;
  label: string;
  done: boolean;
};

const EVIDENCE_KIND_LABELS: Record<string, string> = {
  PORT_ENTRY: "Ingreso puerto",
  PORT_INGRESS: "Ingreso puerto",
  MODULE: "Módulo",
  MODULE_CHECK: "Módulo",
  PORT_EXIT: "Salida",
  EXIT: "Salida",
  PICKUP: "Recogida",
  DROPOFF: "Entrega",
  DELIVERY: "Entrega",
  PHOTO: "Evidencia",
};

function formatLogisticsTime(iso?: string | null): string {
  if (iso == null || String(iso).trim() === "") return "—:—";
  const ms = Date.parse(String(iso));
  if (!Number.isFinite(ms)) return "—:—";
  try {
    return new Date(ms).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—:—";
  }
}

export function resolveMessengerLogisticsTimeline(
  service: BackendService,
  evidences: ServiceEvidence[],
  geofenceState?: OperationalGeofenceState | null,
): MessengerLogisticsStep[] {
  const ext = service as ServiceWithExtras;
  const meta = service.meta ?? {};
  const metaEvents = meta.logistics_events ?? meta.logistics_timeline;
  if (Array.isArray(metaEvents) && metaEvents.length > 0) {
    return metaEvents.map((ev: unknown, i: number) => {
      const rec = ev && typeof ev === "object" ? (ev as Record<string, unknown>) : {};
      const label =
        toOptionalString(rec.label) ??
        toOptionalString(rec.name) ??
        `Paso ${i + 1}`;
      const at = toOptionalString(rec.at) ?? toOptionalString(rec.timestamp);
      const done = rec.done === true || rec.completed === true;
      return {
        id: `meta-${i}`,
        time: formatLogisticsTime(at),
        label,
        done,
      };
    });
  }

  const steps: MessengerLogisticsStep[] = [];
  const sorted = [...evidences].sort((a, b) => {
    const ta = Date.parse(a.created_at ?? "");
    const tb = Date.parse(b.created_at ?? "");
    return ta - tb;
  });

  for (const ev of sorted) {
    const kind = String(ev.kind ?? "").trim().toUpperCase();
    const label =
      EVIDENCE_KIND_LABELS[kind] ??
      (ev.note?.trim() ? ev.note.trim() : kind ? kind.replace(/_/g, " ") : "Captura");
    steps.push({
      id: ev.evidence_id,
      time: formatLogisticsTime(ev.taken_at_client ?? ev.created_at),
      label,
      done: true,
    });
  }

  if (steps.length === 0) {
    if (ext.started_at) {
      steps.push({
        id: "started",
        time: formatLogisticsTime(ext.started_at),
        label: "Ingreso puerto",
        done: true,
      });
    }
    if (geofenceState === "AT_PICKUP" || service.status === "STARTED") {
      steps.push({
        id: "module",
        time: formatLogisticsTime(ext.started_at),
        label: "Módulo",
        done: service.status === "STARTED",
      });
    }
    if (geofenceState === "AT_DROPOFF") {
      steps.push({
        id: "exit",
        time: formatLogisticsTime(ext.closed_at),
        label: "Salida",
        done: false,
      });
    }
  }

  if (steps.length === 0) {
    return [
      { id: "pending-1", time: "—:—", label: "Ingreso puerto", done: false },
      { id: "pending-2", time: "—:—", label: "Módulo", done: false },
      { id: "pending-3", time: "—:—", label: "Salida", done: false },
    ];
  }

  return steps;
}

export function getCompletedHistoryLabel(status: string): string {
  switch (status) {
    case "CLOSED":
      return "Completado";
    case "CANCELLED_BY_MESSENGER":
      return "Cancelado";
    case "CANCELLED_BY_TRANSPORTER":
      return "Cancelado";
    case "EXPIRED":
      return "Expirado";
    case "FAILED_PICKUP":
    case "FAILED_DROPOFF":
    case "NO_SHOW":
      return "Incidencia";
    default:
      return status;
  }
}
