/**
 * URL del WebSocket de tiempo real del API Rutafy, alineada con el mismo origen
 * que usa el cliente HTTP (VITE_RUTAFY_API_BASE o fallback público).
 *
 * El token va en query por limitación del API WebSocket del navegador (sin headers custom).
 */
export function buildRutafyRealtimeWebSocketUrl(accessToken: string): string | null {
  const trimmed = accessToken.trim();
  if (!trimmed) return null;

  const raw =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env.VITE_RUTAFY_API_BASE === "string"
      ? import.meta.env.VITE_RUTAFY_API_BASE.trim()
      : "";

  let baseForUrl: string;
  if (raw && /^https?:\/\//i.test(raw)) {
    baseForUrl = raw.replace(/\/+$/, "");
  } else {
    baseForUrl = "https://api.rutafy.app";
  }

  try {
    const u = new URL("/realtime", `${baseForUrl}/`);
    if (u.protocol === "https:") {
      u.protocol = "wss:";
    } else if (u.protocol === "http:") {
      u.protocol = "ws:";
    }
    u.searchParams.set("token", trimmed);
    return u.href;
  } catch {
    return null;
  }
}

/** @deprecated Use buildRutafyRealtimeWebSocketUrl — alias para compatibilidad con mensajero. */
export const buildMessengerRealtimeWebSocketUrl = buildRutafyRealtimeWebSocketUrl;
