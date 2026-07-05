import {
  getAdminTrackingSessionDetail,
  getAdminTrackingSessionPoints,
  listAdminTrackingSessions,
  resolveTrackingSessionId,
  type AdminTrackingSession,
  type AdminTrackingSessionCloseResult,
  type AdminTrackingSessionDetail,
  type TrackingRoutePoint,
} from "@/api/tracking-sessions";
import { TrackingSessionDetailDialog } from "@/components/admin/TrackingSessionDetailDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  captureQualityBadgeClass,
  captureQualityDisplay,
  trackingPurposeLabel,
  trackingStatusBadgeClass,
  trackingStatusLabel,
} from "@/lib/trackingSessionConstants";
import {
  formatAccuracyMeters,
  formatDurationMinutes,
  formatHeartbeatAge,
  formatPointCount,
  formatSpeedKmh,
  formatTrackingDateTime,
  truncateUuid,
} from "@/lib/trackingSessionFormatters";
import { Eye, Map, RefreshCw, Route } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const LIST_LIMIT = 50;

function resolveListDurationMinutes(session: AdminTrackingSession): number | null {
  if (session.duration_minutes != null && Number.isFinite(session.duration_minutes)) {
    return session.duration_minutes;
  }
  if (session.duration_seconds != null && Number.isFinite(session.duration_seconds)) {
    return session.duration_seconds / 60;
  }
  return null;
}

function resolveListPointsCount(session: AdminTrackingSession): number | null {
  return session.points_count ?? session.point_count ?? null;
}

export default function AdminTrackingSessionsPage() {
  const [, setLocation] = useLocation();
  const [sessions, setSessions] = useState<AdminTrackingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminTrackingSessionDetail | null>(null);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [points, setPoints] = useState<TrackingRoutePoint[]>([]);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listAdminTrackingSessions({ limit: LIST_LIMIT });
      setSessions(result.sessions);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No fue posible cargar las sesiones";
      setError(message);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const applyCloseToList = useCallback((result: AdminTrackingSessionCloseResult) => {
    const sid = result.session.session_id;
    setSessions((prev) =>
      prev.map((s) =>
        resolveTrackingSessionId(s) === sid
          ? {
              ...s,
              status: result.session.status,
              ended_at: result.session.ended_at ?? s.ended_at,
            }
          : s,
      ),
    );
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

  const openDetail = useCallback(async (sessionId: string) => {
    const id = sessionId.trim();
    if (!id) return;

    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    setPoints([]);
    setPointsError(null);
    setPointsLoading(true);

    try {
      const [detailResult, pointsResult] = await Promise.all([
        getAdminTrackingSessionDetail(id),
        getAdminTrackingSessionPoints(id, 20).catch((e: unknown) => {
          const message =
            e instanceof Error ? e.message : "No fue posible cargar los puntos";
          setPointsError(message);
          return null;
        }),
      ]);
      setDetail(detailResult);
      if (pointsResult) {
        setPoints(pointsResult.points);
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No fue posible cargar el resumen";
      setDetailError(message);
      toast.error(message);
    } finally {
      setDetailLoading(false);
      setPointsLoading(false);
    }
  }, []);

  const handleDetailOpenChange = (open: boolean) => {
    setDetailOpen(open);
    if (!open) {
      setDetail(null);
      setDetailError(null);
      setPoints([]);
      setPointsError(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <Route className="h-6 w-6 shrink-0 text-[#2A9D8F]" aria-hidden />
            Trazabilidad
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Historial de sesiones GPS capturadas desde Android.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={isLoading}
          onClick={() => void loadSessions()}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            aria-hidden
          />
          Recargar
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-[#1E3A5F]">
            Sesiones de captura
            {!isLoading && !error ? (
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({sessions.length})
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-500 py-10 text-center">
              Cargando sesiones…
            </p>
          ) : error ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-red-600">{error}</p>
              <Button type="button" variant="outline" onClick={() => void loadSessions()}>
                Reintentar
              </Button>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">
              No hay sesiones de captura registradas todavía.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session ID</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Puntos</TableHead>
                    <TableHead className="text-right">Duración</TableHead>
                    <TableHead className="text-right">Precisión</TableHead>
                    <TableHead className="text-right">Velocidad</TableHead>
                    <TableHead>Última captura</TableHead>
                    <TableHead>Calidad</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => {
                    const sid = resolveTrackingSessionId(session);
                    return (
                      <TableRow key={sid}>
                        <TableCell className="font-mono text-[10px] text-gray-600 max-w-[120px]">
                          <span title={sid}>{truncateUuid(sid, 8, 6)}</span>
                        </TableCell>
                        <TableCell className="max-w-[140px]">
                          <span
                            className="font-medium text-[#1E3A5F] line-clamp-2 text-sm"
                            title={session.vehicle_label ?? undefined}
                          >
                            {session.vehicle_label?.trim() || "—"}
                          </span>
                          <span className="block text-[10px] text-gray-400 mt-0.5">
                            {trackingPurposeLabel(session.purpose)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {session.status ? (
                            <Badge
                              variant="outline"
                              className={`text-xs ${trackingStatusBadgeClass(session.status)}`}
                            >
                              {trackingStatusLabel(session.status)}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-gray-700">
                          {formatPointCount(resolveListPointsCount(session))}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-gray-700 whitespace-nowrap">
                          {formatDurationMinutes(resolveListDurationMinutes(session))}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-gray-700 whitespace-nowrap">
                          {formatAccuracyMeters(session.avg_accuracy_m)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-gray-700 whitespace-nowrap">
                          {formatSpeedKmh(session.avg_speed_kmh)}
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                          <span className="block tabular-nums">
                            {formatTrackingDateTime(
                              session.last_captured_at ?? session.last_heartbeat_at,
                            )}
                          </span>
                          <span className="block text-gray-400 mt-0.5">
                            {formatHeartbeatAge(
                              session.last_captured_at ?? session.last_heartbeat_at,
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {session.capture_quality?.trim() ? (
                            <Badge
                              variant="outline"
                              className={`text-xs ${captureQualityBadgeClass(session.capture_quality)}`}
                            >
                              {captureQualityDisplay(session.capture_quality)}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs gap-1"
                              onClick={() => void openDetail(sid)}
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden />
                              Detalle
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs gap-1 text-[#2A9D8F]"
                              onClick={() =>
                                setLocation(`/admin/tracking/${encodeURIComponent(sid)}`)
                              }
                            >
                              <Map className="h-3.5 w-3.5" aria-hidden />
                              Ruta
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TrackingSessionDetailDialog
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
        loading={detailLoading}
        error={detailError}
        detail={detail}
        pointsLoading={pointsLoading}
        pointsError={pointsError}
        points={points}
        onSessionClosed={applyCloseToList}
        onRefreshList={() => void loadSessions()}
      />
    </div>
  );
}
