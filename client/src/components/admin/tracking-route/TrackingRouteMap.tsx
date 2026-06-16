/// <reference types="@types/google.maps" />

import type { AdminTrackingSessionRoute, TrackingRouteBounds } from "@/api/tracking-sessions";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { buildVisualSegments } from "@/lib/trackingRouteVisualSegments";
import { cn } from "@/lib/utils";
import { Crosshair } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const COLOR_COVERED = "#16a34a";
const COLOR_START = "#16a34a";
const COLOR_END = "#1e3a5f";
const DEFAULT_CENTER = { lat: 3.8776, lng: -77.0266 };

type LatLng = { lat: number; lng: number };

type Props = {
  route: AdminTrackingSessionRoute | null;
  className?: string;
};

function isGoogleMapsApiAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const g = window.google;
  return Boolean(
    g?.maps?.Map &&
      g.maps.Marker &&
      g.maps.Polyline &&
      g.maps.LatLngBounds &&
      g.maps.SymbolPath,
  );
}

function fitMapToBounds(
  map: google.maps.Map,
  bounds: TrackingRouteBounds,
  padding = 56,
): void {
  if (!isGoogleMapsApiAvailable()) return;
  try {
    const b = new window.google!.maps!.LatLngBounds(
      { lat: bounds.south, lng: bounds.west },
      { lat: bounds.north, lng: bounds.east },
    );
    map.fitBounds(b, padding);
  } catch {
    /* opcional */
  }
}

function fitMapToPoints(map: google.maps.Map, points: LatLng[], padding = 56): void {
  if (!isGoogleMapsApiAvailable() || points.length === 0) return;
  try {
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(15);
      return;
    }
    const bounds = new window.google!.maps!.LatLngBounds();
    for (const p of points) bounds.extend(p);
    map.fitBounds(bounds, padding);
  } catch {
    /* opcional */
  }
}

function createGpsMarker(
  map: google.maps.Map,
  position: LatLng,
  label: "I" | "F",
  title: string,
): google.maps.Marker | null {
  if (!isGoogleMapsApiAvailable()) return null;
  try {
    const maps = window.google!.maps!;
    const fillColor = label === "I" ? COLOR_START : COLOR_END;
    return new maps.Marker({
      map,
      position,
      title,
      label: { text: label, color: "#ffffff", fontWeight: "bold", fontSize: "11px" },
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: 14,
        fillColor,
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      zIndex: label === "I" ? 10002 : 10003,
    });
  } catch {
    return null;
  }
}

function clearOverlays(
  polylines: google.maps.Polyline[],
  markers: google.maps.Marker[],
): void {
  for (const line of polylines) {
    try {
      line.setMap(null);
    } catch {
      /* ignore */
    }
  }
  for (const marker of markers) {
    try {
      marker.setMap(null);
    } catch {
      /* ignore */
    }
  }
}

function RouteMapLegend() {
  return (
    <div className="absolute bottom-3 left-3 z-10 rounded-lg border border-white/80 bg-white/95 px-3 py-2 shadow-sm text-[11px] text-slate-700 space-y-1">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-0.5 w-6 rounded"
          style={{ backgroundColor: COLOR_COVERED }}
          aria-hidden
        />
        <span>Línea continua: recorrido GPS consolidado</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-amber-400" aria-hidden />
        <span>Gap &gt; 5 min: interrupción relevante</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#16a34a] text-[9px] font-bold text-white">
          I
        </span>
        <span>Inicio GPS</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1e3a5f] text-[9px] font-bold text-white">
          F
        </span>
        <span>Fin GPS</span>
      </div>
    </div>
  );
}

export function TrackingRouteMap({ route, className }: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const hasCoordinates =
    route != null &&
    route.segments.some((segment) => segment.points.length > 0);

  const syncOverlays = useCallback(() => {
    const map = mapRef.current;
    if (!map || !route || !isGoogleMapsApiAvailable()) return;

    clearOverlays(polylinesRef.current, markersRef.current);
    polylinesRef.current = [];
    markersRef.current = [];

    try {
      const visualSegments = buildVisualSegments(route);

      for (const visual of visualSegments) {
        if (visual.points.length < 2) continue;
        const path = visual.points.map((p) => ({ lat: p.lat, lng: p.lng }));
        const polyline = new window.google!.maps!.Polyline({
          map,
          path,
          geodesic: true,
          strokeColor: COLOR_COVERED,
          strokeOpacity: 0.95,
          strokeWeight: 4,
          clickable: false,
          zIndex: 9998,
        });
        polylinesRef.current.push(polyline);
      }

      if (route.start_point) {
        const start = createGpsMarker(
          map,
          { lat: route.start_point.lat, lng: route.start_point.lng },
          "I",
          "Inicio GPS",
        );
        if (start) markersRef.current.push(start);
      }

      if (route.end_point) {
        const end = createGpsMarker(
          map,
          { lat: route.end_point.lat, lng: route.end_point.lng },
          "F",
          "Fin GPS",
        );
        if (end) markersRef.current.push(end);
      }

      if (route.bounds) {
        fitMapToBounds(map, route.bounds);
      } else {
        const allPoints: LatLng[] = [];
        for (const segment of route.segments) {
          for (const p of segment.points) {
            allPoints.push({ lat: p.lat, lng: p.lng });
          }
        }
        fitMapToPoints(map, allPoints);
      }

      try {
        window.google?.maps?.event?.trigger(map, "resize");
      } catch {
        /* optional */
      }
    } catch (error) {
      console.warn("[TrackingRouteMap] overlay sync failed", error);
      setMapError(true);
    }
  }, [route]);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);
    setMapError(false);
  }, []);

  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    if (!map || !route) return;
    if (route.bounds) {
      fitMapToBounds(map, route.bounds);
      return;
    }
    const allPoints: LatLng[] = [];
    for (const segment of route.segments) {
      for (const p of segment.points) {
        allPoints.push({ lat: p.lat, lng: p.lng });
      }
    }
    fitMapToPoints(map, allPoints);
  }, [route]);

  useEffect(() => {
    if (!mapReady || !route) return;
    syncOverlays();
  }, [mapReady, route, syncOverlays]);

  useEffect(() => {
    return () => {
      clearOverlays(polylinesRef.current, markersRef.current);
      polylinesRef.current = [];
      markersRef.current = [];
    };
  }, []);

  if (!route) {
    return (
      <div
        className={cn(
          "flex h-[min(70vh,640px)] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500",
          className,
        )}
        role="status"
      >
        Cargando recorrido…
      </div>
    );
  }

  if (!hasCoordinates) {
    return (
      <div
        className={cn(
          "flex h-[min(70vh,640px)] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-500",
          className,
        )}
        role="status"
      >
        No hay coordenadas para esta sesión.
      </div>
    );
  }

  if (mapError) {
    return (
      <div
        className={cn(
          "flex h-[min(70vh,640px)] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500",
          className,
        )}
        role="status"
      >
        No se pudo cargar el mapa
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <MapView
        className="h-[min(70vh,640px)] rounded-xl border border-slate-200 overflow-hidden"
        initialCenter={DEFAULT_CENTER}
        initialZoom={13}
        onMapReady={handleMapReady}
      />
      <RouteMapLegend />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="absolute top-3 right-3 z-10 h-8 shadow-sm bg-white/95"
        onClick={handleRecenter}
      >
        <Crosshair className="h-3.5 w-3.5 mr-1.5" aria-hidden />
        Recentrar
      </Button>
    </div>
  );
}
