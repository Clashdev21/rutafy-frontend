import type { QuickTab } from "@/lib/operationalControlUx";
import { cn } from "@/lib/utils";

const TABS: { id: QuickTab; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "critical", label: "Críticos" },
  { id: "at_risk", label: "En riesgo" },
  { id: "normal", label: "Normales" },
  { id: "completed", label: "Completados" },
];

type Props = {
  active: QuickTab;
  counts: Record<QuickTab, number>;
  onChange: (tab: QuickTab) => void;
};

export function OperationalControlQuickTabs({ active, counts, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors border",
            active === tab.id
              ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
          )}
        >
          {tab.label}{" "}
          <span className={cn("tabular-nums", active === tab.id ? "text-white/80" : "text-gray-400")}>
            ({counts[tab.id]})
          </span>
        </button>
      ))}
    </div>
  );
}
