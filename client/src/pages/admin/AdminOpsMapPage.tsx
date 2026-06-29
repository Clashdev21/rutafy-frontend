import {
  getAdminOpsMapSnapshot,
  serviceHasSlaBreach,
  type OpsMapMessenger,
  type OpsMapService,
  type OpsMessengerState,
} from "@/api/admin-ops-map";
import {
  getAdminOpsServiceDetail,
  type AdminOpsServiceDetail,
  type OpsServiceLocation,
  type OpsServiceTimelineEvent,
} from "@/api/admin-ops-service";
import { GeofenceBadge } from "@/components/admin/GeofenceBadge";
import { MessengerOpsSummaryBar } from "@/components/admin/MessengerOpsSummaryBar";
import { OpsIncidentsPanel } from "@/components/admin/OpsIncidentsPanel";
import { OperationalStatusBadges } from "@/components/admin/OperationalStatusBadges";
import { MapView } from "@/components/Map";
import { OperationalLocationDisplay } from "@/components/OperationalLocationDisplay";
import { formatOperationalLocationBlock } from "@/lib/formatOperationalLocation";
import {
  MAP_VISIBLE_OPERATIONAL_STATUSES,
  OPS_MAP_CENTER,
  OPS_MAP_DEFAULT_ZOOM,
  OPS_MESSENGER_PIN_COLORS,
  OPS_MESSENGER_STATE_LABELS,
  OPERATIONAL_FLOW_POLYLINE_COLORS,
  OPERATIONAL_STATUS_LABELS,
  OPERATIONAL_STATUS_PIN_COLORS,
  normalizeOperationalStatus,
  type OperationalStatus,
} from "@/lib/adminOpsConstants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { List, Package, RefreshCw, Wifi, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 30_000;

