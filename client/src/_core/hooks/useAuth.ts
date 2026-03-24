import { getLoginUrl } from "@/const";
import { http } from "@/api/http";
import { clearToken, getToken } from "@/authStorage";
import {
  normalizeAuthUser,
  readCachedAuthUser,
  RUNTIME_USER_INFO_KEY,
  type AuthUser,
} from "@/authUser";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};

  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    if (!getToken()) return null;
    return readCachedAuthUser();
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  /** Si /me no trae actor_id pero el caché sí, conservamos el operativo (evita modo manual erróneo). */
  function mergeActorIdFromCache(next: AuthUser | null): AuthUser | null {
    if (!next) return null;
    if (next.actor_id != null && String(next.actor_id).trim() !== "") return next;
    const cached = readCachedAuthUser();
    const aid = cached?.actor_id;
    if (aid != null && String(aid).trim() !== "") {
      return { ...next, actor_id: aid };
    }
    return next;
  }

  const loadMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await http.get("/v1/auth/me");
      const normalized = mergeActorIdFromCache(normalizeAuthUser(data));
      setUser(normalized);
      setError(normalized ? null : new Error("Respuesta /me inválida"));
    } catch (e: unknown) {
      setUser(null);
      setError(e);
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        clearToken();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    try {
      if (user !== null) {
        localStorage.setItem(RUNTIME_USER_INFO_KEY, JSON.stringify(user));
      } else if (!getToken()) {
        // Solo borrar caché cuando no hay token (logout o 401); si hay token, /me puede estar en curso
        localStorage.setItem(RUNTIME_USER_INFO_KEY, JSON.stringify(null));
      }
    } catch {
      /* ignore */
    }
  }, [user]);

  const logout = useCallback(async () => {
    clearToken();
    setUser(null);
    setError(null);
    try {
      localStorage.setItem(RUNTIME_USER_INFO_KEY, JSON.stringify(null));
    } catch {
      /* ignore */
    }
  }, []);

  const state = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: Boolean(user),
    }),
    [user, loading, error]
  );

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;

    const pathOnly =
      redirectPath.startsWith("http://") || redirectPath.startsWith("https://")
        ? (() => {
            try {
              return new URL(redirectPath).pathname;
            } catch {
              return redirectPath;
            }
          })()
        : redirectPath;

    if (window.location.pathname === pathOnly) return;

    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, loading, state.user]);

  return {
    ...state,
    refresh: () => loadMe(),
    logout,
  };
}
