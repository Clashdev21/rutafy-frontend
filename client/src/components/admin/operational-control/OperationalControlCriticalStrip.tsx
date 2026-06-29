import type { OperationalControlContainerRow } from "@/api/operational-control";
import {
  deriveRiskBand,
  riskBandBarClass,
} from "@/lib/operationalControlUx";
import {
  formatGpsAge,
} from "@/lib/operationalControlConstants";
import {
  resolveOperationalStateLabel,
  resolvePortDisplay,
  resolveDestinationLabel,
} from "@/lib/operationalControlDisplay";

type Props = {
  rows: OperationalControlContainerRow[];
  onSelect: (row: OperationalControlContainerRow) => void;
};

export function OperationalControlCriticalStrip({ rows, onSelect }: Props) {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-[#1E3A5F] flex items-center gap-1.5">
        <span aria-hidden>⚠</span> Requieren atención
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
        {rows.map((row) => {
          const band = deriveRiskBand(row);
          const gpsAge = formatGpsAge(row.gps_last_seen_at);
          return (
            <button
              key={row.container_id}
              type="button"
              onClick={() => onSelect(row)}
              className="snap-start shrink-0 w-[min(100%,240px)] text-left rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className={`h-1.5 w-full ${riskBandBarClass(band)}`} />
              <div className="p-3 space-y-1.5">
                <p className="font-bold text-[#1E3A5F] truncate">
                  {row.container_label?.trim() || row.container_id}
                </p>
                <p className="text-xs font-medium text-gray-700">
                  {resolveOperationalStateLabel(row)}
                </p>
                {gpsAge ? <p className="text-xs text-gray-500">{gpsAge}</p> : null}
                <div className="flex items-center justify-between gap-2 text-xs text-gray-600 pt-1">
                  <span className="font-mono">{row.plate?.trim() || "Sin placa"}</span>
                  <span className="truncate">{resolvePortDisplay(row).code}</span>
                </div>
                <p className="text-[10px] text-[#2A9D8F] truncate">
                  {resolveDestinationLabel(row)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
