import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import AdminCompanies from "@/pages/admin/AdminCompanies";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminDispatchAlerts from "@/pages/admin/AdminDispatchAlerts";
import AdminMensajerosPage from "@/pages/admin/AdminMensajerosPage";
import AdminNodes from "@/pages/admin/AdminNodes";
import AdminOpsMapPage from "@/pages/admin/AdminOpsMapPage";
import AdminServicesPage from "@/pages/admin/AdminServicesPage";
import AdminUsers from "@/pages/admin/AdminUsers";
import type { ComponentType } from "react";

function withAdminGuard<P extends object>(Component: ComponentType<P>) {
  return function GuardedAdminPage(props: P) {
    return (
      <AdminProtectedRoute>
        <Component {...props} />
      </AdminProtectedRoute>
    );
  };
}

const GuardedDashboard = withAdminGuard(AdminDashboard);
const GuardedCompanies = withAdminGuard(AdminCompanies);
const GuardedUsers = withAdminGuard(AdminUsers);
const GuardedServices = withAdminGuard(AdminServicesPage);
const GuardedNodes = withAdminGuard(AdminNodes);
const GuardedAlerts = withAdminGuard(AdminDispatchAlerts);
const GuardedMensajeros = withAdminGuard(AdminMensajerosPage);
const GuardedOpsMap = withAdminGuard(AdminOpsMapPage);

/** Rutas admin protegidas (login en App.tsx como /admin/login). */
export const adminGuardedRouteEntries = [
  { path: "/admin", component: GuardedDashboard },
  { path: "/admin/companies", component: GuardedCompanies },
  { path: "/admin/users", component: GuardedUsers },
  { path: "/admin/services", component: GuardedServices },
  { path: "/admin/nodes", component: GuardedNodes },
  { path: "/admin/alerts", component: GuardedAlerts },
  { path: "/admin/mensajeros", component: GuardedMensajeros },
  { path: "/admin/ops/map", component: GuardedOpsMap },
] as const;
