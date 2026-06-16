import type {
  AdminTrackingSessionDetail,
  AdminTrackingSessionRoute,
} from "@/api/tracking-sessions";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatAccuracyMeters,
  formatCoveragePct,
  formatDistanceKm,
  formatDurationSeconds,
  formatPointCount,
} from "@/lib/trackingSessionFormatters";
import {
  Clock,
  MapPin,
  PauseCircle,
  Radar,
  Route,
  Ruler,
  Target,
  Timer,
} from "lucide-react";

type Props = {
  detail: AdminTrackingSessionDetail;
  route: AdminTrackingSessionRoute | null;
};

type KpiItem = {
  label: string;
  value: string;
  icon: typeof Clock;
};

export function TrackingRouteKpiStrip({ detail, route }: Props) {
  const stats = detail.stats;
  const quality = route?.quality;

  const items: KpiItem[] = [
    {
      label: "Duración sesión",
      value: formatDurationSeconds(stats.duration_seconds),
      icon: Clock,
    },
    {
      label: "Cobertura GPS",
      value: formatCoveragePct(quality?.coverage_pct ?? stats.coverage_pct),
      icon: Radar,
    },
    {
      label: "Tiempo cubierto",
      value: formatDurationSeconds(quality?.covered_seconds ?? stats.covered_seconds),
      icon: Timer,
    },
    {
      label: "Puntos GPS",
      value: formatPointCount(route?.route_meta.point_count ?? stats.point_count),
      icon: MapPin,
    },
    {
      label: "Distancia",
      value: formatDistanceKm(route?.summary.distance_km),
      icon: Ruler,
    },
    {
      label: "Tramos GPS",
      value: formatPointCount(route?.route_meta.segment_count),
      icon: Route,
    },
    {
      label: "Gap máximo",
      value: formatDurationSeconds(
        quality?.max_gap_seconds ?? stats.max_gap_seconds,
      ),
      icon: PauseCircle,
    },
    {
      label: "Precisión promedio",
      value: formatAccuracyMeters(stats.avg_accuracy_m),
      icon: Target,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
      {items.map((item) => (
        <Card key={item.label} className="border-gray-100 shadow-none">
          <CardContent className="p-2.5 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-wide">
              <item.icon className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{item.label}</span>
            </div>
            <p className="text-sm font-semibold text-[#1E3A5F] tabular-nums truncate">
              {item.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
