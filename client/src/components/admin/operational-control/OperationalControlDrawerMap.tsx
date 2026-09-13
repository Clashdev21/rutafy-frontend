/// <reference types="@types/google.maps" />

import type { OperationalControlMapData } from "@/api/operational-control";
import type { OperationalDigitalTwinCurrentLocation } from "@/api/operational-digital-twin";
import { MapView } from "@/components/Map";
import { resolveOperationalMapMarker } from "@/lib/operationalTwinContract";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef } from "react";

const DEFAULT_CENTER = { lat: 3.8776, lng: -77.0266 };
const COLOR_DRIVER = "#2563eb";
const COLOR_DECLARED = "#eab308";
const COLOR_CONFIRMED = "#16a34a";
const COLOR_DEST = "#1e3a5f";
const COLOR_ROUTE = "#2A9D8F";
const COLOR_CURRENT = "#0ea5e9";

type Props = {
  map: OperationalControlMapData | null;
  currentLocation?: OperationalDigitalTwinCurrentLocation | null;
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
  options?: { emphasize?: boolean },
): google.maps.Marker | null {
  if (!isGoogleMapsApiAvailable()) return null;
  try {
    const maps = window.google!.maps!;
    const emphasize = Boolean(options?.emphasize);
    return new maps.Marker({
      map,
      position,
      title,
      label: { text: label, color: "#fff", fontWeight: "bold", fontSize: "11px" },
      zIndex: emphasize ? 999 : 1,
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: emphasize ? 16 : 12,
        fillColor,
        fillOpacity: 1,
        strokeColor: emphasize ? "#0c4a6e" : "#fff",
        strokeWeight: emphasize ? 4 : 2,
      },
    });
  } catch {
    return null;
  }
}

export function OperationalControlDrawerMap({
  map,
  currentLocation = null,
  className,
}: Props) {
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
      emphasize = false,
    ) => {
      if (!point) return;
      const marker = createMarker(gmap, point, color, label, title, { emphasize });
      if (marker) markersRef.current.push(marker);
      bounds.extend(point);
      hasPoint = true;
    };

    const operational = resolveOperationalMapMarker(map, currentLocation);
    if (operational) {
      const human = operational.label?.trim() || "Ubicación actual";
      const title =
        operational.code && operational.code !== operational.label
          ? `${human} (${operational.code})`
          : human;
      addPoint(
        { lat: operational.lat, lng: operational.lng },
        operational.source === "current_location" ? COLOR_CURRENT : COLOR_DRIVER,
        "●",
        title,
        true,
      );
    }

    addPoint(
      map.declared_port,
      COLOR_DECLARED,
      "O",
      map.declared_port?.label ?? "Origen declarado",
    );
    addPoint(map.confirmed_port, COLOR_CONFIRMED, "P", map.confirmed_port?.label ?? "Puerto confirmado");
    addPoint(map.destination, COLOR_DEST, "D", map.destination?.label ?? "Destino");

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
  }, [map, currentLocation]);

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
    <div className={cn("space-y-2", className)}>
      <MapView
        className={cn("h-80 rounded-lg border border-slate-200 overflow-hidden")}
        initialCenter={DEFAULT_CENTER}
        initialZoom={12}
        onMapReady={handleMapReady}
      />
      <p className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1 px-0.5">
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-sky-500 mr-1" aria-hidden />
          Ubicación actual
        </span>
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 mr-1" aria-hidden />
          Origen declarado
        </span>
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-[#1e3a5f] mr-1" aria-hidden />
          Destino
        </span>
      </p>
    </div>
  );
}
