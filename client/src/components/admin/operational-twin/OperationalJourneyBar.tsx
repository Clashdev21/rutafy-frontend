import type { JourneyPhaseUi } from "@/lib/operationalTwinUx";
import { cn } from "@/lib/utils";

type Props = {
  phases: JourneyPhaseUi[];
  percent: number;
  compact?: boolean;
  className?: string;
};

export function OperationalJourneyBar({ phases, percent, compact, className }: Props) {
  const p = Math.min(100, Math.max(0, percent));

  if (compact) {
    return (
      <div className={cn("w-full", className)}>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2A9D8F] to-[#1E3A5F] transition-all duration-700 ease-out"
            style={{ width: `${p}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-5 gap-1 text-[10px] text-gray-500 uppercase tracking-wide">
        {phases.map((phase) => (
          <span
            key={phase.key}
            className={cn(
              "truncate text-center",
              phase.current && "text-[#1E3A5F] font-semibold",
              phase.completed && "text-[#2A9D8F]",
            )}
          >
            {phase.label}
          </span>
        ))}
      </div>
      <div className="relative h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#2A9D8F] via-[#2A9D8F] to-[#1E3A5F] transition-all duration-700 ease-out"
          style={{ width: `${p}%` }}
        />
        {phases.map((phase, i) => {
          const pos = ((i + 1) / phases.length) * 100;
          return (
            <div
              key={phase.key}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 border-white shadow-sm transition-colors duration-500",
                p >= pos - 5 ? "bg-[#2A9D8F]" : "bg-gray-300",
                phase.current && "ring-2 ring-[#1E3A5F]/30 scale-110",
              )}
              style={{ left: `calc(${pos}% - 5px)` }}
            />
          );
        })}
      </div>
    </div>
  );
}
