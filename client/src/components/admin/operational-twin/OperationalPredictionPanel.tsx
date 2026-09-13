import type { OperationalDrawerViewModel } from "@/lib/operationalDrawerViewModel";
import { resolveOperationalEventLabel } from "@/lib/operationalTwinContract";
import { formatTimeLabel } from "@/lib/operationalControlDisplay";
import { Check } from "lucide-react";

type Props = {
  view: OperationalDrawerViewModel;
  /** Compact card title for Operación tab. */
  title?: string;
};

/** Pure prediction copy for Operación → Pronóstico (testable). */
export function buildOperationalPredictionItems(view: OperationalDrawerViewModel): string[] {
  const items: string[] = [];

  const arrivalIso = view.inferred_truth.expected_arrival_cdr?.trim() || null;
  const exitIso = view.inferred_truth.expected_exit_port_at?.trim() || null;

  if (arrivalIso) {
    items.push(`Llegada estimada: ${formatTimeLabel(arrivalIso)}`);
  } else if (view.eta_display.timeLabel !== "Sin ETA" && !view.eta_display.isExpired) {
    items.push(`Llegada estimada: ${view.eta_display.timeLabel}`);
  }

  if (exitIso) {
    items.push(`Salida estimada del puerto: ${formatTimeLabel(exitIso)}`);
  }

  const nextPoint =
    view.next_expected_step_label ||
    view.inferred_truth.next_expected_event ||
    view.next_step;
  if (nextPoint && String(nextPoint).trim()) {
    items.push(`Próximo evento: ${resolveOperationalEventLabel(String(nextPoint))}`);
  }

  return items;
}

export function OperationalPredictionPanel({ view, title = "Pronóstico" }: Props) {
  const items = buildOperationalPredictionItems(view);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
        <p className="text-sm font-semibold text-[#1E3A5F] mb-1">{title}</p>
        <p className="text-sm text-gray-500">Sin estimación disponible</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#2A9D8F]/20 bg-[#2A9D8F]/5 p-4 space-y-2">
      <p className="text-sm font-semibold text-[#1E3A5F]">{title}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-gray-800">
            <Check className="h-4 w-4 text-[#2A9D8F] shrink-0 mt-0.5" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
