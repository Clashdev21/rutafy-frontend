import type { TowerSummaryMetrics } from "@/lib/operationalTowerSummary";
import { formatTowerOperationsHeadline } from "@/lib/operationalTowerSummary";
import { cn } from "@/lib/utils";

type Props = {
  metrics: TowerSummaryMetrics;
};

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5 min-w-0">
      <span className="text-[11px] uppercase tracking-wide text-gray-500 shrink-0">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          accent && value > 0 ? "text-amber-700" : "text-[#1E3A5F]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function OperationalTowerSummary({ metrics }: Props) {
  const headline = formatTowerOperationsHeadline(
    metrics.visibleOperations,
    metrics.totalOperations,
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Resumen operativo
        </p>
        <p className="text-sm font-semibold tabular-nums text-[#1E3A5F]">{headline}</p>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-0 gap-y-2 text-sm">
        <Metric label="Puerto" value={metrics.inPort} />
        <span className="mx-2.5 hidden sm:inline text-gray-200" aria-hidden>
          |
        </span>
        <Metric label="En ruta" value={metrics.inRoute} />
        <span className="mx-2.5 hidden sm:inline text-gray-200" aria-hidden>
          |
        </span>
        <Metric label="CDR" value={metrics.atCdr} />
        <span className="mx-2.5 hidden sm:inline text-gray-200" aria-hidden>
          |
        </span>
        <Metric label="Atención" value={metrics.attention} accent />
      </div>
    </div>
  );
}