function getOpsMapServiceIdFromSearch(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("service_id");
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const MAP_DEFAULT_CENTER = OPS_MAP_CENTER;
const MAP_DEFAULT_ZOOM = OPS_MAP_DEFAULT_ZOOM;

const OPS_PIN_COLORS = OPS_MESSENGER_PIN_COLORS;
const OPS_STATE_LABELS = OPS_MESSENGER_STATE_LABELS;

const LEGEND_ITEMS: { state: OpsMessengerState; label: string }[] = [
  { state: "AVAILABLE", label: "Disponible" },
  { state: "ASSIGNED", label: "Asignado" },
  { state: "IN_SERVICE", label: "En servicio" },
  { state: "BUSY_IDLE", label: "Busy idle" },
];

const SERVICE_LEGEND_ITEMS: { status: OperationalStatus; label: string }[] =
  MAP_VISIBLE_OPERATIONAL_STATUSES.map((status) => ({
    status,
    label: OPERATIONAL_STATUS_LABELS[status],
  }));

type ServiceStuckLevel = "ALERT" | "WARN" | "NORMAL";

const SERVICE_PIN_LABEL: Record<OperationalStatus, string> = {
  REQUESTED: "R",
  CLAIMED: "C",
  STARTED: "S",
  CLOSED: "X",
};

type MapMarkerEntry = {
  marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker;
  kind: "advanced" | "classic";
  opsState: OpsMessengerState;
};

type MapServiceMarkerEntry = {
  marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker;
  kind: "advanced" | "classic";
  operationalStatus: OperationalStatus;
  hasSlaBreach: boolean;
};

function opsStateBadgeClass(state: OpsMessengerState): string {
  switch (state) {
    case "AVAILABLE":
      return "bg-green-100 text-green-700 border-green-200";
    case "ASSIGNED":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "IN_SERVICE":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "BUSY_IDLE":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "OFFLINE":
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function truncateId(id: string, maxLen = 10): string {
  const trimmed = id.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}…`;
}

function hasValidCoords(m: OpsMapMessenger): boolean {
  const lat = m.lat ?? m.map_lat;
  const lng = m.lng ?? m.map_lng;
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

function getMessengerCoords(
  m: OpsMapMessenger,
): google.maps.LatLngLiteral | null {
  const lat = m.lat ?? m.map_lat;
  const lng = m.lng ?? m.map_lng;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

function formatMessengerCoords(m: OpsMapMessenger): string | null {
  const coords = getMessengerCoords(m);
  if (!coords) return null;
  return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
}

function locationToPosition(
  loc: OpsServiceLocation | null | undefined,
): google.maps.LatLngLiteral | null {
  if (loc == null || loc.lat == null || loc.lng == null) return null;
  const lat = typeof loc.lat === "number" ? loc.lat : Number(loc.lat);
  const lng = typeof loc.lng === "number" ? loc.lng : Number(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function normalizeStuckLevel(raw: unknown): ServiceStuckLevel {
  const value = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (value === "ALERT" || value === "WARN") return value;
  return "NORMAL";
}

function getServiceStuckLevel(service: OpsMapService): ServiceStuckLevel {
  if (serviceHasSlaBreach(service)) return "ALERT";
  return normalizeStuckLevel(service.operational_flags?.stuck_level);
}

function formatServiceSlaBreachLabel(service: OpsMapService): string | null {
  const flags = service.operational_flags;
  const parts: string[] = [];
  if (flags?.sla_pickup_breach) parts.push("recogida");
  if (flags?.sla_delivery_breach) parts.push("entrega");
  if (parts.length === 0) return null;
  return `SLA vencido · ${parts.join(" / ")}`;
}

function getServiceOperationalStatus(service: OpsMapService): OperationalStatus {
  return (
    normalizeOperationalStatus(service.status) ?? "REQUESTED"
  );
}

function getServiceMapPosition(
  service: OpsMapService,
): google.maps.LatLngLiteral | null {
  return (
    locationToPosition(service.origin) ?? locationToPosition(service.destination)
  );
}

function getServiceMarkerTitle(service: OpsMapService): string {
  const company = service.company_name?.trim() || "—";
  const short = service.service_short?.trim() || truncateId(service.service_id);
  const op = getServiceOperationalStatus(service);
  const dispatch = service.dispatch_status?.trim() || "—";
  const stuck = service.operational_flags?.stuck_level?.trim() || "NORMAL";
  const sla = formatServiceSlaBreachLabel(service);
  const lines = [
    short,
    `OP ${OPERATIONAL_STATUS_LABELS[op]} · DSP ${dispatch}`,
    `Transportista: ${company}`,
    `Stuck: ${stuck}`,
  ];
  if (sla) lines.push(sla);
  const originLabel = service.origin?.label?.trim();
  const destLabel = service.destination?.label?.trim();
  if (originLabel) lines.push(`Origen: ${originLabel}`);
  if (destLabel) lines.push(`Destino: ${destLabel}`);
  return lines.join("\n");
}

function findMessengerForService(
  service: OpsMapService,
  messengers: OpsMapMessenger[],
): OpsMapMessenger | null {
  const id = String(
    service.assigned_messenger_id ?? service.mensajero_id ?? "",
  ).trim();
  if (!id) return null;
  return messengers.find((m) => m.messenger_id === id) ?? null;
}

function clearOperationalFlowOverlay(
  polylineRef: React.MutableRefObject<google.maps.Polyline | null>,
): void {
  if (polylineRef.current) {
    polylineRef.current.setMap(null);
    polylineRef.current = null;
  }
}

function syncOperationalFlowOverlay({
  map,
  service,
  messengers,
  polylineRef,
}: {
  map: google.maps.Map;
  service: OpsMapService;
  messengers: OpsMapMessenger[];
  polylineRef: React.MutableRefObject<google.maps.Polyline | null>;
}): void {
  clearOperationalFlowOverlay(polylineRef);

  const status = normalizeOperationalStatus(service.status);
  const originPos = locationToPosition(service.origin);
  const destinationPos = locationToPosition(service.destination);

  let path: google.maps.LatLngLiteral[] | null = null;
  let strokeColor: string | null = null;

  if (status === "CLAIMED") {
    const messenger = findMessengerForService(service, messengers);
    const messengerPos = messenger ? getMessengerCoords(messenger) : null;
    if (messengerPos && originPos) {
      path = [messengerPos, originPos];
      strokeColor = OPERATIONAL_FLOW_POLYLINE_COLORS.CLAIMED;
    }
  } else if (status === "STARTED" && originPos && destinationPos) {
    path = [originPos, destinationPos];
    strokeColor = OPERATIONAL_FLOW_POLYLINE_COLORS.STARTED;
  }

  if (!path || path.length < 2 || !strokeColor) return;

  polylineRef.current = new google.maps.Polyline({
    map,
    path,
    geodesic: true,
    strokeColor,
    strokeOpacity: 0.95,
    strokeWeight: 5,
    zIndex: 9997,
    clickable: false,
  });
}

function isGhostMessenger(m: OpsMapMessenger): boolean {
  return (
    m.ops_state === "BUSY_IDLE" &&
    m.is_online === false &&
    m.active_service == null
  );
}

function getMessengerDisplayName(m: OpsMapMessenger): string {
  return (
    m.full_name?.trim() ||
    m.phone?.trim() ||
    m.messenger_id
  );
}

function getMarkerTitle(m: OpsMapMessenger): string {
  return `${getMessengerDisplayName(m)} · ${OPS_STATE_LABELS[m.ops_state]}`;
}

function displayText(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const s = String(value).trim();
  return s.length > 0 ? s : "—";
}

function displayBool(value: boolean | null | undefined): string {
  if (value === true) return "Sí";
  if (value === false) return "No";
  return "—";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return value;
  return new Date(ms).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatTimelineEventTitle(ev: OpsServiceTimelineEvent): string {
  if (ev.from_status && ev.to_status) {
    return `${ev.from_status} → ${ev.to_status}`;
  }
  return displayText(ev.to_status ?? ev.from_status);
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p
        className={cn(
          "text-sm text-gray-800 break-words",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function OpsServiceDetailDialog({
  open,
  onOpenChange,
  loading,
  error,
  detail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  detail: AdminOpsServiceDetail | null;
}) {
  const flags = detail?.operational_flags;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1E3A5F]">
            Detalle operacional del servicio
          </DialogTitle>
          {detail ? (
            <p
              className="text-xs font-mono text-gray-500 break-all"
              title={detail.service_id}
            >
              {detail.service_id}
            </p>
          ) : null}
        </DialogHeader>

        <ServiceRouteLegend />

        {loading ? (
          <p className="text-sm text-gray-500 py-6 text-center">Cargando detalle…</p>
        ) : error ? (
          <p className="text-sm text-red-600 py-4">{error}</p>
        ) : detail ? (
          <div className="space-y-4 text-sm">
            <OperationalStatusBadges
              status={detail.status}
              dispatchStatus={detail.dispatch_status}
            />
            <GeofenceBadge geofenceState={detail.geofence_state} />
            <div className="grid grid-cols-2 gap-3">
              <DetailField
                label="Tipo"
                value={displayText(detail.service_type)}
              />
            </div>

            <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
              <p className="text-xs font-semibold text-[#1E3A5F]">Ruta</p>
              <DetailField
                label="Origen"
                value={formatOperationalLocationBlock(detail.origin)}
              />
              <DetailField
                label="Destino"
                value={formatOperationalLocationBlock(detail.destination)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailField
                label="Transportista"
                value={displayText(detail.company?.name)}
              />
              <DetailField
                label="Tel. transportista"
                value={displayText(detail.company?.phone)}
              />
              <DetailField
                label="Mensajero"
                value={displayText(detail.messenger?.full_name)}
              />
              <DetailField
                label="Tel. mensajero"
                value={displayText(detail.messenger?.phone)}
              />
            </div>

            <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
              <p className="text-xs font-semibold text-[#1E3A5F]">SLA</p>
              <div className="grid grid-cols-2 gap-3">
                <DetailField
                  label="ETA recogida"
                  value={formatDateTime(detail.sla?.eta_pickup_at)}
                />
                <DetailField
                  label="ETA entrega"
                  value={formatDateTime(detail.sla?.eta_delivery_at)}
                />
                <DetailField
                  label="Deadline recogida"
                  value={formatDateTime(detail.sla?.sla_pickup_deadline_at)}
                />
                <DetailField
                  label="Deadline entrega"
                  value={formatDateTime(detail.sla?.sla_delivery_deadline_at)}
                />
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
              <p className="text-xs font-semibold text-[#1E3A5F]">Flags operacionales</p>
              <div className="grid grid-cols-2 gap-3">
                <DetailField
                  label="Stuck level"
                  value={displayText(flags?.stuck_level)}
                />
                <DetailField
                  label="Edad (min)"
                  value={displayText(flags?.age_min)}
                />
                <DetailField
                  label="Idle (min)"
                  value={displayText(flags?.idle_min)}
                />
                <DetailField
                  label="Alertas abiertas"
                  value={displayText(flags?.open_alerts)}
                />
                <DetailField
                  label="SLA recogida breach"
                  value={displayBool(flags?.sla_pickup_breach)}
                />
                <DetailField
                  label="SLA entrega breach"
                  value={displayBool(flags?.sla_delivery_breach)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#1E3A5F]">Timeline</p>
              {detail.timeline.length === 0 ? (
                <p className="text-xs text-gray-400">Sin eventos recientes</p>
              ) : (
                <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {detail.timeline.map((ev, index) => (
                    <li
                      key={`${ev.history_id ?? ""}-${ev.created_at ?? ""}-${index}`}
                      className="rounded-md border border-gray-100 bg-white px-3 py-2 text-xs"
                    >
                      <p className="font-medium text-gray-800">
                        {formatTimelineEventTitle(ev)}
                      </p>
                      {ev.note ? (
                        <p className="text-gray-600 mt-0.5">{ev.note}</p>
                      ) : null}
                      <p className="text-gray-400 mt-1">
                        {formatDateTime(ev.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function canUseAdvancedMarkers(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.google?.maps?.marker?.AdvancedMarkerElement)
  );
}

function clearMarker(
  marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker,
): void {
  if (
    "setMap" in marker &&
    typeof (marker as google.maps.Marker).setMap === "function"
  ) {
    (marker as google.maps.Marker).setMap(null);
    return;
  }
  (marker as google.maps.marker.AdvancedMarkerElement).map = null;
}

function detachMarker(entry: MapMarkerEntry | MapServiceMarkerEntry): void {
  clearMarker(entry.marker);
}

const SERVICE_POLYLINE_NORMAL = "#64748b";
const SERVICE_POLYLINE_BREACH = "#ef4444";

function ServiceRouteLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
          style={{ backgroundColor: "#16a34a" }}
        >
          O
        </span>
        Origen
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
          style={{ backgroundColor: "#7c3aed" }}
        >
          D
        </span>
        Destino
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-1 w-6 shrink-0 rounded-full"
          style={{ backgroundColor: SERVICE_POLYLINE_BREACH }}
        />
        Línea roja = SLA vencido
      </span>
    </div>
  );
}

type ServiceOverlayMarker = google.maps.marker.AdvancedMarkerElement;

type ServiceOverlayState = {
  origin: ServiceOverlayMarker | null;
  destination: ServiceOverlayMarker | null;
};

function createServicePinElement(label: string, color: string): HTMLDivElement {
  const div = document.createElement("div");
  div.textContent = label;
  div.style.width = "34px";
  div.style.height = "34px";
  div.style.borderRadius = "9999px";
  div.style.backgroundColor = color;
  div.style.color = "white";
  div.style.fontWeight = "800";
  div.style.display = "flex";
  div.style.alignItems = "center";
  div.style.justifyContent = "center";
  div.style.border = "3px solid white";
  div.style.boxShadow = "0 2px 10px rgba(0,0,0,0.4)";
  div.style.fontSize = "14px";
  div.style.lineHeight = "1";
  div.style.transform = "translate(-50%, -50%)";
  return div;
}

function createServiceAdvancedMarker(
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  label: string,
  title: string,
  color: string,
  zIndex = 9999,
): ServiceOverlayMarker {
  const div = createServicePinElement(label, color);
  return new window.google!.maps!.marker!.AdvancedMarkerElement({
    map,
    position,
    title,
    content: div,
    zIndex,
  });
}

function clearServiceOverlay(
  overlayRef: React.MutableRefObject<ServiceOverlayState>,
  polylineRef: React.MutableRefObject<google.maps.Polyline | null>,
): void {
  if (overlayRef.current.origin) {
    overlayRef.current.origin.map = null;
  }
  if (overlayRef.current.destination) {
    overlayRef.current.destination.map = null;
  }
  overlayRef.current = { origin: null, destination: null };

  if (polylineRef.current) {
    polylineRef.current.setMap(null);
    polylineRef.current = null;
  }
}

function ensureProjectionBridge(
  map: google.maps.Map,
  bridgeRef: React.MutableRefObject<google.maps.OverlayView | null>,
): google.maps.OverlayView {
  if (!bridgeRef.current) {
    class ProjectionBridge extends google.maps.OverlayView {
      onAdd(): void {}
      draw(): void {}
      onRemove(): void {}
    }
    const bridge = new ProjectionBridge();
    bridge.setMap(map);
    bridgeRef.current = bridge;
  } else if (bridgeRef.current.getMap() !== map) {
    bridgeRef.current.setMap(map);
  }
  return bridgeRef.current;
}

function latLngToOverlayPixel(
  bridge: google.maps.OverlayView,
  latLng: google.maps.LatLngLiteral,
): { x: number; y: number } | null {
  const projection = bridge.getProjection();
  if (!projection) return null;
  const point = projection.fromLatLngToDivPixel(
    new google.maps.LatLng(latLng.lat, latLng.lng),
  );
  if (!point) return null;
  return { x: point.x, y: point.y };
}

function clearServiceHtmlOverlay(
  layerRef: React.RefObject<HTMLDivElement | null>,
  cleanupRef: React.MutableRefObject<(() => void) | null>,
  projectionBridgeRef: React.MutableRefObject<google.maps.OverlayView | null>,
): void {
  cleanupRef.current?.();
  cleanupRef.current = null;
  if (layerRef.current) {
    layerRef.current.replaceChildren();
  }
  if (projectionBridgeRef.current) {
    projectionBridgeRef.current.setMap(null);
    projectionBridgeRef.current = null;
  }
}

function createHtmlRoutePin(label: string, color: string): HTMLDivElement {
  const pin = createServicePinElement(label, color);
  pin.style.position = "absolute";
  pin.style.left = "0";
  pin.style.top = "0";
  pin.style.margin = "0";
  pin.style.pointerEvents = "none";
  return pin;
}

function syncServiceHtmlOverlay(
  map: google.maps.Map,
  layerEl: HTMLDivElement,
  originPos: google.maps.LatLngLiteral | null,
  destPos: google.maps.LatLngLiteral | null,
  hasSlaBreach: boolean,
  cleanupRef: React.MutableRefObject<(() => void) | null>,
  projectionBridgeRef: React.MutableRefObject<google.maps.OverlayView | null>,
): void {
  cleanupRef.current?.();
  cleanupRef.current = null;
  layerEl.replaceChildren();

  if (!originPos && !destPos) return;

  const bridge = ensureProjectionBridge(map, projectionBridgeRef);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.position = "absolute";
  svg.style.inset = "0";
  svg.style.overflow = "visible";
  svg.style.pointerEvents = "none";

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("stroke-width", "6");
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute(
    "stroke",
    hasSlaBreach ? SERVICE_POLYLINE_BREACH : SERVICE_POLYLINE_NORMAL,
  );
  line.setAttribute("opacity", "0.95");

  let originPin: HTMLDivElement | null = null;
  let destPin: HTMLDivElement | null = null;

  if (originPos) {
    originPin = createHtmlRoutePin("O", "#16a34a");
    layerEl.appendChild(originPin);
  }
  if (destPos) {
    destPin = createHtmlRoutePin("D", "#7c3aed");
    layerEl.appendChild(destPin);
  }
  if (originPos && destPos) {
    svg.appendChild(line);
    layerEl.appendChild(svg);
  }

  const positionOverlay = () => {
    const o = originPos ? latLngToOverlayPixel(bridge, originPos) : null;
    const d = destPos ? latLngToOverlayPixel(bridge, destPos) : null;

    if (originPin && o) {
      originPin.style.transform = `translate(${o.x}px, ${o.y}px) translate(-50%, -50%)`;
    }
    if (destPin && d) {
      destPin.style.transform = `translate(${d.x}px, ${d.y}px) translate(-50%, -50%)`;
    }
    if (o && d) {
      line.setAttribute("x1", String(o.x));
      line.setAttribute("y1", String(o.y));
      line.setAttribute("x2", String(d.x));
      line.setAttribute("y2", String(d.y));
    }
  };

  const listeners: google.maps.MapsEventListener[] = [
    map.addListener("idle", positionOverlay),
    map.addListener("zoom_changed", positionOverlay),
    map.addListener("center_changed", positionOverlay),
    map.addListener("bounds_changed", positionOverlay),
  ];

  positionOverlay();
  google.maps.event.addListenerOnce(map, "idle", positionOverlay);

  cleanupRef.current = () => {
    for (const listener of listeners) {
      google.maps.event.removeListener(listener);
    }
    layerEl.replaceChildren();
  };
}

function clearAllServiceVisuals(
  overlayRef: React.MutableRefObject<ServiceOverlayState>,
  polylineRef: React.MutableRefObject<google.maps.Polyline | null>,
  htmlLayerRef: React.RefObject<HTMLDivElement | null>,
  htmlCleanupRef: React.MutableRefObject<(() => void) | null>,
  projectionBridgeRef: React.MutableRefObject<google.maps.OverlayView | null>,
): void {
  clearServiceOverlay(overlayRef, polylineRef);
  clearServiceHtmlOverlay(htmlLayerRef, htmlCleanupRef, projectionBridgeRef);
}

function syncServiceOverlay(
  map: google.maps.Map,
  detail: AdminOpsServiceDetail,
  overlayRef: React.MutableRefObject<ServiceOverlayState>,
  polylineRef: React.MutableRefObject<google.maps.Polyline | null>,
  htmlLayerRef: React.RefObject<HTMLDivElement | null>,
  htmlCleanupRef: React.MutableRefObject<(() => void) | null>,
  projectionBridgeRef: React.MutableRefObject<google.maps.OverlayView | null>,
): void {
  clearAllServiceVisuals(
    overlayRef,
    polylineRef,
    htmlLayerRef,
    htmlCleanupRef,
    projectionBridgeRef,
  );

  const originPos = locationToPosition(detail.origin);
  const destPos = locationToPosition(detail.destination);
  const flags = detail.operational_flags;
  const hasSlaBreach =
    flags?.sla_pickup_breach === true || flags?.sla_delivery_breach === true;

  if (originPos) {
    const label = detail.origin?.label?.trim() || "—";
    overlayRef.current.origin = createServiceAdvancedMarker(
      map,
      originPos,
      "O",
      `Origen: ${label}`,
      "#16a34a",
    );
  }

  if (destPos) {
    const label = detail.destination?.label?.trim() || "—";
    overlayRef.current.destination = createServiceAdvancedMarker(
      map,
      destPos,
      "D",
      `Destino: ${label}`,
      "#7c3aed",
    );
  }

  if (originPos && destPos) {
    polylineRef.current = new google.maps.Polyline({
      map,
      path: [
        { lat: originPos.lat, lng: originPos.lng },
        { lat: destPos.lat, lng: destPos.lng },
      ],
      geodesic: true,
      strokeColor: hasSlaBreach
        ? SERVICE_POLYLINE_BREACH
        : SERVICE_POLYLINE_NORMAL,
      strokeOpacity: 1,
      strokeWeight: 6,
      clickable: false,
      zIndex: 9998,
    });

    google.maps.event.trigger(map, "resize");

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(originPos);
    bounds.extend(destPos);
    map.fitBounds(bounds, 64);
    window.setTimeout(() => {
      map.panBy(1, 1);
      map.panBy(-1, -1);
    }, 50);
  } else if (originPos) {
    map.panTo(originPos);
  } else if (destPos) {
    map.panTo(destPos);
  }

  const runHtmlOverlay = () => {
    const layer = htmlLayerRef.current;
    if (!layer) return;
    syncServiceHtmlOverlay(
      map,
      layer,
      originPos,
      destPos,
      hasSlaBreach,
      htmlCleanupRef,
      projectionBridgeRef,
    );
  };

  if (originPos && destPos) {
    google.maps.event.addListenerOnce(map, "idle", () => {
      window.setTimeout(runHtmlOverlay, 80);
    });
  } else {
    runHtmlOverlay();
  }
}

function setMarkerPosition(
  entry: MapMarkerEntry,
  position: google.maps.LatLngLiteral,
): void {
  if (entry.kind === "advanced") {
    (entry.marker as google.maps.marker.AdvancedMarkerElement).position =
      position;
  } else {
    (entry.marker as google.maps.Marker).setPosition(position);
  }
}

function createMapMarker(
  map: google.maps.Map,
  messenger: OpsMapMessenger,
  useAdvanced: boolean,
): MapMarkerEntry {
  const position = getMessengerCoords(messenger);
  if (!position) {
    throw new Error("Messenger without valid coordinates");
  }
  const title = getMarkerTitle(messenger);
  const color = OPS_PIN_COLORS[messenger.ops_state];
  const fillOpacity = messenger.ops_state === "OFFLINE" ? 0.55 : 1;

  if (useAdvanced) {
    const PinElement = window.google!.maps!.marker!.PinElement;
    const pin = new PinElement({
      background: color,
      borderColor: "#ffffff",
      glyphColor: "#ffffff",
      scale: messenger.ops_state === "OFFLINE" ? 0.9 : 1.05,
    });
    if (pin.element && messenger.ops_state === "OFFLINE") {
      pin.element.style.opacity = "0.65";
    }
    const marker = new window.google!.maps!.marker!.AdvancedMarkerElement({
      map,
      position,
      title,
      content: pin.element,
    });
    return { marker, kind: "advanced", opsState: messenger.ops_state };
  }

  const marker = new google.maps.Marker({
    map,
    position,
    title,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: color,
      fillOpacity,
      strokeColor: "#ffffff",
      strokeWeight: 2,
    },
  });
  return { marker, kind: "classic", opsState: messenger.ops_state };
}

function bindMarkerClick(
  entry: { marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker },
  onClick: () => void,
): void {
  const target = entry.marker as google.maps.MVCObject;
  target.addListener("click", onClick);
}

function setMapServiceMarkerPosition(
  entry: MapServiceMarkerEntry,
  position: google.maps.LatLngLiteral,
): void {
  if (entry.kind === "advanced") {
    (entry.marker as google.maps.marker.AdvancedMarkerElement).position =
      position;
  } else {
    (entry.marker as google.maps.Marker).setPosition(position);
  }
}

function createMapServiceMarker(
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  title: string,
  operationalStatus: OperationalStatus,
  hasSlaBreach: boolean,
  useAdvanced: boolean,
): MapServiceMarkerEntry {
  const color = OPERATIONAL_STATUS_PIN_COLORS[operationalStatus];
  const label = SERVICE_PIN_LABEL[operationalStatus];
  const strokeColor = hasSlaBreach ? "#ef4444" : "#ffffff";
  const strokeWeight = hasSlaBreach ? 4 : 3;

  if (useAdvanced) {
    const content = createServicePinElement(label, color);
    content.style.border = `${strokeWeight}px solid ${strokeColor}`;
    const marker = new window.google!.maps!.marker!.AdvancedMarkerElement({
      map,
      position,
      title,
      content,
      zIndex: 5000,
    });
    return {
      marker,
      kind: "advanced",
      operationalStatus,
      hasSlaBreach,
    };
  }

  const marker = new google.maps.Marker({
    map,
    position,
    title,
    zIndex: 5000,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 9,
      fillColor: color,
      fillOpacity: 1,
      strokeColor,
      strokeWeight,
    },
  });
  return { marker, kind: "classic", operationalStatus, hasSlaBreach };
}

function syncMapServiceMarkers(
  map: google.maps.Map,
  visibleServices: OpsMapService[],
  markersRef: React.MutableRefObject<Map<string, MapServiceMarkerEntry>>,
  useAdvancedRef: React.MutableRefObject<boolean | null>,
  onMarkerClick: (serviceId: string) => void,
): void {
  if (useAdvancedRef.current === null) {
    useAdvancedRef.current = canUseAdvancedMarkers();
  }
  const useAdvanced = useAdvancedRef.current === true;

  const nextIds = new Set<string>();

  for (const service of visibleServices) {
    if (!getServiceMapPosition(service)) continue;
    nextIds.add(service.service_id);
  }

  const idsToRemove: string[] = [];
  markersRef.current.forEach((entry, id) => {
    if (!nextIds.has(id)) {
      detachMarker(entry);
      idsToRemove.push(id);
    }
  });
  for (const id of idsToRemove) {
    markersRef.current.delete(id);
  }

  for (const service of visibleServices) {
    const position = getServiceMapPosition(service);
    if (!position) continue;

    const operationalStatus = getServiceOperationalStatus(service);
    const hasSlaBreach = serviceHasSlaBreach(service);
    const existing = markersRef.current.get(service.service_id);

    if (
      existing &&
      existing.operationalStatus === operationalStatus &&
      existing.hasSlaBreach === hasSlaBreach
    ) {
      setMapServiceMarkerPosition(existing, position);
      continue;
    }

    if (existing) {
      detachMarker(existing);
      markersRef.current.delete(service.service_id);
    }

    const title = getServiceMarkerTitle(service);

    try {
      const entry = createMapServiceMarker(
        map,
        position,
        title,
        operationalStatus,
        hasSlaBreach,
        useAdvanced,
      );
      bindMarkerClick(entry, () => onMarkerClick(service.service_id));
      markersRef.current.set(service.service_id, entry);
    } catch (err) {
      if (useAdvanced) {
        useAdvancedRef.current = false;
        try {
          const entry = createMapServiceMarker(
            map,
            position,
            title,
            operationalStatus,
            hasSlaBreach,
            false,
          );
          bindMarkerClick(entry, () => onMarkerClick(service.service_id));
          markersRef.current.set(service.service_id, entry);
        } catch {
          console.warn("[ops-map] service marker create failed", err);
        }
      } else {
        console.warn("[ops-map] service marker create failed", err);
      }
    }
  }
}

function syncOpsMarkers(
  map: google.maps.Map,
  visibleMessengers: OpsMapMessenger[],
  markersRef: React.MutableRefObject<Map<string, MapMarkerEntry>>,
  useAdvancedRef: React.MutableRefObject<boolean | null>,
  onMarkerClick: (messengerId: string) => void,
): google.maps.LatLngLiteral[] {
  if (useAdvancedRef.current === null) {
    useAdvancedRef.current = canUseAdvancedMarkers();
  }
  const useAdvanced = useAdvancedRef.current === true;

  const nextIds = new Set<string>();
  const validPoints: google.maps.LatLngLiteral[] = [];

  for (const messenger of visibleMessengers) {
    if (!hasValidCoords(messenger)) continue;
    const pos = getMessengerCoords(messenger);
    if (!pos) continue;
    nextIds.add(messenger.messenger_id);
    validPoints.push(pos);
  }

  const idsToRemove: string[] = [];
  markersRef.current.forEach((entry, id) => {
    if (!nextIds.has(id)) {
      detachMarker(entry);
      idsToRemove.push(id);
    }
  });
  for (const id of idsToRemove) {
    markersRef.current.delete(id);
  }

  for (const messenger of visibleMessengers) {
    if (!hasValidCoords(messenger)) continue;

    const position = getMessengerCoords(messenger);
    if (!position) continue;
    const existing = markersRef.current.get(messenger.messenger_id);

    if (existing && existing.opsState === messenger.ops_state) {
      setMarkerPosition(existing, position);
      continue;
    }

    if (existing) {
      detachMarker(existing);
      markersRef.current.delete(messenger.messenger_id);
    }

    try {
      const entry = createMapMarker(map, messenger, useAdvanced);
      bindMarkerClick(entry, () => onMarkerClick(messenger.messenger_id));
      markersRef.current.set(messenger.messenger_id, entry);
    } catch (err) {
      if (useAdvanced) {
        useAdvancedRef.current = false;
        try {
          const entry = createMapMarker(map, messenger, false);
          bindMarkerClick(entry, () => onMarkerClick(messenger.messenger_id));
          markersRef.current.set(messenger.messenger_id, entry);
        } catch {
          console.warn("[ops-map] marker create failed", err);
        }
      } else {
        console.warn("[ops-map] marker create failed", err);
      }
    }
  }

  return validPoints;
}

function MessengerOpsPanel({
  messenger,
  lastUpdatedAt,
  onClose,
  onRecenter,
  onOpenService,
}: {
  messenger: OpsMapMessenger;
  lastUpdatedAt: Date | null;
  onClose: () => void;
  onRecenter: () => void;
  onOpenService: () => void;
}) {
  const name = getMessengerDisplayName(messenger);
  const signalStale = messenger.is_online === false;
  const hasCoords = hasValidCoords(messenger);
  const coordsLabel = formatMessengerCoords(messenger);

  return (
    <Card className="border border-gray-200 shadow-lg bg-white/98">
      <CardHeader className="pb-2 space-y-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base text-[#1E3A5F] truncate">{name}</CardTitle>
            {messenger.phone ? (
              <p className="text-xs text-gray-500 mt-0.5">{messenger.phone}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Badge
          variant="outline"
          className={`text-xs w-fit mt-2 ${opsStateBadgeClass(messenger.ops_state)}`}
        >
          {OPS_STATE_LABELS[messenger.ops_state]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm pt-0">
        <div>
          <p className="text-xs text-gray-500 mb-1">Señal</p>
          {signalStale ? (
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <WifiOff className="h-3.5 w-3.5 shrink-0" />
              Señal vencida
            </p>
          ) : messenger.is_online === true ? (
            <p className="text-xs text-green-700 flex items-center gap-1">
              <Wifi className="h-3.5 w-3.5 shrink-0" />
              En línea
            </p>
          ) : (
            <p className="text-xs text-gray-500">Sin dato de señal</p>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Última ubicación</p>
          {coordsLabel ? (
            <>
              <p className="text-xs font-mono text-gray-700">{coordsLabel}</p>
              {messenger.location_updated_at ? (
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDateTime(messenger.location_updated_at)}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-gray-400">Sin coordenadas</p>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Placa</p>
          <p className="text-xs font-mono text-gray-700">
            {messenger.plate?.trim() || "—"}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Servicio activo</p>
          {messenger.active_service ? (
            <p className="text-xs text-gray-700">
              <span
                className="font-mono font-medium text-[#1E3A5F]"
                title={messenger.active_service.service_id}
              >
                {truncateId(messenger.active_service.service_id)}
              </span>
              <span className="text-gray-500">
                {" "}
                · {messenger.active_service.status}
              </span>
            </p>
          ) : (
            <p className="text-xs text-gray-400">Sin servicio activo</p>
          )}
        </div>

        {lastUpdatedAt ? (
          <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
            Última actualización:{" "}
            {lastUpdatedAt.toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasCoords}
            onClick={onRecenter}
          >
            Recentrar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!messenger.active_service}
            onClick={onOpenService}
          >
            Abrir servicio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MessengerRow({
  messenger,
  selected,
  rowRef,
  onSelect,
}: {
  messenger: OpsMapMessenger;
  selected: boolean;
  rowRef: (el: HTMLDivElement | null) => void;
  onSelect: (messengerId: string) => void;
}) {
  const name = getMessengerDisplayName(messenger);
  const signalStale = messenger.is_online === false;

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      data-messenger-id={messenger.messenger_id}
      onClick={() => onSelect(messenger.messenger_id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(messenger.messenger_id);
        }
      }}
      className={cn(
        "rounded-lg border bg-gray-50/80 p-4 space-y-2 transition-shadow cursor-pointer",
        selected
          ? "border-[#1E3A5F] ring-2 ring-[#1E3A5F]/30 shadow-md"
          : "border-gray-100",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-[#1E3A5F] truncate">{name}</p>
          {messenger.phone ? (
            <p className="text-xs text-gray-500">{messenger.phone}</p>
          ) : null}
          {messenger.plate ? (
            <p className="text-xs font-mono text-gray-600">{messenger.plate}</p>
          ) : null}
        </div>
        <Badge
          variant="outline"
          className={`text-xs shrink-0 ${opsStateBadgeClass(messenger.ops_state)}`}
        >
          {OPS_STATE_LABELS[messenger.ops_state]}
        </Badge>
      </div>

      {signalStale ? (
        <p className="text-xs text-amber-700 flex items-center gap-1">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          Señal vencida
        </p>
      ) : null}

      {messenger.active_service ? (
        <p className="text-xs text-gray-600">
          Servicio{" "}
          <span className="font-mono font-medium text-[#1E3A5F]">
            {truncateId(messenger.active_service.service_id)}
          </span>
          <span className="text-gray-500">
            {" "}
            · {messenger.active_service.status}
          </span>
        </p>
      ) : (
        <p className="text-xs text-gray-400">Sin servicio activo</p>
      )}
    </div>
  );
}

function OpsMapServiceOperationalExtras({
  service,
  compact = false,
}: {
  service: OpsMapService;
  compact?: boolean;
}) {
  const flags = service.operational_flags;
  const stuckLevel = flags?.stuck_level ?? getServiceStuckLevel(service);
  const slaBreach = formatServiceSlaBreachLabel(service);

  return (
    <div className={cn("space-y-2", compact && "text-xs")}>
      <div className="grid grid-cols-2 gap-2">
        <DetailField
          label="Transportista"
          value={displayText(service.company_name)}
        />
        {service.messenger_name || service.assigned_messenger_id ? (
          <DetailField
            label="Mensajero"
            value={displayText(
              service.messenger_name ?? service.assigned_messenger_id,
            )}
          />
        ) : null}
        <DetailField label="Tipo" value={displayText(service.service_type)} />
        <DetailField
          label="Stuck level"
          value={displayText(stuckLevel)}
        />
        {flags?.age_min != null ? (
          <DetailField label="Edad (min)" value={displayText(flags.age_min)} />
        ) : null}
        {service.eta_pickup_at ? (
          <DetailField
            label="ETA recogida"
            value={formatDateTime(service.eta_pickup_at)}
          />
        ) : null}
        {service.eta_delivery_at ? (
          <DetailField
            label="ETA entrega"
            value={formatDateTime(service.eta_delivery_at)}
          />
        ) : null}
        {service.sla_pickup_deadline_at ? (
          <DetailField
            label="SLA recogida"
            value={formatDateTime(service.sla_pickup_deadline_at)}
          />
        ) : null}
        {service.sla_delivery_deadline_at ? (
          <DetailField
            label="SLA entrega"
            value={formatDateTime(service.sla_delivery_deadline_at)}
          />
        ) : null}
      </div>
      {slaBreach ? (
        <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">
          {slaBreach}
        </p>
      ) : null}
      {(flags?.service_stopped || flags?.operational_inconsistency) && (
        <div className="flex flex-wrap gap-1">
          {flags.service_stopped ? (
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-900">
              Servicio detenido
            </Badge>
          ) : null}
          {flags.operational_inconsistency ? (
            <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-900">
              Inconsistencia
            </Badge>
          ) : null}
        </div>
      )}
      <div className="space-y-2">
        <div>
          <p className="text-gray-500 mb-0.5 text-xs">Origen</p>
          <OperationalLocationDisplay location={service.origin} />
        </div>
        <div>
          <p className="text-gray-500 mb-0.5 text-xs">Destino</p>
          <OperationalLocationDisplay location={service.destination} />
        </div>
      </div>
    </div>
  );
}

function OpsMapServicePanel({
  service,
  onClose,
  onRecenter,
  onOpenDetail,
}: {
  service: OpsMapService;
  onClose: () => void;
  onRecenter: () => void;
  onOpenDetail: () => void;
}) {
  const hasCoords = getServiceMapPosition(service) != null;

  return (
    <Card className="border border-gray-200 shadow-lg bg-white/98">
      <CardHeader className="pb-2 space-y-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base text-[#1E3A5F] truncate">
              {displayText(service.service_short)}
            </CardTitle>
            <p className="text-xs font-mono text-gray-500 mt-0.5 truncate">
              {service.service_id}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <OperationalStatusBadges
            status={service.status}
            dispatchStatus={service.dispatch_status}
            compact
          />
          <GeofenceBadge geofenceState={service.geofence_state} compact />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 text-sm">
        <OpsMapServiceOperationalExtras service={service} />
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!hasCoords}
            onClick={onRecenter}
          >
            Recentrar en mapa
          </Button>
          <Button type="button" size="sm" className="w-full" onClick={onOpenDetail}>
            Ver detalle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OpsMapServiceRow({
  service,
  selected,
  onSelect,
  onOpenDetail,
}: {
  service: OpsMapService;
  selected: boolean;
  onSelect: (serviceId: string) => void;
  onOpenDetail: (serviceId: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-service-id={service.service_id}
      onClick={() => onSelect(service.service_id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(service.service_id);
        }
      }}
      className={cn(
        "rounded-lg border bg-gray-50/80 p-4 space-y-2 transition-shadow cursor-pointer",
        selected
          ? "border-[#1E3A5F] ring-2 ring-[#1E3A5F]/30 shadow-md"
          : "border-gray-100",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-[#1E3A5F] truncate">
            {displayText(service.service_short)}
          </p>
          <p className="text-xs font-mono text-gray-500 truncate">
            {service.service_id}
          </p>
          {service.company_name ? (
            <p className="text-xs text-gray-600 mt-0.5">{service.company_name}</p>
          ) : null}
        </div>
      </div>
      <OperationalStatusBadges
        status={service.status}
        dispatchStatus={service.dispatch_status}
        compact
      />
      <GeofenceBadge geofenceState={service.geofence_state} compact />
      <OpsMapServiceOperationalExtras service={service} compact />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 px-2 text-xs w-full sm:w-auto"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetail(service.service_id);
        }}
      >
        Ver detalle
      </Button>
    </div>
  );
}

export default function AdminOpsMapPage() {
  const [messengers, setMessengers] = useState<OpsMapMessenger[]>([]);
  const [mapServices, setMapServices] = useState<OpsMapService[]>([]);
  const [requestedServices, setRequestedServices] = useState<OpsMapService[]>([]);
  const [activeServices, setActiveServices] = useState<OpsMapService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showOffline, setShowOffline] = useState(false);
  const [showGhost, setShowGhost] = useState(false);
  const [showMapServices, setShowMapServices] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selectedMessengerId, setSelectedMessengerId] = useState<string | null>(
    null,
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const [serviceDetailOpen, setServiceDetailOpen] = useState(false);
  const [serviceDetailLoading, setServiceDetailLoading] = useState(false);
  const [serviceDetailError, setServiceDetailError] = useState<string | null>(
    null,
  );
  const [serviceDetail, setServiceDetail] = useState<AdminOpsServiceDetail | null>(
    null,
  );

  const loadInFlightRef = useRef(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, MapMarkerEntry>>(new Map());
  const serviceMarkersRef = useRef<Map<string, MapServiceMarkerEntry>>(new Map());
  const serviceOverlayRef = useRef<ServiceOverlayState>({
    origin: null,
    destination: null,
  });
  const servicePolylineRef = useRef<google.maps.Polyline | null>(null);
  const serviceHtmlOverlayRef = useRef<HTMLDivElement>(null);
  const serviceHtmlCleanupRef = useRef<(() => void) | null>(null);
  const serviceProjectionBridgeRef = useRef<google.maps.OverlayView | null>(null);
  const operationalPolylineRef = useRef<google.maps.Polyline | null>(null);
  const didFitBoundsRef = useRef(false);
  const useAdvancedMarkersRef = useRef<boolean | null>(null);
  const rowRefsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const urlServiceIdHandledRef = useRef(false);

  const loadSnapshot = useCallback(async (options?: { silent?: boolean }) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;

    const silent = options?.silent ?? false;
    if (!silent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const data = await getAdminOpsMapSnapshot({ limit: 200 });
      setMessengers(data.messengers);
      setMapServices(data.map_services);
      setRequestedServices(data.requested_services);
      setActiveServices(data.active_services);
      setError(null);
      setLastUpdatedAt(new Date());
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No fue posible cargar el mapa operacional";
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      loadInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadSnapshot({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadSnapshot]);

  const visibleMessengers = useMemo(() => {
    return messengers.filter((m) => {
      if (!showOffline && m.ops_state === "OFFLINE") return false;
      if (!showGhost && isGhostMessenger(m)) return false;
      return true;
    });
  }, [messengers, showOffline, showGhost]);

  const offlineHiddenCount = useMemo(
    () => messengers.filter((m) => m.ops_state === "OFFLINE").length,
    [messengers],
  );

  const ghostHiddenCount = useMemo(
    () => messengers.filter(isGhostMessenger).length,
    [messengers],
  );

  const visibleMapServices = useMemo(() => {
    if (!showMapServices) return [];
    return mapServices.filter((s) => getServiceMapPosition(s) != null);
  }, [mapServices, showMapServices]);

  const serviceCountsByStatus = useMemo(() => {
    const counts: Record<OperationalStatus, number> = {
      REQUESTED: 0,
      CLAIMED: 0,
      STARTED: 0,
      CLOSED: 0,
    };
    for (const s of mapServices) {
      const op = getServiceOperationalStatus(s);
      counts[op] += 1;
    }
    return counts;
  }, [mapServices]);

  const mapMarkersCount = useMemo(
    () => visibleMessengers.filter(hasValidCoords).length,
    [visibleMessengers],
  );

  const selectedMessenger = useMemo(() => {
    if (!selectedMessengerId) return null;
    return (
      messengers.find((m) => m.messenger_id === selectedMessengerId) ?? null
    );
  }, [messengers, selectedMessengerId]);

  const selectedService = useMemo(() => {
    if (!selectedServiceId) return null;
    return mapServices.find((s) => s.service_id === selectedServiceId) ?? null;
  }, [mapServices, selectedServiceId]);

  const operationalTarget = useMemo(() => {
    if (!selectedService || serviceDetailOpen) return null;
    return selectedService;
  }, [selectedService, serviceDetailOpen]);

  const handleSelectMessenger = useCallback((id: string | null) => {
    setSelectedServiceId(null);
    setSelectedMessengerId((prev) => {
      if (id === null) return null;
      const nextId = prev === id ? null : id;
      if (nextId !== null) {
        requestAnimationFrame(() => {
          rowRefsRef.current[nextId]?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        });
      }
      return nextId;
    });
  }, []);

  const handleMarkerClick = useCallback(
    (messengerId: string) => {
      handleSelectMessenger(messengerId);
    },
    [handleSelectMessenger],
  );

  const handleServiceClick = useCallback((serviceId: string) => {
    setSelectedMessengerId(null);
    setSelectedServiceId((prev) => (prev === serviceId ? null : serviceId));
  }, []);

  const handleRecenterService = useCallback((service: OpsMapService) => {
    const position = getServiceMapPosition(service);
    const map = mapRef.current;
    if (!position || !map) return;
    map.panTo(position);
    map.setZoom(15);
  }, []);

  const handleRecenterMessenger = useCallback((messenger: OpsMapMessenger) => {
    const position = getMessengerCoords(messenger);
    const map = mapRef.current;
    if (!position || !map) return;
    map.panTo(position);
    map.setZoom(15);
  }, []);

  const handleServiceDetailOpenChange = useCallback((open: boolean) => {
    setServiceDetailOpen(open);
    if (!open) {
      setServiceDetail(null);
      clearAllServiceVisuals(
        serviceOverlayRef,
        servicePolylineRef,
        serviceHtmlOverlayRef,
        serviceHtmlCleanupRef,
        serviceProjectionBridgeRef,
      );
    }
  }, []);

  const handleOpenServiceDetail = useCallback(async (serviceId: string) => {
    setServiceDetailOpen(true);
    setServiceDetailLoading(true);
    setServiceDetailError(null);
    setServiceDetail(null);
    clearAllServiceVisuals(
      serviceOverlayRef,
      servicePolylineRef,
      serviceHtmlOverlayRef,
      serviceHtmlCleanupRef,
      serviceProjectionBridgeRef,
    );
    try {
      const detail = await getAdminOpsServiceDetail(serviceId);
      setServiceDetail(detail);
      const map = mapRef.current;
      if (map) {
        syncServiceOverlay(
          map,
          detail,
          serviceOverlayRef,
          servicePolylineRef,
          serviceHtmlOverlayRef,
          serviceHtmlCleanupRef,
          serviceProjectionBridgeRef,
        );
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : "No fue posible cargar el detalle del servicio";
      setServiceDetailError(message);
      toast.error(message);
    } finally {
      setServiceDetailLoading(false);
    }
  }, []);

  const handleIncidentSelectService = useCallback(
    (serviceId: string) => {
      const id = serviceId.trim();
      if (!id) return;
      setSelectedMessengerId(null);
      setSelectedServiceId(id);
      void handleOpenServiceDetail(id);
    },
    [handleOpenServiceDetail],
  );

  useEffect(() => {
    const id = getOpsMapServiceIdFromSearch();
    if (!id || urlServiceIdHandledRef.current) return;
    urlServiceIdHandledRef.current = true;
    setSelectedMessengerId(null);
    setSelectedServiceId(id);
    void handleOpenServiceDetail(id);
  }, [handleOpenServiceDetail]);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.setCenter(MAP_DEFAULT_CENTER);
    map.setZoom(MAP_DEFAULT_ZOOM);
    setMapReady(true);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const validPoints = syncOpsMarkers(
      map,
      visibleMessengers,
      markersRef,
      useAdvancedMarkersRef,
      handleMarkerClick,
    );

    if (!didFitBoundsRef.current && validPoints.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      for (const point of validPoints) {
        bounds.extend(point);
      }
      map.fitBounds(bounds, 48);
      didFitBoundsRef.current = true;
    }
  }, [mapReady, visibleMessengers, handleMarkerClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    syncMapServiceMarkers(
      map,
      visibleMapServices,
      serviceMarkersRef,
      useAdvancedMarkersRef,
      handleServiceClick,
    );
  }, [mapReady, visibleMapServices, handleServiceClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    clearAllServiceVisuals(
      serviceOverlayRef,
      servicePolylineRef,
      serviceHtmlOverlayRef,
      serviceHtmlCleanupRef,
      serviceProjectionBridgeRef,
    );
    if (!serviceDetail) return;

    syncServiceOverlay(
      map,
      serviceDetail,
      serviceOverlayRef,
      servicePolylineRef,
      serviceHtmlOverlayRef,
      serviceHtmlCleanupRef,
      serviceProjectionBridgeRef,
    );
  }, [mapReady, serviceDetail]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    clearOperationalFlowOverlay(operationalPolylineRef);

    if (!operationalTarget) return;

    syncOperationalFlowOverlay({
      map,
      service: operationalTarget,
      messengers,
      polylineRef: operationalPolylineRef,
    });

    return () => {
      clearOperationalFlowOverlay(operationalPolylineRef);
    };
  }, [mapReady, operationalTarget, messengers]);

  useEffect(() => {
    return () => {
      clearOperationalFlowOverlay(operationalPolylineRef);
      clearAllServiceVisuals(
        serviceOverlayRef,
        servicePolylineRef,
        serviceHtmlOverlayRef,
        serviceHtmlCleanupRef,
        serviceProjectionBridgeRef,
      );
      markersRef.current.forEach((entry) => {
        detachMarker(entry);
      });
      markersRef.current.clear();
      serviceMarkersRef.current.forEach((entry) => {
        detachMarker(entry);
      });
      serviceMarkersRef.current.clear();
      mapRef.current = null;
    };
  }, []);

  const handleRefresh = () => {
    void loadSnapshot({ silent: true });
  };

  const setRowRef = useCallback(
    (messengerId: string) => (el: HTMLDivElement | null) => {
      rowRefsRef.current[messengerId] = el;
    },
    [],
  );

  const showFatalEmpty = isLoading && messengers.length === 0;

  return (
    <>
      <OpsServiceDetailDialog
        open={serviceDetailOpen}
        onOpenChange={handleServiceDetailOpenChange}
        loading={serviceDetailLoading}
        error={serviceDetailError}
        detail={serviceDetail}
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">
              Centro de Mensajería
            </h1>
            <p className="text-gray-500 mt-1">
              Monitoreo de servicios documentales, mensajeros, recogidas y entregas.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {requestedServices.length} solicitados · {activeServices.length} activos
              (CLAIMED/STARTED)
            </p>
            {lastUpdatedAt ? (
              <p className="text-xs text-gray-400 mt-1">
                Última actualización:{" "}
                {lastUpdatedAt.toLocaleTimeString("es-CO", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
                {mapReady ? (
                  <span className="text-gray-400">
                    {" "}
                    · {mapMarkersCount} en mapa
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={showMapServices ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowMapServices((v) => !v)}
            >
              {showMapServices
                ? "Ocultar servicios en mapa"
                : `Mostrar servicios (${mapServices.length})`}
            </Button>
            <Button
              type="button"
              variant={showGhost ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowGhost((v) => !v)}
            >
              {showGhost
                ? "Ocultar fantasma"
                : `Mostrar fantasma (${ghostHiddenCount})`}
            </Button>
            <Button
              type="button"
              variant={showOffline ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowOffline((v) => !v)}
            >
              {showOffline
                ? "Ocultar offline"
                : `Mostrar offline (${offlineHiddenCount})`}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Actualizar
            </Button>
          </div>
        </div>

        <div className="relative w-full min-h-[280px] md:h-[50vh] rounded-lg border border-gray-200 overflow-hidden bg-gray-100">
          {!mapReady && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-gray-500">
              {showFatalEmpty ? "Cargando mapa…" : "Inicializando mapa…"}
            </div>
          )}
          <MapView
            className="!h-full !min-h-[280px] md:!min-h-0 w-full"
            initialCenter={MAP_DEFAULT_CENTER}
            initialZoom={MAP_DEFAULT_ZOOM}
            onMapReady={handleMapReady}
          />
          <div
            ref={serviceHtmlOverlayRef}
            className="absolute inset-0 z-[15] pointer-events-none overflow-hidden"
            aria-hidden
          />
          <div className="absolute top-2 left-2 z-10 rounded-lg border border-gray-200/90 bg-white/95 shadow-sm px-3 py-2 text-xs">
            <p className="font-semibold text-[#1E3A5F] mb-1.5">Leyenda</p>
            <div className="flex flex-col gap-1">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.state} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full border border-white shadow-sm shrink-0"
                    style={{ backgroundColor: OPS_PIN_COLORS[item.state] }}
                  />
                  <span className="text-gray-700">{item.label}</span>
                </div>
              ))}
              {showMapServices ? (
                <>
                  <p className="font-semibold text-[#1E3A5F] mt-2 mb-0.5">
                    Servicios (operación)
                  </p>
                  {SERVICE_LEGEND_ITEMS.map((item) => (
                    <div key={item.status} className="flex items-center gap-2">
                      <span
                        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white text-[8px] font-extrabold text-white shadow-sm"
                        style={{
                          backgroundColor:
                            OPERATIONAL_STATUS_PIN_COLORS[item.status],
                        }}
                      >
                        {SERVICE_PIN_LABEL[item.status]}
                      </span>
                      <span className="text-gray-700">{item.label}</span>
                    </div>
                  ))}
                  <p className="text-[10px] text-gray-500 mt-1">
                    Borde rojo = SLA vencido
                  </p>
                </>
              ) : null}
              <p className="font-semibold text-[#1E3A5F] mt-2 mb-0.5">
                Flujo operacional
              </p>
              <div className="flex items-center gap-2">
                <span
                  className="h-1 w-6 shrink-0 rounded-full"
                  style={{
                    backgroundColor: OPERATIONAL_FLOW_POLYLINE_COLORS.CLAIMED,
                  }}
                />
                <span className="text-gray-700">Mensajero → Recoger</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-1 w-6 shrink-0 rounded-full"
                  style={{
                    backgroundColor: OPERATIONAL_FLOW_POLYLINE_COLORS.STARTED,
                  }}
                />
                <span className="text-gray-700">Recoger → Entregar</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Solo con servicio seleccionado
              </p>
            </div>
          </div>

          {serviceDetail && !serviceDetailLoading ? (
            <div className="absolute bottom-2 left-2 z-10 max-w-[calc(100%-1rem)] rounded-lg border border-gray-200/90 bg-white/95 shadow-sm px-3 py-2">
              <ServiceRouteLegend />
            </div>
          ) : null}

          <div className="hidden lg:block absolute top-2 right-2 z-20 w-72 max-h-[calc(100%-1rem)] overflow-auto pointer-events-auto space-y-2">
            <OpsIncidentsPanel
              services={mapServices}
              messengers={messengers}
              onSelectService={handleIncidentSelectService}
              onSelectMessenger={handleSelectMessenger}
            />
          </div>

          {selectedService && !serviceDetailOpen ? (
            <>
              <div className="hidden md:block absolute top-2 right-2 lg:right-[19rem] z-20 w-80 max-h-[calc(100%-1rem)] overflow-auto pointer-events-auto">
                <OpsMapServicePanel
                  service={selectedService}
                  onClose={() => setSelectedServiceId(null)}
                  onRecenter={() => handleRecenterService(selectedService)}
                  onOpenDetail={() =>
                    void handleOpenServiceDetail(selectedService.service_id)
                  }
                />
              </div>
              <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 max-h-[40vh] overflow-auto rounded-t-xl border-t border-gray-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.12)] pointer-events-auto">
                <OpsMapServicePanel
                  service={selectedService}
                  onClose={() => setSelectedServiceId(null)}
                  onRecenter={() => handleRecenterService(selectedService)}
                  onOpenDetail={() =>
                    void handleOpenServiceDetail(selectedService.service_id)
                  }
                />
              </div>
            </>
          ) : null}

          {selectedMessenger && !serviceDetailOpen && !selectedService ? (
            <>
              <div className="hidden md:block absolute top-2 right-2 z-20 w-80 max-h-[calc(100%-1rem)] overflow-auto pointer-events-auto">
                <MessengerOpsPanel
                  messenger={selectedMessenger}
                  lastUpdatedAt={lastUpdatedAt}
                  onClose={() => handleSelectMessenger(null)}
                  onRecenter={() => handleRecenterMessenger(selectedMessenger)}
                  onOpenService={() =>
                    void handleOpenServiceDetail(
                      selectedMessenger.active_service!.service_id,
                    )
                  }
                />
              </div>
              <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 max-h-[40vh] overflow-auto rounded-t-xl border-t border-gray-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.12)] pointer-events-auto">
                <MessengerOpsPanel
                  messenger={selectedMessenger}
                  lastUpdatedAt={lastUpdatedAt}
                  onClose={() => handleSelectMessenger(null)}
                  onRecenter={() => handleRecenterMessenger(selectedMessenger)}
                  onOpenService={() =>
                    void handleOpenServiceDetail(
                      selectedMessenger.active_service!.service_id,
                    )
                  }
                />
              </div>
            </>
          ) : null}
        </div>

        <MessengerOpsSummaryBar messengers={messengers} />

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {MAP_VISIBLE_OPERATIONAL_STATUSES.map((status) => (
            <Card key={status} className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-500">
                  {OPERATIONAL_STATUS_LABELS[status]}
                </p>
                <p
                  className="text-xl font-bold"
                  style={{ color: OPERATIONAL_STATUS_PIN_COLORS[status] }}
                >
                  {serviceCountsByStatus[status]}
                </p>
              </CardContent>
            </Card>
          ))}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Mensajeros visibles</p>
              <p className="text-xl font-bold text-[#1E3A5F]">
                {visibleMessengers.length}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:hidden">
          <OpsIncidentsPanel
            services={mapServices}
            messengers={messengers}
            onSelectService={handleIncidentSelectService}
            onSelectMessenger={handleSelectMessenger}
          />
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#1E3A5F] flex items-center gap-2">
              <Package className="h-5 w-5" />
              Servicios activos ({mapServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mapServices.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                No hay servicios REQUESTED, CLAIMED o STARTED en el snapshot
              </div>
            ) : (
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                {mapServices.map((s) => (
                  <OpsMapServiceRow
                    key={s.service_id}
                    service={s}
                    selected={selectedServiceId === s.service_id}
                    onSelect={handleServiceClick}
                    onOpenDetail={(id) => void handleOpenServiceDetail(id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#1E3A5F] flex items-center gap-2">
              <List className="h-5 w-5" />
              Mensajeros ({visibleMessengers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showFatalEmpty ? (
              <div className="text-center py-8 text-gray-400">Cargando...</div>
            ) : error && messengers.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-red-600 text-sm font-medium">{error}</p>
                <p className="text-xs text-gray-400">
                  Verifica VITE_RUTAFY_API_BASE y VITE_RUTAFY_ADMIN_KEY en
                  .env.local
                </p>
              </div>
            ) : visibleMessengers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {showOffline && showGhost
                  ? "No hay mensajeros en el snapshot"
                  : "No hay mensajeros visibles (revisa filtros offline / fantasma)"}
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {error ? (
                  <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
                    {error} (mostrando últimos datos disponibles)
                  </p>
                ) : null}
                {visibleMessengers.map((m) => (
                  <MessengerRow
                    key={m.messenger_id}
                    messenger={m}
                    selected={selectedMessengerId === m.messenger_id}
                    rowRef={setRowRef(m.messenger_id)}
                    onSelect={handleSelectMessenger}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
