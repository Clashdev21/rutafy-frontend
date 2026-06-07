import {
  getAdminTrackingSessionDetail,
  listAdminTrackingSessions,
  type AdminTrackingSession,
  type AdminTrackingSessionDetail,
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
  trackingActorTypeLabel,
  trackingPurposeLabel,
  trackingStatusBadgeClass,
  trackingStatusLabel,
} from "@/lib/trackingSessionConstants";
import {
  formatDurationSeconds,
  formatHeartbeatAge,
  formatPointCount,
  formatTrackingDateTime,
} from "@/lib/trackingSessionFormatters";
import { Eye, RefreshCw, Route } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const LIST_LIMIT = 50;

export default function AdminTrackingSessionsPage() {
  const [sessions, setSessions] = useState<AdminTrackingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminTrackingSessionDetail | null>(null);

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

  const openDetail = useCallback(async (sessionId: string) => {
    const id = sessionId.trim();
    if (!id) return;

    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);

    try {
      const result = await getAdminTrackingSessionDetail(id);
      setDetail(result);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No fue posible cargar el resumen";
      setDetailError(message);
      toast.error(message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleDetailOpenChange = (open: boolean) => {
    setDetailOpen(open);
    if (!open) {
      setDetail(null);
      setDetailError(null);
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
                    <TableHead>Unidad / vehículo</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Propósito</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead className="text-right">Duración</TableHead>
                    <TableHead className="text-right">Puntos</TableHead>
                    <TableHead>Último heartbeat</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="max-w-[200px]">
                        <span
                          className="font-medium text-[#1E3A5F] line-clamp-2"
                          title={session.vehicle_label ?? undefined}
                        >
                          {session.vehicle_label?.trim() || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 whitespace-nowrap">
                        {trackingActorTypeLabel(session.actor_type)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 whitespace-nowrap">
                        {trackingPurposeLabel(session.purpose)}
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
                      <TableCell className="text-xs text-gray-600 whitespace-nowrap tabular-nums">
                        {formatTrackingDateTime(session.started_at)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-gray-700 whitespace-nowrap">
                        {formatDurationSeconds(session.duration_seconds)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-gray-700">
                        {formatPointCount(session.point_count)}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                        <span className="block tabular-nums">
                          {formatTrackingDateTime(session.last_heartbeat_at)}
                        </span>
                        <span className="block text-gray-400 mt-0.5">
                          {formatHeartbeatAge(session.last_heartbeat_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => void openDetail(session.id)}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          Ver resumen
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
      />
    </div>
  );
}
