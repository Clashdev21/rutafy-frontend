import {
  formatTimelineTimestamp,
  type OperationalTimelineStep,
  type OperationalTimelineStepState,
} from "@/lib/resolveOperationalTimeline";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type OperationalTimelineProps = {
  steps: OperationalTimelineStep[];
  className?: string;
};

function TimelineBullet({ state }: { state: OperationalTimelineStepState }) {
  if (state === "done") {
    return (
      <span
        className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/90 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
        aria-hidden
      >
        <Check className="h-2.5 w-2.5 stroke-[2.5] text-white" />
      </span>
    );
  }

  if (state === "active") {
    return (
      <span
        className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center"
        aria-hidden
      >
        <span className="absolute inline-flex h-4 w-4 rounded-full bg-emerald-400/35 motion-reduce:animate-none animate-ping" />
        <span className="absolute h-3 w-3 rounded-full border border-emerald-300/40 bg-emerald-400/20" />
        <span className="relative h-2 w-2 rounded-full bg-emerald-200 shadow-[0_0_6px_rgba(110,231,183,0.45)] ring-2 ring-emerald-300/25 ring-offset-0" />
      </span>
    );
  }

  return (
    <span
      className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center"
      aria-hidden
    >
      <span className="h-2.5 w-2.5 rounded-full border border-white/25 bg-white/[0.06]" />
    </span>
  );
}

export function OperationalTimeline({ steps, className }: OperationalTimelineProps) {
  if (steps.length === 0) return null;

  return (
    <ol
      className={cn("border-t border-white/10 pt-3", className)}
      aria-label="Progreso del servicio"
    >
      {steps.map((item, index) => {
        const timeLabel = formatTimelineTimestamp(item.timestamp);
        const isLast = index === steps.length - 1;
        const segmentBelowFilled = item.state === "done";

        return (
          <li
            key={item.id}
            className={cn(
              "relative flex gap-3 min-w-0",
              !isLast && "pb-2",
              item.state === "pending" && "opacity-50",
              item.state === "done" && "opacity-90",
              item.state === "active" && "opacity-100",
            )}
          >
            <div className="flex w-4 shrink-0 flex-col items-center">
              <TimelineBullet state={item.state} />
              {!isLast ? (
                <span
                  className={cn(
                    "mt-1 w-0.5 min-h-[0.75rem] flex-1 rounded-full",
                    segmentBelowFilled ? "bg-emerald-400/50" : "bg-white/10",
                  )}
                  aria-hidden
                />
              ) : null}
            </div>

            <div className="min-w-0 flex flex-1 flex-col gap-0.5 pb-0.5 pt-0.5">
              <span
                className={cn(
                  "text-xs leading-snug",
                  item.state === "active"
                    ? "font-semibold text-white"
                    : "font-medium text-white/85",
                  item.state === "pending" && "text-white/65",
                )}
              >
                {item.label}
              </span>
              {timeLabel ? (
                <span className="text-[10px] leading-tight text-white/55 tabular-nums">
                  {timeLabel}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
