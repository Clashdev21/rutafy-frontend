import type {
  AdminTrackingSessionCloseResult,
  AdminTrackingSessionDetail,
  TrackingRoutePoint,
} from "@/api/tracking-sessions";
import { resolveTrackingSessionId } from "@/api/tracking-sessions";
import {
  TrackingCaptureQualityAlert,
  TrackingCaptureQualityHero,
} from "@/components/admin/TrackingCaptureQualityBanner";
import { TrackingSessionCloseActions } from "@/components/admin/TrackingSessionCloseActions";
import { TrackingSessionStatsGrid } from "@/components/admin/TrackingSessionStatsGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  trackingActorTypeLabel,
  trackingPurposeLabel,
  trackingStatusBadgeClass,
  trackingStatusLabel,
} from "@/lib/trackingSessionConstants";
import {
  formatAccuracyMeters,
  formatSpeedKmh,
  formatTrackingDateTime,
  truncateUuid,
} from "@/lib/trackingSessionFormatters";
import { MapPin } from "lucide-react";
import { useLocation } from "wouter";

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-sm text-gray-900 break-all ${mono ? "font-mono text-xs" : ""}`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

type TimelineEvent = {
  key: string;
  title: string;
  at?: string | null;
};

function buildTimeline(session: AdminTrackingSessionDetail["session"]): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      key: "started",
      title: "Inicio de captura",
      at: session.started_at,
    },
  ];

  if (session.consent_at?.trim()) {
    events.push({
      key: "consent",
      title: "Consentimiento",
      at: session.consent_at,
    });
  }

  if (session.last_captured_at?.trim()) {
    events.push({
      key: "captured",
      title: "Última captura GPS",
      at: session.last_captured_at,
    });
  } else if (session.last_heartbeat_at?.trim()) {
    events.push({
      key: "heartbeat",
      title: "Último heartbeat",
      at: session.last_heartbeat_at,
    });
  }

  if (session.ended_at?.trim()) {
    events.push({
      key: "ended",
      title: "Cierre",
      at: session.ended_at,
    });
  }

  return events;
}

function PointsPreviewTable({ points }: { points: TrackingRoutePoint[] }) {
  if (points.length === 0) {
    return (
      <p className="text-xs text-gray-500 py-2">Sin puntos GPS registrados todavía.</p>
    );
  }

  const preview = points.slice(-8).reverse();

  return (
    <div className="overflow-x-auto rounded-md border border-gray-100">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-gray-500">
            <th className="px-2 py-1.5 font-medium">Capturado</th>
            <th className="px-2 py-1.5 font-medium">Coords</th>
            <th className="px-2 py-1.5 font-medium text-right">Precisión</th>
          </tr>
        </thead>
        <tbody>
          {preview.map((pt, i) => (
            <tr key={`${pt.captured_at}-${i}`} className="border-b border-gray-50 last:border-0">
              <td className="px-2 py-1.5 tabular-nums whitespace-nowrap text-gray-700">
                {formatTrackingDateTime(pt.captured_at)}
              </td>
              <td className="px-2 py-1.5 font-mono text-[10px] text-gray-600 whitespace-nowrap">
                {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">
                {formatAccuracyMeters(pt.accuracy_m)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TrackingSessionDetailDialog({
  open,
  onOpenChange,
  loading,
  error,
  detail,
  pointsLoading,
  pointsError,
  points,
  onSessionClosed,
  onRefreshList,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  detail: AdminTrackingSessionDetail | null;
  pointsLoading?: boolean;
  pointsError?: string | null;
  points?: TrackingRoutePoint[];
  onSessionClosed?: (result: AdminTrackingSessionCloseResult) => void;
  onRefreshList?: () => void;
}) {
  const [, setLocation] = useLocation();
  const session = detail?.session;
  const stats = detail?.stats;
  const timeline = session ? buildTimeline(session) : [];
  const sessionId = session ? resolveTrackingSessionId(session) : "";

  const handleClosed = (result: AdminTrackingSessionCloseResult) => {
    onSessionClosed?.(result);
    onRefreshList?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1E3A5F]">Resumen operacional</DialogTitle>
          {session ? (
            <p
              className="text-xs font-mono text-gray-500 break-all"
              title={sessionId}
            >
              {sessionId}
            </p>
          ) : null}
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            Cargando resumen…
          </p>
        ) : error ? (
          <p className="text-sm text-red-600 py-4">{error}</p>
        ) : session && stats ? (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {session.status ? (
                  <Badge
                    variant="outline"
                    className={trackingStatusBadgeClass(session.status)}
                  >
                    {trackingStatusLabel(session.status)}
                  </Badge>
                ) : null}
                {session.purpose ? (
                  <Badge variant="outline" className="text-xs text-gray-600">
                    {trackingPurposeLabel(session.purpose)}
                  </Badge>
                ) : null}
              </div>
              <TrackingSessionCloseActions
                sessionId={sessionId}
                status={session.status}
                size="sm"
                onCompleted={handleClosed}
              />
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 space-y-3">
              <p className="text-xs font-semibold text-[#1E3A5F]">Datos principales</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailField
                  label="Session ID"
                  value={sessionId}
                  mono
                />
                <DetailField
                  label="Unidad / vehículo"
                  value={session.vehicle_label?.trim() || "—"}
                />
                <DetailField
                  label="Actor"
                  value={trackingActorTypeLabel(session.actor_type)}
                />
                <DetailField
                  label="Actor ID"
                  value={truncateUuid(session.actor_id)}
                  mono
                />
                <DetailField
                  label="Owner user ID"
                  value={truncateUuid(session.owner_user_id)}
                  mono
                />
                <DetailField
                  label="Última captura"
                  value={formatTrackingDateTime(
                    session.last_captured_at ?? session.last_heartbeat_at,
                  )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#1E3A5F]">Métricas de captura</p>
              <TrackingCaptureQualityHero stats={stats} />
              <TrackingSessionStatsGrid stats={stats} />
              <TrackingCaptureQualityAlert stats={stats} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#1E3A5F]">Puntos GPS recientes</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-[#2A9D8F]"
                  onClick={() =>
                    setLocation(`/admin/tracking/${encodeURIComponent(sessionId)}`)
                  }
                >
                  <MapPin className="h-3.5 w-3.5 mr-1" aria-hidden />
                  Ver ruta completa
                </Button>
              </div>
              {pointsLoading ? (
                <p className="text-xs text-gray-500 py-2">Cargando puntos…</p>
              ) : pointsError ? (
                <p className="text-xs text-red-600 py-2">{pointsError}</p>
              ) : (
                <PointsPreviewTable points={points ?? []} />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#1E3A5F]">Timeline</p>
              <ul className="space-y-2">
                {timeline.map((ev) => (
                  <li
                    key={ev.key}
                    className="flex gap-3 rounded-md border border-gray-100 bg-white px-3 py-2.5"
                  >
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2A9D8F]"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800">{ev.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
                        {formatTrackingDateTime(ev.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
