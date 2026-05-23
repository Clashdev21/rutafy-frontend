import {
  getAdminOpsMapSnapshot,
  type OpsMapMessenger,
  type OpsMessengerState,
} from "@/api/admin-ops-map";
import AdminLayout from "@/components/AdminLayout";
import { MapView } from "@/components/Map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { List, Map as MapIcon, RefreshCw, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const POLL_INTERVAL_MS = 30_000;

const MAP_DEFAULT_CENTER = { lat: 3.8801, lng: -77.0312 };
const MAP_DEFAULT_ZOOM = 13;

const OPS_PIN_COLORS: Record<OpsMessengerState, string> = {
  AVAILABLE: "#22c55e",
  ASSIGNED: "#3b82f6",
  IN_SERVICE: "#8b5cf6",
  BUSY_IDLE: "#f59e0b",
  OFFLINE: "#9ca3af",
};

const OPS_STATE_LABELS: Record<OpsMessengerState, string> = {
  AVAILABLE: "Disponible",
  ASSIGNED: "Asignado",
  IN_SERVICE: "En servicio",
  BUSY_IDLE: "Busy idle",
  OFFLINE: "Offline",
};

const LEGEND_ITEMS: { state: OpsMessengerState; label: string }[] = [
  { state: "AVAILABLE", label: "Disponible" },
  { state: "ASSIGNED", label: "Asignado" },
  { state: "IN_SERVICE", label: "En servicio" },
  { state: "BUSY_IDLE", label: "Busy idle" },
];

type MapMarkerEntry = {
  marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker;
  kind: "advanced" | "classic";
  opsState: OpsMessengerState;
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

function countByState(
  messengers: OpsMapMessenger[],
  state: OpsMessengerState,
): number {
  return messengers.filter((m) => m.ops_state === state).length;
}

function hasValidCoords(m: OpsMapMessenger): boolean {
  return (
    m.lat != null &&
    m.lng != null &&
    Number.isFinite(m.lat) &&
    Number.isFinite(m.lng)
  );
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

function detachMarker(entry: MapMarkerEntry): void {
  clearMarker(entry.marker);
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
  const position = { lat: messenger.lat as number, lng: messenger.lng as number };
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
  entry: MapMarkerEntry,
  onClick: () => void,
): void {
  const target = entry.marker as google.maps.MVCObject;
  target.addListener("click", onClick);
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
    nextIds.add(messenger.messenger_id);
    validPoints.push({
      lat: messenger.lat as number,
      lng: messenger.lng as number,
    });
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

    const position = {
      lat: messenger.lat as number,
      lng: messenger.lng as number,
    };
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

function MessengerRow({
  messenger,
  selected,
  rowRef,
}: {
  messenger: OpsMapMessenger;
  selected: boolean;
  rowRef: (el: HTMLDivElement | null) => void;
}) {
  const name = getMessengerDisplayName(messenger);
  const signalStale = messenger.is_online === false;

  return (
    <div
      ref={rowRef}
      data-messenger-id={messenger.messenger_id}
      className={cn(
        "rounded-lg border bg-gray-50/80 p-4 space-y-2 transition-shadow",
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

export default function AdminOpsMapPage() {
  const [messengers, setMessengers] = useState<OpsMapMessenger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showOffline, setShowOffline] = useState(false);
  const [showGhost, setShowGhost] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [selectedMessengerId, setSelectedMessengerId] = useState<string | null>(
    null,
  );

  const loadInFlightRef = useRef(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, MapMarkerEntry>>(new Map());
  const didFitBoundsRef = useRef(false);
  const useAdvancedMarkersRef = useRef<boolean | null>(null);
  const rowRefsRef = useRef<Record<string, HTMLDivElement | null>>({});

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

  const counters = useMemo(
    () => ({
      total: visibleMessengers.length,
      available: countByState(visibleMessengers, "AVAILABLE"),
      assigned: countByState(visibleMessengers, "ASSIGNED"),
      inService: countByState(visibleMessengers, "IN_SERVICE"),
      busyIdle: countByState(visibleMessengers, "BUSY_IDLE"),
      offlineHidden: showOffline
        ? countByState(visibleMessengers, "OFFLINE")
        : offlineHiddenCount,
    }),
    [visibleMessengers, showOffline, offlineHiddenCount],
  );

  const mapMarkersCount = useMemo(
    () => visibleMessengers.filter(hasValidCoords).length,
    [visibleMessengers],
  );

  const handleMarkerClick = useCallback((messengerId: string) => {
    setSelectedMessengerId(messengerId);
    const rowEl = rowRefsRef.current[messengerId];
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

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
    return () => {
      markersRef.current.forEach((entry) => {
        detachMarker(entry);
      });
      markersRef.current.clear();
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
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">Mapa operacional</h1>
            <p className="text-gray-500 mt-1">
              Vista realtime de mensajeros y servicios activos
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
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Visibles</p>
              <p className="text-xl font-bold text-[#1E3A5F]">{counters.total}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Disponible</p>
              <p className="text-xl font-bold text-green-700">{counters.available}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Asignado</p>
              <p className="text-xl font-bold text-blue-700">{counters.assigned}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">En servicio</p>
              <p className="text-xl font-bold text-purple-700">{counters.inService}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Busy idle</p>
              <p className="text-xl font-bold text-amber-700">{counters.busyIdle}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">
                {showOffline ? "Offline" : "Offline ocultos"}
              </p>
              <p className="text-xl font-bold text-gray-600">{counters.offlineHidden}</p>
            </CardContent>
          </Card>
        </div>

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
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
