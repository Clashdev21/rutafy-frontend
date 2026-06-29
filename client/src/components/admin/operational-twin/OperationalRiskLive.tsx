import type { RiskPresentation } from "@/lib/operationalTwinUx";
import { cn } from "@/lib/utils";

type Props = {
  risk: RiskPresentation;
  className?: string;
};

export function OperationalRiskLive({ risk, className }: Props) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">
        {risk.emoji} {risk.label}
      </p>
      {risk.reasons.length > 0 ? (
        <ul className="text-[11px] text-gray-500 space-y-0.5">
          {risk.reasons.slice(0, 4).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
