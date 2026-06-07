import type { AdminTrackingSessionDetail } from "@/api/tracking-sessions";
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
  formatTrackingDateTime,
  truncateUuid,
} from "@/lib/trackingSessionFormatters";
import { MapPin } from "lucide-react";

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

  events.push({
    key: "heartbeat",
    title: "Último heartbeat",
    at: session.last_heartbeat_at,
  });

  if (session.ended_at?.trim()) {
    events.push({
      key: "ended",
      title: "Cierre",
      at: session.ended_at,
    });
  }

  return events;
}

export function TrackingSessionDetailDialog({
  open,
  onOpenChange,
  loading,
  error,
  detail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  detail: AdminTrackingSessionDetail | null;
}) {
  const session = detail?.session;
  const stats = detail?.stats;
  const timeline = session ? buildTimeline(session) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1E3A5F]">Resumen operacional</DialogTitle>
          {session ? (
            <p
              className="text-xs font-mono text-gray-500 break-all"
              title={session.id}
            >
              {truncateUuid(session.id, 12, 8)}
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

            <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 space-y-3">
              <p className="text-xs font-semibold text-[#1E3A5F]">Datos principales</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#1E3A5F]">Métricas de captura</p>
              <TrackingSessionStatsGrid stats={stats} />
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

            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 p-6 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <MapPin className="h-5 w-5 text-gray-400" aria-hidden />
              </div>
              <p className="text-sm font-medium text-gray-700">
                Mapa de recorrido próximamente
              </p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                El backend aún no expone puntos GPS ni polyline para pintar la ruta.
              </p>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
