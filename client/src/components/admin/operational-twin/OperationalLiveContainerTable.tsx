import { OperationalUpdateCell } from "@/components/admin/operational-twin/OperationalUpdateCell";
import { OperationalRiskLive } from "@/components/admin/operational-twin/OperationalRiskLive";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ContainerLiveState } from "@/lib/operationalTwinUx";
import { liveStateRowIdentity } from "@/lib/operationalRowIdentity";
import { deriveRiskBand, riskBandBarClass, riskBandRowBgClass } from "@/lib/operationalControlUx";
import {
  buildLocationColumnLines,
  buildOperationColumnLines,
  buildScheduleColumnLines,
  buildStateColumnLines,
  formatContainerEquipment,
} from "@/lib/operationalTowerTablePresentation";
import { cn } from "@/lib/utils";

type Props = {
  states: ContainerLiveState[];
  onSelect: (state: ContainerLiveState) => void;
};

function rowKey(state: ContainerLiveState): string {
  return liveStateRowIdentity(state);
}

function TruncText({
  text,
  className,
  title,
}: {
  text: string;
  className?: string;
  title?: string;
}) {
  return (
    <p className={cn("truncate", className)} title={title ?? text}>
      {text}
    </p>
  );
}

function ContainerCell({ state }: { state: ContainerLiveState }) {
  const equipment = formatContainerEquipment(state.row.container_equipment);
  return (
    <div className="space-y-0.5 py-1 min-w-[110px] max-w-[140px]">
      <TruncText
        text={state.row.container_id}
        className="font-bold text-sm text-[#1E3A5F]"
      />
      {equipment ? (
        <p className="text-[11px] text-gray-500 tabular-nums">{equipment}</p>
      ) : null}
    </div>
  );
}

function OperationCell({ state }: { state: ContainerLiveState }) {
  const lines = buildOperationColumnLines(state.row);
  return (
    <div className="space-y-0.5 min-w-[120px] max-w-[160px]">
      {lines.reference ? (
        <TruncText text={lines.reference} className="text-sm font-semibold text-[#1E3A5F]" />
      ) : null}
      <TruncText text={lines.plate} className="text-xs text-gray-700" />
      <TruncText text={lines.driver} className="text-[11px] text-gray-500" />
    </div>
  );
}

function StateCell({ state }: { state: ContainerLiveState }) {
  const lines = buildStateColumnLines(state.row);
  return (
    <div className="space-y-0.5 min-w-[100px] max-w-[140px]">
      {lines.primary ? (
        <TruncText
          text={lines.primary}
          className="text-xs font-bold tracking-wide text-gray-800 uppercase"
        />
      ) : null}
      {lines.secondary ? (
        <TruncText
          text={lines.secondary}
          className="text-[10px] font-mono text-gray-500"
          title={lines.secondary}
        />
      ) : null}
      {lines.tertiary ? (
        <TruncText text={lines.tertiary} className="text-[10px] text-gray-400" />
      ) : null}
    </div>
  );
}

function LocationCell({ state }: { state: ContainerLiveState }) {
  const lines = buildLocationColumnLines(state.row);
  return (
    <div className="space-y-0.5 min-w-[110px] max-w-[150px]">
      <TruncText text={lines.label} className="text-xs font-medium text-gray-800" />
      {lines.source ? <p className="text-[10px] text-gray-500">{lines.source}</p> : null}
      {lines.age ? <p className="text-[10px] text-gray-400 tabular-nums">{lines.age}</p> : null}
    </div>
  );
}

function ScheduleCell({ state }: { state: ContainerLiveState }) {
  const lines = buildScheduleColumnLines(state.row);
  const statusTone =
    lines.status && /RETRASADO/i.test(lines.status)
      ? "text-amber-700"
      : lines.status && /A TIEMPO|ADELANTADO/i.test(lines.status)
        ? "text-emerald-700"
        : "text-gray-600";
  return (
    <div className="space-y-0.5 min-w-[110px]">
      <p className="text-xs text-[#1E3A5F] tabular-nums whitespace-nowrap">{lines.when}</p>
      {lines.status ? (
        <p className={cn("text-[10px] font-semibold uppercase tracking-wide", statusTone)}>
          {lines.status}
        </p>
      ) : null}
    </div>
  );
}

