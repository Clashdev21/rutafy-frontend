import type {
  AdminTrackingSessionDetail,
  AdminTrackingSessionRoute,
} from "@/api/tracking-sessions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatAccuracyMeters,
  formatCoveragePct,
  formatDistanceKm,
  formatDurationSeconds,
  formatPointCount,
} from "@/lib/trackingSessionFormatters";
import { countVisualSegments } from "@/lib/trackingRouteVisualSegments";
import {
  Clock,
  Info,
  Layers,
  MapPin,
  PauseCircle,
  Radar,
  Route,
  Ruler,
  Target,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Props = {
  detail: AdminTrackingSessionDetail;
  route: AdminTrackingSessionRoute | null;
};

type KpiItem = {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
  helpText?: string;
};

const OBSERVED_DISTANCE_HELP =
  "Corresponde únicamente a los kilómetros capturados por GPS. No representa necesariamente la distancia total del recorrido.";

function KpiLabel({ item }: { item: KpiItem }) {
  return (
    <div className="flex items-start gap-1 text-[10px] text-gray-500 uppercase tracking-wide leading-tight min-h-[2rem]">
      <item.icon className="h-3 w-3 shrink-0 mt-0.5" aria-hidden />
      <span className="line-clamp-2">{item.label}</span>
      {item.helpText ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="shrink-0 rounded-sm text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2A9D8F]"
              aria-label={`Ayuda: ${item.label}`}
            >
              <Info className="h-3 w-3" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-left normal-case tracking-normal">
            {item.helpText}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

export function TrackingRouteKpiStrip({ detail, route }: Props) {
  const stats = detail.stats;
  const quality = route?.quality;

  const items: KpiItem[] = [
    {
      id: "duration",
      label: "Duración sesión",
      value: formatDurationSeconds(stats.duration_seconds),
      icon: Clock,
    },
    {
      id: "coverage",
      label: "Cobertura GPS",
      value: formatCoveragePct(quality?.coverage_pct ?? stats.coverage_pct),
      icon: Radar,
    },
    {
      id: "covered-time",
      label: "Tiempo cubierto",
      value: formatDurationSeconds(quality?.covered_seconds ?? stats.covered_seconds),
      icon: Timer,
    },
    {
      id: "points",
      label: "Puntos GPS",
      value: formatPointCount(route?.route_meta.point_count ?? stats.point_count),
      icon: MapPin,
    },
    {
      id: "observed-distance",
      label: "Distancia observada",
      value: formatDistanceKm(route?.summary.distance_km),
      icon: Ruler,
      helpText: OBSERVED_DISTANCE_HELP,
    },
    {
      id: "visual-segments",
      label: "Tramos visuales",
      value: formatPointCount(countVisualSegments(route)),
      icon: Layers,
    },
    {
      id: "gps-segments",
      label: "Tramos GPS",
      value: formatPointCount(route?.route_meta.segment_count),
      icon: Route,
    },
    {
      id: "max-gap",
      label: "Gap máximo",
      value: formatDurationSeconds(
        quality?.max_gap_seconds ?? stats.max_gap_seconds,
      ),
      icon: PauseCircle,
    },
    {
      id: "accuracy",
      label: "Precisión promedio",
      value: formatAccuracyMeters(stats.avg_accuracy_m),
      icon: Target,
    },
  ];

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3"
      role="list"
      aria-label="Indicadores de la sesión GPS"
    >
      {items.map((item) => (
        <Card key={item.id} className="border-gray-100 shadow-none" role="listitem">
          <CardContent className="p-2.5 space-y-1">
            <KpiLabel item={item} />
            <p className="text-sm font-semibold text-[#1E3A5F] tabular-nums">
              {item.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
