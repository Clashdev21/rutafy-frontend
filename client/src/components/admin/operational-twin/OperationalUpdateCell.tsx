import type { OperationalControlContainerRow } from "@/api/operational-control";
import {
  formatLastGpsAge,
  formatReportAge,
  resolveReportObservedAt,
} from "@/lib/operationalUpdateDisplay";

type Props = {
  row: OperationalControlContainerRow;
  now?: number;
  compact?: boolean;
};

export function OperationalUpdateCell({ row, now = Date.now(), compact }: Props) {
  const reportIso = resolveReportObservedAt(row.last_operational_update);
  const gpsIso = row.last_gps_at ?? null;
  const report = formatReportAge(reportIso, now);
  const gps = formatLastGpsAge(gpsIso, now);

  return (
    <div className={compact ? "space-y-0.5" : "space-y-1 min-w-[120px]"}>
      <div className="flex items-baseline gap-2 text-xs leading-tight">
        <span className="text-gray-500 w-12 shrink-0">Reporte</span>
        <span className="tabular-nums text-[#1E3A5F] font-medium">{report}</span>
      </div>
      <div className="flex items-baseline gap-2 text-xs leading-tight">
        <span className="text-gray-500 w-12 shrink-0">GPS</span>
        <span className="tabular-nums text-gray-700">{gps}</span>
      </div>
    </div>
  );
}
