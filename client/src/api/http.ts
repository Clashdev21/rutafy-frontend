import axios, { type InternalAxiosRequestConfig } from "axios";
import { getToken } from "@/authStorage";

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