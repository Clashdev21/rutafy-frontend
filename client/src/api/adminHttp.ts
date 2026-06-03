import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminRefreshToken,
  setAdminAccessToken,
  setAdminRefreshToken,
} from "@/authAdminStorage";

declare module "axios" {
  export interface AxiosRequestConfig {
    _adminRetry?: boolean;
    skipAdminRefresh?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    _adminRetry?: boolean;
    skipAdminRefresh?: boolean;
  }
}

function getAdminKey(): string {
  const key = import.meta.env.VITE_RUTAFY_ADMIN_KEY;
  return typeof key === "string" ? key.trim() : "";
}

function isPublicAdminAuthRoute(config: InternalAxiosRequestConfig): boolean {
  const url = config.url ?? "";
  return (
    url.includes("/v1/admin/auth/login") ||
    url.includes("/v1/admin/auth/refresh") ||
    url.includes("/v1/admin/auth/logout")
  );
}

function isAdminRefreshExempt(config: InternalAxiosRequestConfig): boolean {
  if (config.skipAdminRefresh) return true;
  return isPublicAdminAuthRoute(config);
}

function redirectToAdminLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/admin/login") {
    window.location.href = "/admin/login";
  }
}

function applyAdminAuthHeaders(config: InternalAxiosRequestConfig): void {
  const headers = config.headers ?? {};
  const access = getAdminAccessToken();
  const adminKey = getAdminKey();

  if (access) {
    if (headers instanceof AxiosHeaders) {
      headers.set("Authorization", `Bearer ${access}`);
    } else {
      (headers as Record<string, string>).Authorization = `Bearer ${access}`;
    }
  } else if (adminKey) {
    if (headers instanceof AxiosHeaders) {
      headers.set("x-admin-key", adminKey);
    } else {
      (headers as Record<string, string>)["x-admin-key"] = adminKey;
    }
  }

  config.headers = headers;
}

export const adminHttp = axios.create({
  baseURL: import.meta.env.VITE_RUTAFY_API_BASE,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

/** Cliente sin interceptors de refresh (evita bucles). */
export const adminRefreshHttp = axios.create({
  baseURL: import.meta.env.VITE_RUTAFY_API_BASE,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

adminRefreshHttp.interceptors.request.use((config) => {
  applyAdminAuthHeaders(config);
  return config;
});

let adminRefreshInFlight: Promise<string | null> | null = null;

function refreshAdminAccessTokenShared(): Promise<string | null> {
  if (!adminRefreshInFlight) {
    adminRefreshInFlight = (async (): Promise<string | null> => {
      try {
        const rt = getAdminRefreshToken();
        if (!rt) return null;
        const { data } = await adminRefreshHttp.post<{
          access_token?: string;
          accessToken?: string;
          refresh_token?: string;
          refreshToken?: string;
        }>("/v1/admin/auth/refresh", { refresh_token: rt });
        const at = data?.access_token ?? data?.accessToken;
        if (typeof at !== "string" || !at.trim()) return null;
        const trimmed = at.trim();
        setAdminAccessToken(trimmed);
        const nextRt = data?.refresh_token ?? data?.refreshToken;
        if (typeof nextRt === "string" && nextRt.trim()) {
          setAdminRefreshToken(nextRt.trim());
        }
        return trimmed;
      } catch {
        return null;
      } finally {
        adminRefreshInFlight = null;
      }
    })();
  }
  return adminRefreshInFlight;
}

adminHttp.interceptors.request.use((config) => {
  if (!isPublicAdminAuthRoute(config)) {
    applyAdminAuthHeaders(config);
  }
  return config;
});

adminHttp.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const prevRequest = error.config as InternalAxiosRequestConfig | undefined;
    if (!prevRequest) {
      return Promise.reject(error);
    }

    if (isAdminRefreshExempt(prevRequest)) {
      return Promise.reject(error);
    }

    if (prevRequest._adminRetry) {
      clearAdminSession();
      redirectToAdminLogin();
      return Promise.reject(error);
    }

    const rt = getAdminRefreshToken();
    if (!rt) {
      clearAdminSession();
      redirectToAdminLogin();
      return Promise.reject(error);
    }

    try {
      const newAccess = await refreshAdminAccessTokenShared();
      if (!newAccess) {
        clearAdminSession();
        redirectToAdminLogin();
        return Promise.reject(error);
      }
      prevRequest.headers = prevRequest.headers ?? {};
      if (prevRequest.headers instanceof AxiosHeaders) {
        prevRequest.headers.set("Authorization", `Bearer ${newAccess}`);
        prevRequest.headers.delete("x-admin-key");
      } else {
        (prevRequest.headers as Record<string, string>).Authorization =
          `Bearer ${newAccess}`;
        delete (prevRequest.headers as Record<string, string>)["x-admin-key"];
      }
      prevRequest._adminRetry = true;
      return adminHttp(prevRequest);
    } catch {
      clearAdminSession();
      redirectToAdminLogin();
      return Promise.reject(error);
    }
  },
);

export function parseAdminApiError(
  data: { error?: string; message?: string } | null,
  fallback: string,
): string {
  return data?.error || data?.message || fallback;
}
