import axios, { type InternalAxiosRequestConfig } from "axios";
import { clearToken, getToken } from "@/authStorage";
import { RUNTIME_USER_INFO_KEY } from "@/authUser";

export const http = axios.create({
  baseURL: import.meta.env.VITE_RUTAFY_API_BASE,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const path = `${config.baseURL ?? ""}${config.url ?? ""}`;
  const url = config.url ?? "";
  const isPublicAuthRoute =
    url.includes("/v1/auth/login") ||
    url.includes("/v1/auth/register-transportista") ||
    path.includes("/v1/auth/login") ||
    path.includes("/v1/auth/register-transportista");

  if (!isPublicAuthRoute) {
    const token = getToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearToken();
      try {
        localStorage.removeItem(RUNTIME_USER_INFO_KEY);
      } catch {
        /* ignore */
      }

      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);