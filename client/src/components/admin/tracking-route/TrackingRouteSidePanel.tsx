import type {
  AdminTrackingSessionDetail,
  AdminTrackingSessionRoute,
} from "@/api/tracking-sessions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  trackingActorTypeLabel,
  trackingPurposeLabel,
  trackingStatusLabel,
} from "@/lib/trackingSessionConstants";
import {
  formatTrackingDateTime,
  truncateUuid,
} from "@/lib/trackingSessionFormatters";
import { TrackingRouteTimeline } from "./TrackingRouteTimeline";

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

type Props = {
  detail: AdminTrackingSessionDetail;
  route: AdminTrackingSessionRoute | null;
};

export function TrackingRouteSidePanel({ detail, route }: Props) {
  const session = detail.session;

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-[#1E3A5F]">Detalle de sesión</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <DetailField label="Vehículo" value={session.vehicle_label?.trim() || "—"} />
          <DetailField label="Propósito" value={trackingPurposeLabel(session.purpose)} />
          <DetailField label="Estado" value={trackingStatusLabel(session.status)} />
          <DetailField label="Actor" value={trackingActorTypeLabel(session.actor_type)} />
          <DetailField
            label="Actor ID"
            value={truncateUuid(session.actor_id)}
            mono
          />
          <DetailField
            label="Usuario"
            value={truncateUuid(session.owner_user_id)}
            mono
          />
          <DetailField
            label="Inicio"
            value={formatTrackingDateTime(session.started_at)}
          />
          <DetailField
            label="Cierre"
            value={formatTrackingDateTime(session.ended_at)}
          />
        </div>

        <TrackingRouteTimeline session={session} route={route} />
      </CardContent>
    </Card>
  );
}
