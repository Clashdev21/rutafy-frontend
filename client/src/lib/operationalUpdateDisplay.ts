import { formatGpsAge } from "@/lib/operationalControlConstants";
import type { OperationalControlLastOperationalUpdate } from "@/api/operational-control";

/** Compact age for table; never uses poll clock. */
export function formatReportAge(iso?: string | null, now = Date.now()): string {
  return formatGpsAge(iso, now) ?? "Sin reporte";
}

export function formatLastGpsAge(iso?: string | null, now = Date.now()): string {
  return formatGpsAge(iso, now) ?? "Sin GPS";
}

export function resolveReportObservedAt(
  update?: OperationalControlLastOperationalUpdate | null,
): string | null {
  const observed = update?.observed_at?.trim();
  return observed || null;
}
