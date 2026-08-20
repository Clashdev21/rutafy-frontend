import type { MessengerJourneyNode } from "@/lib/messengerUx";
import { cn } from "@/lib/utils";

type Props = {
  nodes: MessengerJourneyNode[];
  percent: number;
  className?: string;
};

export function MessengerJourneyBar({ nodes, percent, className }: Props) {
  const p = Math.min(100, Math.max(0, percent));

  return (
    <div className={cn("w-full space-y-2", className)} aria-label="Progreso de ruta">
      <div className="flex items-center justify-between gap-1">
        {nodes.map((node) => (
          <div key={node.key} className="flex flex-1 flex-col items-center gap-1 min-w-0">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full border-2 transition-colors duration-500",
                node.completed
                  ? "border-[#2A9D8F] bg-[#2A9D8F]"
                  : node.current
                    ? "border-[#1E3A5F] bg-[#1E3A5F] ring-2 ring-[#1E3A5F]/20"
                    : "border-gray-300 bg-white",
              )}
              aria-hidden
            />
            <span
              className={cn(
                "text-[10px] font-medium truncate max-w-full text-center leading-tight",
                node.current ? "text-[#1E3A5F]" : node.completed ? "text-[#2A9D8F]" : "text-gray-400",
              )}
            >
              {node.label}
            </span>
          </div>
        ))}
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#2A9D8F] to-[#1E3A5F] transition-all duration-700 ease-out"
          style={{ width: `${p}%` }}
          role="progressbar"
          aria-valuenow={p}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
