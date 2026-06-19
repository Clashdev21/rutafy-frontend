import type { AdminTrackingSessionStats } from "@/api/tracking-sessions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const LOW_COVERAGE_THRESHOLD_PCT = 70;

export function TrackingObservedDistanceAlert({
  stats,
}: {
  stats: AdminTrackingSessionStats;
}) {
  const coverage = stats.coverage_pct;
  if (coverage == null || !Number.isFinite(coverage) || coverage >= LOW_COVERAGE_THRESHOLD_PCT) {
    return null;
  }

  return (
    <Alert className="border-slate-200 bg-slate-50 text-slate-800">
      <Info className="h-4 w-4" aria-hidden />
      <AlertDescription>
        La distancia observada puede ser inferior a la distancia real debido a
        interrupciones de captura GPS.
      </AlertDescription>
    </Alert>
  );
}
