import type { MessengerLogisticsStep } from "@/lib/messengerUx";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type Props = {
  steps: MessengerLogisticsStep[];
  className?: string;
};

export function MessengerLogisticsTimeline({ steps, className }: Props) {
  if (steps.length === 0) return null;

  return (
    <ol className={cn("space-y-0", className)} aria-label="Captura logística">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-4 min-h-[3rem]">
            <div className="w-12 shrink-0 pt-0.5 text-right">
              <span className="text-sm font-mono tabular-nums text-gray-500">{step.time}</span>
            </div>
            <div className="flex w-5 shrink-0 flex-col items-center">
              {step.done ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2A9D8F] text-white">
                  <Check className="h-3 w-3 stroke-[3]" aria-hidden />
                </span>
              ) : (
                <span className="h-5 w-5 rounded-full border-2 border-gray-300 bg-white" aria-hidden />
              )}
              {!isLast ? (
                <span
                  className={cn(
                    "mt-1 w-0.5 flex-1 min-h-[1.25rem] rounded-full",
                    step.done ? "bg-[#2A9D8F]/50" : "bg-gray-200",
                  )}
                />
              ) : null}
            </div>
            <div className={cn("pb-4 pt-0.5 flex-1", !step.done && "text-gray-400")}>
              <p className={cn("text-sm font-medium", step.done ? "text-gray-900" : "text-gray-400")}>
                {step.label}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
