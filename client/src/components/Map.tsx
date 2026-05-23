/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - "map-attached" → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - "standalone" → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - "data-only" → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
    __googleMapsLoading?: Promise<void>;
    __googleMapsLoaded?: boolean;
  }
}

const FORGE_KEY_PLACEHOLDER = "TU_FORGE_API_KEY_REAL";
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;
const MAP_SCRIPT_PARAMS =
  "v=weekly&libraries=marker,places,geocoding,geometry";
const MAP_ID =
  (typeof import.meta.env.VITE_GOOGLE_MAP_ID === "string" &&
    import.meta.env.VITE_GOOGLE_MAP_ID.trim()) ||
  "DEMO_MAP_ID";

function isValidForgeKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== FORGE_KEY_PLACEHOLDER;
}

function getGoogleMapsApiKey(): string | null {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (typeof key !== "string") return null;
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getMapsScriptUrl(): string {
  const forgeKey = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
  if (isValidForgeKey(forgeKey)) {
    return `${MAPS_PROXY_URL}/maps/api/js?key=${encodeURIComponent(forgeKey.trim())}&${MAP_SCRIPT_PARAMS}`;
  }

  const googleKey = getGoogleMapsApiKey();
  if (googleKey) {
    return `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleKey)}&${MAP_SCRIPT_PARAMS}`;
  }

  throw new Error("Missing Forge or Google Maps API key");
}

/**
 * Singleton pattern to load Google Maps script only once
 * Prevents "Google Maps JavaScript API multiple times" error
 */
function loadMapScript(): Promise<void> {
  // If already loaded, return immediately
  if (window.__googleMapsLoaded && window.google?.maps) {
    return Promise.resolve();
  }

  // If currently loading, return the existing promise
  if (window.__googleMapsLoading) {
    return window.__googleMapsLoading;
  }

  // Check if script tag already exists
  const existingScript = document.querySelector(
    'script[src*="maps/api/js"]'
  );
  if (existingScript && window.google?.maps) {
    window.__googleMapsLoaded = true;
    return Promise.resolve();
  }

  // Start loading
  let scriptUrl: string;
  try {
    scriptUrl = getMapsScriptUrl();
  } catch (err) {
    return Promise.reject(err);
  }

  window.__googleMapsLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.id = "google-maps-script";
    
    script.onload = () => {
      window.__googleMapsLoaded = true;
      resolve();
    };
    
    script.onerror = () => {
      window.__googleMapsLoading = undefined;
      console.error("Failed to load Google Maps script");
      reject(new Error("Failed to load Google Maps script"));
    };
    
    document.head.appendChild(script);
  });

  return window.__googleMapsLoading;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const initialized = useRef(false);

  const init = usePersistFn(async () => {
    // Prevent double initialization
    if (initialized.current) return;
    initialized.current = true;

    try {
      await loadMapScript();
      
      if (!mapContainer.current) {
        console.error("Map container not found");
        return;
      }
      
      if (!window.google?.maps) {
        console.error("Google Maps not available");
        return;
      }

      map.current = new window.google.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: true,
        mapId: MAP_ID,
      });
      
      if (onMapReady) {
        onMapReady(map.current);
      }
    } catch (error) {
      console.error("Error initializing map:", error);
      initialized.current = false; // Allow retry on error
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />
  );
}
