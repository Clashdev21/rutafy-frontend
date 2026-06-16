import type {
  AdminTrackingSession,
  AdminTrackingSessionRoute,
} from "@/api/tracking-sessions";
import {
  formatDistanceKm,
  formatDurationSeconds,
  formatPointCount,
  formatTrackingDateTime,
} from "@/lib/trackingSessionFormatters";
import { isMajorVisualGap } from "@/lib/trackingRouteVisualSegments";

type Props = {
  session: AdminTrackingSession;
  route: AdminTrackingSessionRoute | null;
};

type TimelineRow = {
  key: string;
  title: string;
  detail?: string;
  at?: string | null;
  kind?: "segment" | "gap-minor" | "gap-major";
};

function buildTimelineRows(
  session: AdminTrackingSession,
  route: AdminTrackingSessionRoute | null,
): TimelineRow[] {
  const rows: TimelineRow[] = [
    {
      key: "session-start",
      title: "Inicio sesión",
      at: session.started_at,
    },
  ];

  const firstPoint = route?.start_point ?? route?.segments[0]?.points[0] ?? null;
  if (firstPoint) {
    rows.push({
      key: "first-point",
      title: "Primer punto GPS",
      at: firstPoint.captured_at,
    });
  }

  if (route) {
    for (const segment of route.segments) {
      if (segment.gap_before_seconds != null && segment.gap_before_seconds > 0) {
        const major = isMajorVisualGap(segment.gap_before_seconds);
        rows.push({
          key: `gap-${segment.segment_index}`,
          title: major
            ? "Interrupción GPS relevante"
            : "Gap menor (continuidad probable)",
          detail: `Gap ${formatDurationSeconds(segment.gap_before_seconds)}`,
          kind: major ? "gap-major" : "gap-minor",
        });
      }

      rows.push({
        key: `segment-${segment.segment_index}`,
        title: `Tramo técnico ${segment.segment_index + 1}`,
        at: segment.started_at,
        detail: `${formatPointCount(segment.point_count)} pts · ${formatDistanceKm(segment.distance_km)} · ${formatTrackingDateTime(segment.started_at)} → ${formatTrackingDateTime(segment.ended_at)}`,
        kind: "segment",
      });
    }
  }

  const lastPoint =
    route?.end_point ??
    route?.segments[route.segments.length - 1]?.points.at(-1) ??
    null;
  if (lastPoint) {
    rows.push({
      key: "last-point",
      title: "Último punto GPS",
      at: lastPoint.captured_at,
    });
  }

  if (session.ended_at?.trim()) {
    rows.push({
      key: "session-end",
      title: "Cierre sesión",
      at: session.ended_at,
    });
  }

  return rows;
}

function rowDotClass(kind: TimelineRow["kind"]): string {
  switch (kind) {
    case "gap-major":
      return "bg-amber-500";
    case "gap-minor":
      return "bg-gray-400";
    case "segment":
    default:
      return "bg-[#2A9D8F]";
  }
}

function rowTitleClass(kind: TimelineRow["kind"]): string {
  switch (kind) {
    case "gap-major":
      return "text-amber-800";
    case "gap-minor":
      return "text-gray-600";
    case "segment":
    default:
      return "text-[#1E3A5F]";
  }
}

export function TrackingRouteTimeline({ session, route }: Props) {
  const rows = buildTimelineRows(session, route);

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Timeline técnico
      </p>
      <ol className="space-y-0">
        {rows.map((row, index) => (
          <li key={row.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${rowDotClass(row.kind)}`}
                aria-hidden
              />
              {index < rows.length - 1 ? (
                <span className="w-px flex-1 min-h-4 bg-gray-200 my-1" aria-hidden />
              ) : null}
            </div>
            <div className="pb-4 min-w-0 flex-1">
              <p className={`text-sm font-medium ${rowTitleClass(row.kind)}`}>
                {row.title}
              </p>
              {row.at ? (
                <p className="text-xs text-gray-500 tabular-nums">
                  {formatTrackingDateTime(row.at)}
                </p>
              ) : null}
              {row.detail ? (
                <p className="text-xs text-gray-600 mt-0.5 break-words">{row.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
