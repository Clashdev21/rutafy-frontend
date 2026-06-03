import AdminLayout from "@/components/AdminLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminRefreshToken,
} from "@/authAdminStorage";
import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";

type AdminProtectedRouteProps = {
  children: ReactNode;
};

function isAdminDevBypassEnabled(): boolean {
  return import.meta.env.VITE_ADMIN_DEV_BYPASS === "true";
}

export default function AdminProtectedRoute({
  children,
}: AdminProtectedRouteProps) {
  const { user, loading, isAdmin } = useAdminAuth();
  const [location, setLocation] = useLocation();

  const hasCredentials =
    Boolean(getAdminAccessToken()) || Boolean(getAdminRefreshToken());

  useEffect(() => {
    if (loading) return;

    if (location === "/admin") {
      if (hasCredentials && isAdmin) {
        setLocation("/admin/ops/map", { replace: true });
      }
      return;
    }

    if (!hasCredentials && !isAdminDevBypassEnabled()) {
      setLocation("/admin/login", { replace: true });
      return;
    }

    if (hasCredentials && !isAdmin) {
      clearAdminSession();
      setLocation("/admin/login", { replace: true });
    }
  }, [loading, location, hasCredentials, isAdmin, setLocation]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!isAdminDevBypassEnabled() && !hasCredentials) {
    return <DashboardLayoutSkeleton />;
  }

  if (!isAdmin && !isAdminDevBypassEnabled()) {
    return <DashboardLayoutSkeleton />;
  }

  const layoutUser =
    user ??
    (isAdminDevBypassEnabled()
      ? {
          user_id: "dev-bypass",
          name: "Admin (dev bypass)",
          email: null,
          phone: null,
          role: "admin",
        }
      : null);

  if (!layoutUser) {
    return <DashboardLayoutSkeleton />;
  }

  return <AdminLayout user={layoutUser}>{children}</AdminLayout>;
}
