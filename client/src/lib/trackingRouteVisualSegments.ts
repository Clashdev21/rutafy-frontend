import type {
  AdminTrackingSessionRoute,
  TrackingRoutePoint,
} from "@/api/tracking-sessions";

/** Umbral frontend V2: gaps menores se consolidan visualmente en un solo tramo. */
export const VISUAL_GAP_THRESHOLD_SECONDS = 300;

export type VisualSegment = {
  visualIndex: number;
  sourceSegments: number[];
  points: TrackingRoutePoint[];
  started_at: string;
  ended_at: string;
  point_count: number;
};

export function isMajorVisualGap(gapBeforeSeconds: number | null | undefined): boolean {
  if (gapBeforeSeconds == null || !Number.isFinite(gapBeforeSeconds)) return false;
  return gapBeforeSeconds >= VISUAL_GAP_THRESHOLD_SECONDS;
}

/**
 * Agrupa segmentos técnicos de Route v1 en tramos visuales para el mapa.
 * No modifica datos de backend; solo consolida polylines cuando gap < 5 min.
 */
export function buildVisualSegments(
  route: AdminTrackingSessionRoute,
): VisualSegment[] {
  const segments = [...route.segments].sort(
    (a, b) => a.segment_index - b.segment_index,
  );
  if (segments.length === 0) return [];

  const visual: VisualSegment[] = [];
  let bucket: {
    sourceSegments: number[];
    points: TrackingRoutePoint[];
    started_at: string;
    ended_at: string;
  } | null = null;

  const flush = () => {
    if (!bucket) return;
    visual.push({
      visualIndex: visual.length,
      sourceSegments: bucket.sourceSegments,
      points: bucket.points,
      started_at: bucket.started_at,
      ended_at: bucket.ended_at,
      point_count: bucket.points.length,
    });
    bucket = null;
  };

  for (const segment of segments) {
    const gap = segment.gap_before_seconds ?? 0;
    const shouldStartNew =
      bucket != null && isMajorVisualGap(gap);

    if (shouldStartNew) {
      flush();
    }

    if (!bucket) {
      bucket = {
        sourceSegments: [segment.segment_index],
        points: [...segment.points],
        started_at: segment.started_at,
        ended_at: segment.ended_at,
      };
      continue;
    }

    bucket.sourceSegments.push(segment.segment_index);
    bucket.points.push(...segment.points);
    bucket.ended_at = segment.ended_at;
  }

  flush();
  return visual;
}

export function countVisualSegments(route: AdminTrackingSessionRoute | null): number {
  if (!route) return 0;
  return buildVisualSegments(route).length;
}

export function describeVisualSegmentSources(visual: VisualSegment): string {
  if (visual.sourceSegments.length <= 1) {
    return `Tramo técnico ${visual.sourceSegments[0] + 1}`;
  }
  const labels = visual.sourceSegments.map((i) => i + 1);
  return `Tramos técnicos ${labels.join("+")}`;
}

/** Para pruebas / reportes sin mutar route. */
export function summarizeVisualGrouping(route: AdminTrackingSessionRoute): {
  technicalSegmentCount: number;
  visualSegmentCount: number;
} {
  return {
    technicalSegmentCount: route.route_meta.segment_count || route.segments.length,
    visualSegmentCount: buildVisualSegments(route).length,
  };
}
