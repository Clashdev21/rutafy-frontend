import type { AdminTrackingSession } from "@/api/tracking-sessions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  captureQualityBadgeClass,
  captureQualityDisplay,
  trackingPurposeLabel,
  trackingStatusBadgeClass,
  trackingStatusLabel,
} from "@/lib/trackingSessionConstants";
import { formatTrackingDateTime, truncateUuid } from "@/lib/trackingSessionFormatters";
import { ArrowLeft } from "lucide-react";

type Props = {
  session: AdminTrackingSession;
  captureQuality?: string | null;
  onBack: () => void;
};

export function TrackingRouteHeader({ session, captureQuality, onBack }: Props) {
  const quality = captureQuality ?? session.capture_quality;

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 -ml-2 text-gray-600"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden />
        Volver a Trazabilidad
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Resumen operacional</h1>
          <p className="text-sm text-gray-500">
            Trazabilidad histórica GPS capturada desde Android.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-gray-700">
            <span className="font-mono text-xs text-gray-500" title={session.id}>
              {truncateUuid(session.id)}
            </span>
            <span className="text-gray-300">·</span>
            <span className="font-medium">{session.vehicle_label?.trim() || "—"}</span>
            <span className="text-gray-300">·</span>
            <span>{trackingPurposeLabel(session.purpose)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {session.status ? (
            <Badge
              variant="outline"
              className={`text-xs ${trackingStatusBadgeClass(session.status)}`}
            >
              {trackingStatusLabel(session.status)}
            </Badge>
          ) : null}
          {quality?.trim() ? (
            <Badge
              variant="outline"
              className={`text-xs ${captureQualityBadgeClass(quality)}`}
            >
              {captureQualityDisplay(quality)}
            </Badge>
          ) : null}
          <span className="text-xs text-gray-500 tabular-nums">
            Inicio {formatTrackingDateTime(session.started_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
