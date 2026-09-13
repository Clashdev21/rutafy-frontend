import type { RiskPresentation } from "@/lib/operationalTwinUx";
import { cn } from "@/lib/utils";

type Props = {
  risk: RiskPresentation;
  activeAlerts?: string[];
  className?: string;
};

export function OperationalRiskLive({ risk, activeAlerts = [], className }: Props) {
  const hasAlerts = activeAlerts.length > 0;
  const hasReasons = risk.reasons.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-0.5">Riesgo operacional</p>
        <p className="text-[15px] font-semibold text-gray-800 whitespace-nowrap">
          {risk.emoji} {risk.label}
        </p>
        {hasReasons ? (
          <ul className="text-xs text-gray-600 space-y-0.5 mt-1">
            {risk.reasons.slice(0, 4).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
      </div>
      {hasAlerts ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-0.5">Alertas activas</p>
          <ul className="text-sm text-amber-800 space-y-0.5">
            {activeAlerts.slice(0, 4).map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
