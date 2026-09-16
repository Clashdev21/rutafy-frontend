import type { TemporalDayNav } from "@/lib/operationalDay";

/**
 * Empty-state copy for Torre temporal day mode (3D.4C).
 * Distinguishes "no backend activity for the day" vs "filters/search emptied the list".
 */
export function resolveTowerEmptyMessage(input: {
  dayNav: TemporalDayNav;
  /** Rows returned by backend for the selected operational day. */
  backendRowCount: number;
  /** Rows left after client search / structural filters / quick tabs. */
  visibleRowCount: number;
}): string {
  if (input.visibleRowCount > 0) return "";
  if (input.backendRowCount === 0) {
    return input.dayNav === "yesterday"
      ? "No hay operaciones con actividad ayer"
      : "No hay operaciones con actividad hoy";
  }
  return "No hay operaciones que coincidan con los filtros actuales.";
}