function LiveRowContent({ state }: { state: ContainerLiveState }) {
  const band = deriveRiskBand(state.row);
  return (
    <>
      <TableCell className="p-0 w-1.5">
        <div className={cn("w-1.5 min-h-[4rem] h-full", riskBandBarClass(band))} />
      </TableCell>
      <TableCell>
        <ContainerCell state={state} />
      </TableCell>
      <TableCell>
        <OperationCell state={state} />
      </TableCell>
      <TableCell>
        <StateCell state={state} />
      </TableCell>
      <TableCell>
        <LocationCell state={state} />
      </TableCell>
      <TableCell>
        <ScheduleCell state={state} />
      </TableCell>
      <TableCell>
        <OperationalUpdateCell row={state.row} />
      </TableCell>
      <TableCell>
        <OperationalRiskLive
          risk={state.risk}
          activeAlerts={state.activeAlerts}
          compact
        />
      </TableCell>
    </>
  );
}

function LiveCard({ state, onSelect }: { state: ContainerLiveState; onSelect: () => void }) {
  const band = deriveRiskBand(state.row);
  const operation = buildOperationColumnLines(state.row);
  const status = buildStateColumnLines(state.row);
  const location = buildLocationColumnLines(state.row);
  const schedule = buildScheduleColumnLines(state.row);
  const equipment = formatContainerEquipment(state.row.container_equipment);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-shadow hover:shadow-md",
        riskBandRowBgClass(band),
      )}
    >
      <div className={cn("h-1", riskBandBarClass(band))} />
      <div className="p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-lg text-[#1E3A5F] truncate">{state.row.container_id}</p>
            {equipment ? (
              <p className="text-xs text-gray-500 tabular-nums">{equipment}</p>
            ) : null}
          </div>
          <OperationalRiskLive
            risk={state.risk}
            activeAlerts={state.activeAlerts}
            compact
          />
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div className="min-w-0">
            <p className="text-[10px] uppercase text-gray-400">Operación</p>
            {operation.reference ? (
              <p className="font-semibold text-[#1E3A5F] truncate" title={operation.reference}>
                {operation.reference}
              </p>
            ) : null}
            <p className="text-gray-700 truncate">{operation.plate}</p>
            <p className="text-gray-500 truncate">{operation.driver}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase text-gray-400">Estado</p>
            {status.primary ? (
              <p className="font-bold uppercase tracking-wide text-gray-800">{status.primary}</p>
            ) : null}
            {status.secondary ? (
              <p className="font-mono text-[10px] text-gray-500 truncate" title={status.secondary}>
                {status.secondary}
              </p>
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase text-gray-400">Ubicación</p>
            <p className="text-gray-800 truncate" title={location.label}>
              {location.label}
            </p>
            {location.source ? <p className="text-gray-500">{location.source}</p> : null}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase text-gray-400">Programación</p>
            <p className="tabular-nums text-[#1E3A5F]">{schedule.when}</p>
            {schedule.status ? (
              <p className="text-[10px] font-semibold uppercase text-gray-600">{schedule.status}</p>
            ) : null}
          </div>
        </div>

        <OperationalUpdateCell row={state.row} />
      </div>
    </button>
  );
}

export function OperationalLiveContainerTable({ states, onSelect }: Props) {
  return (
    <>
      <div className="hidden md:block overflow-x-auto -mx-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-2 p-0" />
              <TableHead>Contenedor</TableHead>
              <TableHead>Operación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Programación</TableHead>
              <TableHead>Actualización</TableHead>
              <TableHead>Riesgo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {states.map((state) => {
              const band = deriveRiskBand(state.row);
              return (
                <TableRow
                  key={rowKey(state)}
                  className={cn("cursor-pointer", riskBandRowBgClass(band))}
                  onClick={() => onSelect(state)}
                >
                  <LiveRowContent state={state} />
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {states.map((state) => (
          <LiveCard key={rowKey(state)} state={state} onSelect={() => onSelect(state)} />
        ))}
      </div>
    </>
  );
}
