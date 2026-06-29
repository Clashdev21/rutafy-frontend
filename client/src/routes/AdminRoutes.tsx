import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import AdminCompanies from "@/pages/admin/AdminCompanies";
import AdminOperationalTransportersPage from "@/pages/admin/AdminOperationalTransportersPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminDispatchAlerts from "@/pages/admin/AdminDispatchAlerts";
import AdminMensajerosPage from "@/pages/admin/AdminMensajerosPage";
import AdminNotificationsPage from "@/pages/admin/AdminNotificationsPage";
import AdminNodes from "@/pages/admin/AdminNodes";
import AdminOperationalControlPage from "@/pages/admin/AdminOperationalControlPage";
import AdminOpsMapPage from "@/pages/admin/AdminOpsMapPage";
import AdminPortexDeclarationsPage from "@/pages/admin/AdminPortexDeclarationsPage";
import AdminPortexManualReviewPage from "@/pages/admin/AdminPortexManualReviewPage";
import AdminServicesPage from "@/pages/admin/AdminServicesPage";
import AdminTrackingAlertsPage from "@/pages/admin/AdminTrackingAlertsPage";
import AdminTrackingSessionRoutePage from "@/pages/admin/AdminTrackingSessionRoutePage";
import AdminTrackingSessionsPage from "@/pages/admin/AdminTrackingSessionsPage";
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
const GuardedOperationalControl = withAdminGuard(AdminOperationalControlPage);
const GuardedCompanies = withAdminGuard(AdminOperationalTransportersPage);
const GuardedClients = withAdminGuard(AdminCompanies);
const GuardedUsers = withAdminGuard(AdminUsers);
const GuardedServices = withAdminGuard(AdminServicesPage);
const GuardedNodes = withAdminGuard(AdminNodes);
const GuardedAlerts = withAdminGuard(AdminDispatchAlerts);
const GuardedMensajeros = withAdminGuard(AdminMensajerosPage);
const GuardedOpsMap = withAdminGuard(AdminOpsMapPage);
const GuardedTracking = withAdminGuard(AdminTrackingSessionsPage);
const GuardedTrackingAlerts = withAdminGuard(AdminTrackingAlertsPage);
const GuardedTrackingRoute = withAdminGuard(AdminTrackingSessionRoutePage);
const GuardedNotifications = withAdminGuard(AdminNotificationsPage);
const GuardedDeclarations = withAdminGuard(AdminPortexDeclarationsPage);
const GuardedManualReview = withAdminGuard(AdminPortexManualReviewPage);

/** Rutas admin protegidas (login en App.tsx como /admin/login). */
export const adminGuardedRouteEntries = [
  { path: "/admin", component: GuardedOperationalControl },
  { path: "/admin/operational-control", component: GuardedOperationalControl },
  { path: "/admin/dashboard", component: GuardedDashboard },
  { path: "/admin/companies", component: GuardedCompanies },
  { path: "/admin/clients", component: GuardedClients },
  { path: "/admin/users", component: GuardedUsers },
  { path: "/admin/services", component: GuardedServices },
  { path: "/admin/nodes", component: GuardedNodes },
  { path: "/admin/alerts", component: GuardedAlerts },
  { path: "/admin/declarations", component: GuardedDeclarations },
  { path: "/admin/manual-review", component: GuardedManualReview },
  { path: "/admin/mensajeros", component: GuardedMensajeros },
  { path: "/admin/tracking-alerts", component: GuardedTrackingAlerts },
  { path: "/admin/tracking/:sessionId", component: GuardedTrackingRoute },
  { path: "/admin/tracking", component: GuardedTracking },
  { path: "/admin/notifications", component: GuardedNotifications },
  { path: "/admin/ops/map", component: GuardedOpsMap },
  { path: "/admin/live-operations", component: GuardedOpsMap },
] as const;
