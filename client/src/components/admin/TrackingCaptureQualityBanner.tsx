import type { AdminTrackingSessionStats } from "@/api/tracking-sessions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  captureQualityAlertClass,
  captureQualityAlertMessage,
  captureQualityDisplay,
  captureQualityHeroClass,
  captureQualityTextClass,
  normalizeCaptureQuality,
} from "@/lib/trackingSessionConstants";
import {
  formatCoveragePct,
  formatDurationSeconds,
} from "@/lib/trackingSessionFormatters";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";

function QualityAlertIcon({ tier }: { tier: ReturnType<typeof normalizeCaptureQuality> }) {
  switch (tier) {
    case "incomplete":
      return <ShieldAlert className="h-4 w-4" aria-hidden />;
    case "partial":
      return <AlertTriangle className="h-4 w-4" aria-hidden />;
    case "good":
      return <Info className="h-4 w-4" aria-hidden />;
    case "excellent":
      return <CheckCircle2 className="h-4 w-4" aria-hidden />;
    default:
      return <Info className="h-4 w-4" aria-hidden />;
  }
}

export function TrackingCaptureQualityHero({
  stats,
}: {
  stats: AdminTrackingSessionStats;
}) {
  const tier = normalizeCaptureQuality(stats.capture_quality);
  const hasQuality = tier != null || Boolean(stats.capture_quality?.trim());

  if (!hasQuality && stats.coverage_pct == null && stats.covered_seconds == null) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 space-y-3",
        captureQualityHeroClass(tier),
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
        Calidad de captura
      </p>
      <p
        className={cn(
          "text-2xl font-bold leading-tight",
          captureQualityTextClass(tier),
        )}
      >
        {captureQualityDisplay(stats.capture_quality)}
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="text-gray-700">
          <span className="font-medium text-gray-500">Cobertura GPS: </span>
          <span className="font-semibold tabular-nums">
            {formatCoveragePct(stats.coverage_pct)}
          </span>
        </span>
        <span className="text-gray-700">
          <span className="font-medium text-gray-500">Tiempo cubierto: </span>
          <span className="font-semibold tabular-nums">
            {formatDurationSeconds(stats.covered_seconds)}
          </span>
        </span>
      </div>
    </div>
  );
}

export function TrackingCaptureQualityAlert({
  stats,
}: {
  stats: AdminTrackingSessionStats;
}) {
  const tier = normalizeCaptureQuality(stats.capture_quality);
  const message = captureQualityAlertMessage(stats.capture_quality);
  if (!message) return null;

  return (
    <Alert className={captureQualityAlertClass(tier)}>
      <QualityAlertIcon tier={tier} />
      <AlertTitle>Interpretación de la captura</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
