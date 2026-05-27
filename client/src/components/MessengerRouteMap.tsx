/// <reference types="@types/google.maps" />

import { MapView } from "@/components/Map";
import type { BackendService } from "@/hooks/useMessengerOperationalState";
import { parseServiceRouteCoords } from "@/lib/formatOperationalLocation";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const COLOR_MESSENGER = "#2563eb";
const COLOR_PICKUP = "#16a34a";
const COLOR_DELIVERY = "#7c3aed";
const POLYLINE_COLOR = "#64748b";

const DEFAULT_CENTER = { lat: 3.8776, lng: -77.0266 };

type LatLng = { lat: number; lng: number };

type RouteMarkerKind = "messenger" | "pickup" | "delivery";

type MarkerEntry = {
  marker: google.maps.Marker;
};

type OverlayState = {
  messenger: MarkerEntry | null;
  pickup: MarkerEntry | null;
  delivery: MarkerEntry | null;
};

export type MessengerRouteMapProps = {
  service: BackendService;
  messengerPosition: LatLng | null;
  className?: string;
};

function isGoogleMapsApiAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const g = window.google;
  if (!g?.maps) return false;
  if (typeof g.maps.Map !== "function") return false;
  if (typeof g.maps.Marker !== "function") return false;
  if (typeof g.maps.LatLngBounds !== "function") return false;
  if (!g.maps.SymbolPath || g.maps.SymbolPath.CIRCLE == null) return false;
  return true;
}

function detachMarker(entry: MarkerEntry | null): void {
  if (!entry) return;
  try {
    entry.marker.setMap(null);
  } catch {
    /* evitar fallo en cleanup */
  }
}

function createRouteMarker(
  map: google.maps.Map,
  position: LatLng,
  kind: RouteMarkerKind,
): MarkerEntry | null {
  try {
    if (!isGoogleMapsApiAvailable()) return null;

    const maps = window.google!.maps!;

    const config: Record<
      RouteMarkerKind,
      { label: string; title: string; color: string; zIndex: number }
    > = {
      messenger: {
        label: "T",
        title: "Tu ubicación",
        color: COLOR_MESSENGER,
        zIndex: 10003,
      },
      pickup: { label: "R", title: "Recoger", color: COLOR_PICKUP, zIndex: 10001 },
      delivery: { label: "E", title: "Entregar", color: COLOR_DELIVERY, zIndex: 10002 },
    };
    const { label, title, color, zIndex } = config[kind];

    const marker = new maps.Marker({
      map,
      position,
      title,
      label: { text: label, color: "#ffffff", fontWeight: "bold", fontSize: "11px" },
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: 14,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      zIndex,
    });

    return { marker };
  } catch {
    return null;
  }
}

function clearOverlay(
  overlayRef: React.MutableRefObject<OverlayState>,
  polylineRef: React.MutableRefObject<google.maps.Polyline | null>,
): void {
  try {
    detachMarker(overlayRef.current.messenger);
    detachMarker(overlayRef.current.pickup);
    detachMarker(overlayRef.current.delivery);
    overlayRef.current = { messenger: null, pickup: null, delivery: null };

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
  } catch {
    overlayRef.current = { messenger: null, pickup: null, delivery: null };
    polylineRef.current = null;
  }
}

function fitMapToPoints(map: google.maps.Map, points: LatLng[]): void {
  if (!isGoogleMapsApiAvailable() || points.length === 0) return;
  try {
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(15);
      return;
    }
    const bounds = new window.google!.maps!.LatLngBounds();
    for (const p of points) bounds.extend(p);
    map.fitBounds(bounds, 48);
  } catch {
    /* bounds opcional */
  }
}

