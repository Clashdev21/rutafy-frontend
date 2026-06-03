const RUTAFY_ADMIN_ACCESS_TOKEN_KEY = "rutafy_admin_access_token";
const RUTAFY_ADMIN_REFRESH_TOKEN_KEY = "rutafy_admin_refresh_token";
const RUTAFY_ADMIN_USER_KEY = "rutafy_admin_user";

export function getAdminAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(RUTAFY_ADMIN_ACCESS_TOKEN_KEY);
  return v && v.trim() ? v.trim() : null;
}

export function setAdminAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RUTAFY_ADMIN_ACCESS_TOKEN_KEY, token.trim());
}

export function getAdminRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(RUTAFY_ADMIN_REFRESH_TOKEN_KEY);
  return v && v.trim() ? v.trim() : null;
}

export function setAdminRefreshToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RUTAFY_ADMIN_REFRESH_TOKEN_KEY, token.trim());
}

export function getAdminUser<T = unknown>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RUTAFY_ADMIN_USER_KEY);
    if (raw == null || raw === "" || raw === "null") return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setAdminUser(user: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RUTAFY_ADMIN_USER_KEY, JSON.stringify(user));
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RUTAFY_ADMIN_ACCESS_TOKEN_KEY);
  localStorage.removeItem(RUTAFY_ADMIN_REFRESH_TOKEN_KEY);
  localStorage.removeItem(RUTAFY_ADMIN_USER_KEY);
}

export function hasAdminSession(): boolean {
  return Boolean(getAdminAccessToken()) || Boolean(getAdminRefreshToken());
}
