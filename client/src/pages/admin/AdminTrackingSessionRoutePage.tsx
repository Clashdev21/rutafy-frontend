import {
  getAdminTrackingSessionDetail,
  getAdminTrackingSessionRoute,
  type AdminTrackingSessionCloseResult,
  type AdminTrackingSessionDetail,
  type AdminTrackingSessionRoute,
  type AdminTrackingSessionStats,
} from "@/api/tracking-sessions";
import { resolveTrackingSessionId } from "@/api/tracking-sessions";
import {
  TrackingCaptureQualityAlert,
  TrackingCaptureQualityHero,
} from "@/components/admin/TrackingCaptureQualityBanner";
import { TrackingObservedDistanceAlert } from "@/components/admin/tracking-route/TrackingObservedDistanceAlert";
import { TrackingRouteHeader } from "@/components/admin/tracking-route/TrackingRouteHeader";
import { TrackingRouteKpiStrip } from "@/components/admin/tracking-route/TrackingRouteKpiStrip";
import { TrackingRouteMap } from "@/components/admin/tracking-route/TrackingRouteMap";
import { TrackingRouteSidePanel } from "@/components/admin/tracking-route/TrackingRouteSidePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";

function mergeHeroStats(
  detail: AdminTrackingSessionDetail,
  route: AdminTrackingSessionRoute | null,
): AdminTrackingSessionStats {
  return {
    ...detail.stats,
    capture_quality: route?.quality.capture_quality ?? detail.stats.capture_quality,
    coverage_pct: route?.quality.coverage_pct ?? detail.stats.coverage_pct,
    covered_seconds: route?.quality.covered_seconds ?? detail.stats.covered_seconds,
    max_gap_seconds: route?.quality.max_gap_seconds ?? detail.stats.max_gap_seconds,
    gap_count_over_60s:
      route?.quality.gap_count_over_60s ?? detail.stats.gap_count_over_60s,
    point_count: route?.route_meta.point_count ?? detail.stats.point_count,
  };
}

export default function AdminTrackingSessionRoutePage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId?.trim() ?? "";
  const [, setLocation] = useLocation();

  const [detail, setDetail] = useState<AdminTrackingSessionDetail | null>(null);
  const [route, setRoute] = useState<AdminTrackingSessionRoute | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!sessionId) {
      setDetailError("Sesión no especificada");
      setRouteError("Sesión no especificada");
      setLoadingDetail(false);
      setLoadingRoute(false);
      return;
    }

    setLoadingDetail(true);
    setLoadingRoute(true);
    setDetailError(null);
    setRouteError(null);

    const detailPromise = getAdminTrackingSessionDetail(sessionId)
      .then((result) => {
        setDetail(result);
        setDetailError(null);
      })
      .catch((e: unknown) => {
        setDetail(null);
        setDetailError(
          e instanceof Error ? e.message : "No se encontró la sesión de captura",
        );
      })
      .finally(() => setLoadingDetail(false));

    const routePromise = getAdminTrackingSessionRoute(sessionId)
      .then((result) => {
        setRoute(result);
        setRouteError(null);
      })
      .catch((e: unknown) => {
        setRoute(null);
        setRouteError(
          e instanceof Error ? e.message : "No se pudo cargar el recorrido GPS",
        );
      })
      .finally(() => setLoadingRoute(false));

    await Promise.all([detailPromise, routePromise]);
  }, [sessionId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const heroStats = useMemo(
    () => (detail ? mergeHeroStats(detail, route) : null),
    [detail, route],
  );

  const handleSessionClosed = useCallback((result: AdminTrackingSessionCloseResult) => {
    const sid = result.session.session_id;
    setDetail((prev) =>
      prev && resolveTrackingSessionId(prev.session) === sid
        ? {
            ...prev,
            session: {
              ...prev.session,
              status: result.session.status,
              ended_at: result.session.ended_at ?? prev.session.ended_at,
            },
          }
        : prev,
    );
  }, []);

  const isLoading = loadingDetail || loadingRoute;

  if (!sessionId) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-red-600">Sesión no especificada.</p>
        <Button type="button" variant="outline" onClick={() => setLocation("/admin/tracking")}>
          Volver a Trazabilidad
        </Button>
      </div>
    );
  }

  if (isLoading && !detail && !route) {
    return (
      <p className="text-sm text-gray-500 py-16 text-center">Cargando resumen operacional…</p>
    );
  }

  if (detailError && !detail) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-red-600">{detailError}</p>
        <Button type="button" variant="outline" onClick={() => setLocation("/admin/tracking")}>
          Volver a Trazabilidad
        </Button>
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <div className="space-y-5">
      <TrackingRouteHeader
        session={detail.session}
        captureQuality={heroStats?.capture_quality}
        onBack={() => setLocation("/admin/tracking")}
        onSessionClosed={handleSessionClosed}
      />

      {heroStats ? <TrackingCaptureQualityHero stats={heroStats} /> : null}
      {heroStats ? <TrackingCaptureQualityAlert stats={heroStats} /> : null}
      {heroStats ? <TrackingObservedDistanceAlert stats={heroStats} /> : null}

      {route?.route_meta.truncated ? (
        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
          Ruta simplificada / truncada
          {route.route_meta.truncation_reason
            ? ` · ${route.route_meta.truncation_reason}`
            : ""}
        </Badge>
      ) : null}

      {routeError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {routeError}
        </div>
      ) : null}

      <TrackingRouteKpiStrip detail={detail} route={route} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[7fr_3fr]">
        <TrackingRouteMap route={route} />
        <TrackingRouteSidePanel detail={detail} route={route} />
      </div>
    </div>
  );
}
