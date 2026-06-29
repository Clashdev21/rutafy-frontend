/// <reference types="@types/google.maps" />

import type { OperationalControlMapData } from "@/api/operational-control";
import { MapView } from "@/components/Map";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef } from "react";

const DEFAULT_CENTER = { lat: 3.8776, lng: -77.0266 };
const COLOR_DRIVER = "#2563eb";
const COLOR_DECLARED = "#eab308";
const COLOR_CONFIRMED = "#16a34a";
const COLOR_DEST = "#1e3a5f";
const COLOR_ROUTE = "#2A9D8F";

type Props = {
  map: OperationalControlMapData | null;
  className?: string;
};

function isGoogleMapsApiAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const g = window.google;
  return Boolean(g?.maps?.Map && g.maps.Marker && g.maps.Polyline && g.maps.LatLngBounds);
}

function createMarker(
  map: google.maps.Map,
  position: { lat: number; lng: number },
  fillColor: string,
  label: string,
  title: string,
): google.maps.Marker | null {
  if (!isGoogleMapsApiAvailable()) return null;
  try {
    const maps = window.google!.maps!;
    return new maps.Marker({
      map,
      position,
      title,
      label: { text: label, color: "#fff", fontWeight: "bold", fontSize: "10px" },
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor,
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
      },
    });
  } catch {
    return null;
  }
}

export function OperationalControlDrawerMap({ map, className }: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  const syncOverlays = useCallback(() => {
    const gmap = mapRef.current;
    if (!gmap || !map || !isGoogleMapsApiAvailable()) return;

    for (const m of markersRef.current) {
      try {
        m.setMap(null);
      } catch {
        /* ignore */
      }
    }
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const bounds = new window.google!.maps!.LatLngBounds();
    let hasPoint = false;

    const addPoint = (
      point: { lat: number; lng: number } | null | undefined,
      color: string,
      label: string,
      title: string,
    ) => {
      if (!point) return;
      const marker = createMarker(gmap, point, color, label, title);
      if (marker) markersRef.current.push(marker);
      bounds.extend(point);
      hasPoint = true;
    };

    addPoint(map.driver, COLOR_DRIVER, "C", map.driver?.label ?? "Conductor");
    addPoint(map.declared_port, COLOR_DECLARED, "D", map.declared_port?.label ?? "Puerto declarado");
    addPoint(map.confirmed_port, COLOR_CONFIRMED, "P", map.confirmed_port?.label ?? "Puerto confirmado");
    addPoint(map.destination, COLOR_DEST, "F", map.destination?.label ?? "Destino");

    if (map.polyline.length >= 2) {
      polylineRef.current = new window.google!.maps!.Polyline({
        map: gmap,
        path: map.polyline,
        geodesic: true,
        strokeColor: COLOR_ROUTE,
        strokeOpacity: 0.9,
        strokeWeight: 4,
      });
      for (const p of map.polyline) {
        bounds.extend(p);
        hasPoint = true;
      }
    }

    if (hasPoint) {
      try {
        gmap.fitBounds(bounds, 48);
      } catch {
        /* optional */
      }
    }
  }, [map]);

  const handleMapReady = useCallback(
    (gmap: google.maps.Map) => {
      mapRef.current = gmap;
      syncOverlays();
    },
    [syncOverlays],
  );

  useEffect(() => {
    syncOverlays();
  }, [syncOverlays]);

  useEffect(() => {
    return () => {
      for (const m of markersRef.current) {
        try {
          m.setMap(null);
        } catch {
          /* ignore */
        }
      }
      if (polylineRef.current) polylineRef.current.setMap(null);
    };
  }, []);

  if (!map) {
    return (
      <div
        className={cn(
          "flex h-56 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500",
          className,
        )}
      >
        Sin datos de mapa
      </div>
    );
  }

  return (
      <MapView
        className={cn("h-80 rounded-lg border border-slate-200 overflow-hidden", className)}
      initialCenter={DEFAULT_CENTER}
      initialZoom={12}
      onMapReady={handleMapReady}
    />
  );
}
