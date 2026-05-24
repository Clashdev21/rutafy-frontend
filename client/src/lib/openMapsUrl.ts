export type MapsProvider = "google" | "waze";

export function buildGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function buildWazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${encodeURIComponent(`${lat},${lng}`)}&navigate=yes`;
}

export function openMapsUrl(
  lat: number,
  lng: number,
  provider: MapsProvider = "google",
): void {
  if (typeof window === "undefined") return;
  const url = provider === "waze" ? buildWazeUrl(lat, lng) : buildGoogleMapsUrl(lat, lng);
  window.open(url, "_blank", "noopener,noreferrer");
}