function syncRouteOverlay(
  map: google.maps.Map,
  pickup: LatLng | null,
  delivery: LatLng | null,
  messenger: LatLng | null,
  overlayRef: React.MutableRefObject<OverlayState>,
  polylineRef: React.MutableRefObject<google.maps.Polyline | null>,
): void {
  if (!isGoogleMapsApiAvailable()) {
    throw new Error("Google Maps API not available");
  }

  clearOverlay(overlayRef, polylineRef);

  const fitPoints: LatLng[] = [];

  if (pickup) {
    const entry = createRouteMarker(map, pickup, "pickup");
    if (!entry) throw new Error("pickup marker failed");
    overlayRef.current.pickup = entry;
    fitPoints.push(pickup);
  }

  if (delivery) {
    const entry = createRouteMarker(map, delivery, "delivery");
    if (!entry) throw new Error("delivery marker failed");
    overlayRef.current.delivery = entry;
    fitPoints.push(delivery);
  }

  if (messenger) {
    const entry = createRouteMarker(map, messenger, "messenger");
    if (!entry) throw new Error("messenger marker failed");
    overlayRef.current.messenger = entry;
    fitPoints.push(messenger);
  }

  if (pickup && delivery && typeof window.google?.maps?.Polyline === "function") {
    polylineRef.current = new window.google.maps.Polyline({
      map,
      path: [pickup, delivery],
      geodesic: true,
      strokeColor: POLYLINE_COLOR,
      strokeOpacity: 0.9,
      strokeWeight: 4,
      clickable: false,
      zIndex: 9998,
    });
  }

  fitMapToPoints(map, fitPoints);

  try {
    window.google?.maps?.event?.trigger(map, "resize");
  } catch {
    /* resize opcional */
  }
}

function RouteMapLegend(props: {
  showMessenger: boolean;
  showPickup: boolean;
  showDelivery: boolean;
}) {
  const items: { color: string; label: string; show: boolean }[] = [
    { color: COLOR_MESSENGER, label: "Tú", show: props.showMessenger },
    { color: COLOR_PICKUP, label: "Recoger", show: props.showPickup },
    { color: COLOR_DELIVERY, label: "Entregar", show: props.showDelivery },
  ].filter((i) => i.show);

  if (items.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border border-white shadow-sm"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function MapLoadFallback() {
  return (
    <div
      className="flex h-48 w-full items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 px-4 text-center text-sm text-slate-500"
      role="status"
    >
      No se pudo cargar el mapa
    </div>
  );
}

export function MessengerRouteMap({
  service,
  messengerPosition,
  className,
}: MessengerRouteMapProps) {
  const pickup = parseServiceRouteCoords(service, "origin");
  const delivery = parseServiceRouteCoords(service, "destination");

  if (!pickup && !delivery) {
    return null;
  }

  const mapRef = useRef<google.maps.Map | null>(null);
  const overlayRef = useRef<OverlayState>({
    messenger: null,
    pickup: null,
    delivery: null,
  });
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [overlayFailed, setOverlayFailed] = useState(false);

  const pickupKey = pickup ? `${pickup.lat},${pickup.lng}` : "";
  const deliveryKey = delivery ? `${delivery.lat},${delivery.lng}` : "";
  const messengerKey = messengerPosition
    ? `${messengerPosition.lat},${messengerPosition.lng}`
    : "";

  const applyOverlay = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      syncRouteOverlay(
        map,
        pickup,
        delivery,
        messengerPosition,
        overlayRef,
        polylineRef,
      );
      setOverlayFailed(false);
    } catch (error) {
      console.warn("[MessengerRouteMap] map overlay failed", error);
      clearOverlay(overlayRef, polylineRef);
      setOverlayFailed(true);
    }
  }, [pickupKey, deliveryKey, messengerKey, pickup, delivery, messengerPosition]);

  useEffect(() => {
    applyOverlay();
  }, [applyOverlay, service.service_id]);

  useEffect(() => {
    return () => {
      clearOverlay(overlayRef, polylineRef);
      mapRef.current = null;
    };
  }, []);

  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      try {
        applyOverlay();
      } catch (error) {
        console.warn("[MessengerRouteMap] map overlay failed", error);
        clearOverlay(overlayRef, polylineRef);
        setOverlayFailed(true);
      }
    },
    [applyOverlay],
  );

  const initialCenter = useMemo(
    () => pickup ?? delivery ?? DEFAULT_CENTER,
    [pickupKey, deliveryKey, pickup, delivery],
  );

  return (
    <div className={cn("w-full", className)}>
      {overlayFailed ? (
        <MapLoadFallback />
      ) : (
        <MapView
          className="h-48 w-full rounded-xl overflow-hidden border border-slate-200/80"
          initialCenter={initialCenter}
          initialZoom={14}
          onMapReady={handleMapReady}
        />
      )}
      <RouteMapLegend
        showMessenger={messengerPosition != null}
        showPickup={pickup != null}
        showDelivery={delivery != null}
      />
    </div>
  );
}
