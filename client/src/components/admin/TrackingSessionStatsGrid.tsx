import type { AdminTrackingSessionStats } from "@/api/tracking-sessions";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatAccuracyMeters,
  formatDurationSeconds,
  formatPercent,
  formatPointCount,
  formatSpeedMps,
} from "@/lib/trackingSessionFormatters";
import {
  Activity,
  Clock,
  Gauge,
  MapPin,
  PauseCircle,
  Target,
  Timer,
} from "lucide-react";

type StatItem = {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Clock;
};

function buildStatItems(stats: AdminTrackingSessionStats): StatItem[] {
  return [
    {
      label: "Duración total",
      value: formatDurationSeconds(stats.duration_seconds),
      icon: Clock,
    },
    {
      label: "Puntos capturados",
      value: formatPointCount(stats.point_count),
      icon: MapPin,
    },
    {
      label: "Precisión promedio",
      value: formatAccuracyMeters(stats.avg_accuracy_m),
      icon: Target,
    },
    {
      label: "Velocidad promedio",
      value: formatSpeedMps(stats.avg_speed_mps),
      sub:
        stats.avg_speed_mps != null && Number.isFinite(stats.avg_speed_mps)
          ? `${Math.round(stats.avg_speed_mps * 100) / 100} m/s`
          : undefined,
      icon: Gauge,
    },
    {
      label: "Accuracy >50 m",
      value: formatPercent(stats.pct_accuracy_over_50m),
      icon: Activity,
    },
    {
      label: "Gaps >60 s",
      value:
        stats.gap_count_over_60s != null && Number.isFinite(stats.gap_count_over_60s)
          ? String(Math.round(stats.gap_count_over_60s))
          : "—",
      icon: PauseCircle,
    },
    {
      label: "Gap máximo",
      value: formatDurationSeconds(stats.max_gap_seconds),
      icon: Timer,
    },
  ];
}

export function TrackingSessionStatsGrid({
  stats,
}: {
  stats: AdminTrackingSessionStats;
}) {
  const items = buildStatItems(stats);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} className="border-gray-100 shadow-none">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{item.label}</span>
            </div>
            <p className="text-base font-semibold text-[#1E3A5F] tabular-nums">
              {item.value}
            </p>
            {item.sub ? (
              <p className="text-[11px] text-gray-400 tabular-nums">{item.sub}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
