import type { OperationalDrawerViewModel } from "@/lib/operationalDrawerViewModel";
import { humanizeNodeName, minutesUntil } from "@/lib/operationalTwinUx";
import { Check } from "lucide-react";

type Props = {
  view: OperationalDrawerViewModel;
};

export function OperationalPredictionPanel({ view }: Props) {
  const items: string[] = [];

  if (/salió|salio|transit|ruta/i.test(view.current_phase_label ?? "")) {
    items.push("ya salió del puerto");
  } else if (view.inferred_truth.expected_exit_port_at) {
    items.push("saldrá del puerto pronto");
  }

  const cdrEta =
    view.inferred_truth.expected_arrival_cdr || view.eta_display.timeLabel !== "Sin ETA"
      ? minutesUntil(view.inferred_truth.expected_arrival_cdr) ||
        view.eta_display.subLabel
      : null;
  if (cdrEta || view.eta_display.timeLabel !== "Sin ETA") {
    items.push(
      `llegará al CDR${cdrEta ? ` en ${cdrEta}` : ` · ${view.eta_display.timeLabel}`}`,
    );
  }

  const risk = (view.risk_level ?? "").toLowerCase();
  if (/low|bajo|normal/i.test(risk) || !view.risk_level) {
    items.push("riesgo bajo");
  } else if (/high|alto|crit/i.test(risk)) {
    items.push("riesgo elevado");
  } else {
    items.push("riesgo moderado");
  }

  const nextPoint =
    view.next_expected_step_label ||
    humanizeNodeName(view.inferred_truth.next_expected_event) ||
    humanizeNodeName(view.next_step);
  if (nextPoint && nextPoint !== "Sin ubicación") {
    items.push(`siguiente punto: ${nextPoint}`);
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Sin predicción disponible.</p>;
  }

  return (
    <div className="rounded-xl border border-[#2A9D8F]/20 bg-[#2A9D8F]/5 p-4 space-y-2">
      <p className="text-sm font-semibold text-[#1E3A5F]">Rutafy cree que:</p>
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
