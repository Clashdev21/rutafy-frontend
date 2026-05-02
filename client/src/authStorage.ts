const RUTAFY_ACCESS_TOKEN_KEY = "rutafy_access_token";
const RUTAFY_REFRESH_TOKEN_KEY = "rutafy_refresh_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(RUTAFY_ACCESS_TOKEN_KEY);
  return v && v.trim() ? v.trim() : null;
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RUTAFY_ACCESS_TOKEN_KEY, token.trim());
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RUTAFY_ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(RUTAFY_REFRESH_TOKEN_KEY);
  return v && v.trim() ? v.trim() : null;
}

export function setRefreshToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RUTAFY_REFRESH_TOKEN_KEY, token.trim());
}

export function clearRefreshToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RUTAFY_REFRESH_TOKEN_KEY);
}

/** Borra access_token y refresh_token (sesión completa en almacenamiento local). */
export function clearSession(): void {
  clearToken();
  clearRefreshToken();
}
