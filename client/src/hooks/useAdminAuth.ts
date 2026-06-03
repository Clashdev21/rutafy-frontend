import {
  adminMe,
  normalizeAdminUser,
  type AdminUser,
} from "@/api/adminAuth";
import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminRefreshToken,
  getAdminUser,
  hasAdminSession,
  setAdminUser,
} from "@/authAdminStorage";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useAdminAuth() {
  const [user, setUser] = useState<AdminUser | null>(() => {
    if (!hasAdminSession()) return null;
    return getAdminUser<AdminUser>();
  });
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = getAdminAccessToken();
    const refresh = getAdminRefreshToken();
    if (!token && !refresh) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const me = await adminMe();
      setUser(me);
    } catch {
      clearAdminSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const isAdmin = user?.role === "admin";

  return useMemo(
    () => ({
      user,
      loading,
      isAdmin,
      isAuthenticated: Boolean(user && isAdmin),
      refresh: loadMe,
    }),
    [user, loading, isAdmin, loadMe],
  );
}

export function readCachedAdminUser(): AdminUser | null {
  const cached = getAdminUser<unknown>();
  return normalizeAdminUser(cached);
}
