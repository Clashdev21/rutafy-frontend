import axios, { type InternalAxiosRequestConfig } from "axios";
import {
  clearSession,
  getRefreshToken,
  getToken,
  setToken,
} from "@/authStorage";
import { RUNTIME_USER_INFO_KEY } from "@/authUser";

declare module "axios" {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    skipAuthRefresh?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
    skipAuthRefresh?: boolean;
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_RUTAFY_API_BASE,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

/** Cliente sin interceptors: evita bucles al llamar /v1/auth/refresh. */
const refreshHttp = axios.create({
  baseURL: import.meta.env.VITE_RUTAFY_API_BASE,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

function isPublicAuthRoute(config: InternalAxiosRequestConfig): boolean {
  const path = `${config.baseURL ?? ""}${config.url ?? ""}`;
  const url = config.url ?? "";
  return (
    url.includes("/v1/auth/login") ||
    url.includes("/v1/auth/register-transportista") ||
    url.includes("/v1/auth/refresh") ||
    url.includes("/v1/auth/logout") ||
    path.includes("/v1/auth/login") ||
    path.includes("/v1/auth/register-transportista") ||
    path.includes("/v1/auth/refresh") ||
    path.includes("/v1/auth/logout")
  );
}

function isAuthRefreshExempt(config: InternalAxiosRequestConfig): boolean {
  if (config.skipAuthRefresh) return true;
  return isPublicAuthRoute(config);
}

function redirectToLoginIfNeeded(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

function dispatchAuthLogoutEvent(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("auth:logout"));
}

function clearAuthStorageAndCache(): void {
  clearSession();
  dispatchAuthLogoutEvent();
  try {
    localStorage.removeItem(RUNTIME_USER_INFO_KEY);
  } catch {
    /* ignore */
  }
}

let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessTokenShared(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async (): Promise<string | null> => {
      try {
        const rt = getRefreshToken();
        if (!rt) return null;
        const { data } = await refreshHttp.post<{
          access_token?: string;
          accessToken?: string;
        }>("/v1/auth/refresh", { refresh_token: rt });
        const at = data?.access_token ?? data?.accessToken;
        if (typeof at === "string" && at.trim()) {
          const trimmed = at.trim();
          setToken(trimmed);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("auth:token-refreshed"));
          }
          return trimmed;
        }
        return null;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!isPublicAuthRoute(config)) {
    const token = getToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const prevRequest = error.config as InternalAxiosRequestConfig | undefined;
    if (!prevRequest) {
      return Promise.reject(error);
    }

    if (isAuthRefreshExempt(prevRequest)) {
      return Promise.reject(error);
    }

    if (prevRequest._retry) {
      clearAuthStorageAndCache();
      redirectToLoginIfNeeded();
      return Promise.reject(error);
    }

    const rt = getRefreshToken();
    if (!rt) {
      clearAuthStorageAndCache();
      redirectToLoginIfNeeded();
      return Promise.reject(error);
    }

    try {
      const newAccess = await refreshAccessTokenShared();
      if (!newAccess) {
        clearAuthStorageAndCache();
        redirectToLoginIfNeeded();
        return Promise.reject(error);
      }
      prevRequest.headers = prevRequest.headers ?? {};
      prevRequest.headers.Authorization = `Bearer ${newAccess}`;
      prevRequest._retry = true;
      return http(prevRequest);
    } catch {
      clearAuthStorageAndCache();
      redirectToLoginIfNeeded();
      return Promise.reject(error);
    }
  },
);
