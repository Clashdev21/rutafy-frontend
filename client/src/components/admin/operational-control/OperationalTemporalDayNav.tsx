import type { TemporalDayNav } from "@/lib/operationalDay";
import { cn } from "@/lib/utils";

const TABS: { id: TemporalDayNav; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "yesterday", label: "Ayer" },
];

type Props = {
  active: TemporalDayNav;
  onChange: (next: TemporalDayNav) => void;
};

export function OperationalTemporalDayNav({ active, onChange }: Props) {
  return (
    <div
      className="inline-flex rounded-md border border-gray-200 bg-white p-0.5"
      role="tablist"
      aria-label="Día operacional"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-3 py-1 text-xs font-semibold tracking-wide transition-colors rounded",
              isActive
                ? "bg-[#1E3A5F] text-white"
                : "text-gray-600 hover:text-[#1E3A5F] hover:bg-gray-50",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
