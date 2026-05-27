import {
  formatTimelineTimestamp,
  type OperationalTimelineStep,
} from "@/lib/resolveOperationalTimeline";
import { cn } from "@/lib/utils";

type OperationalTimelineProps = {
  steps: OperationalTimelineStep[];
  className?: string;
};

export function OperationalTimeline({ steps, className }: OperationalTimelineProps) {
  if (steps.length === 0) return null;

  return (
    <ol
      className={cn("space-y-1.5 border-t border-white/10 pt-3", className)}
      aria-label="Progreso del servicio"
    >
      {steps.map((item) => {
        const timeLabel = formatTimelineTimestamp(item.timestamp);
        return (
          <li
            key={item.id}
            className={cn(
              "flex gap-2.5 min-w-0",
              item.state === "pending" && "opacity-45",
              item.state === "active" && "opacity-100",
              item.state === "done" && "opacity-80",
            )}
          >
            <span
              className={cn(
                "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                item.state === "done" && "bg-white/90",
                item.state === "active" && "bg-emerald-200 ring-2 ring-emerald-200/40 ring-offset-1 ring-offset-transparent",
                item.state === "pending" && "border border-white/35 bg-transparent",
              )}
              aria-hidden
            />
            <span className="min-w-0 flex flex-col gap-0.5">
              <span
                className={cn(
                  "text-xs leading-snug",
                  item.state === "active"
                    ? "font-semibold text-white"
                    : "font-medium text-white/85",
                )}
              >
                {item.label}
              </span>
              {timeLabel ? (
                <span className="text-[10px] leading-tight text-white/55 tabular-nums">
                  {timeLabel}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
