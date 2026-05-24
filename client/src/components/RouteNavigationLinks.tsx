import { openMapsUrl } from "@/lib/openMapsUrl";

export type RouteCoords = { lat: number; lng: number };

type RouteNavigationLinksProps = {
  coords: RouteCoords | null;
  labelPrefix?: string;
};

export function RouteNavigationLinks({ coords, labelPrefix }: RouteNavigationLinksProps) {
  if (coords == null) return null;

  const prefix = labelPrefix?.trim() ?? "Ubicación";
  const mapsLabel = `${prefix} en Google Maps`;
  const wazeLabel = `${prefix} en Waze`;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        aria-label={mapsLabel}
        onClick={() => openMapsUrl(coords.lat, coords.lng, "google")}
      >
        Google Maps
      </button>
      <button
        type="button"
        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        aria-label={wazeLabel}
        onClick={() => openMapsUrl(coords.lat, coords.lng, "waze")}
      >
        Waze
      </button>
    </div>
  );
}
