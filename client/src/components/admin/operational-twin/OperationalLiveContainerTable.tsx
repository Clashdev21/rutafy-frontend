import { OperationalEtaHero } from "@/components/admin/operational-twin/OperationalEtaHero";
import { OperationalJourneyBar } from "@/components/admin/operational-twin/OperationalJourneyBar";
import { OperationalNodeFlow } from "@/components/admin/operational-twin/OperationalNodeFlow";
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
import { deriveRiskBand, riskBandBarClass, riskBandRowBgClass } from "@/lib/operationalControlUx";
import { cn } from "@/lib/utils";

type Props = {
  states: ContainerLiveState[];
  onSelect: (state: ContainerLiveState) => void;
};

function LiveRowContent({ state }: { state: ContainerLiveState }) {
  const band = deriveRiskBand(state.row);
  return (
    <>
      <TableCell className="p-0 w-1.5">
        <div className={cn("w-1.5 min-h-[4rem] h-full", riskBandBarClass(band))} />
      </TableCell>
      <TableCell className="min-w-[200px]">
        <div className="space-y-2 py-1">
          <p className="font-bold text-lg text-[#1E3A5F]">{state.container_label}</p>
          <OperationalJourneyBar
            phases={state.journeyPhases}
            percent={state.progressPercent}
            compact
          />
        </div>
      </TableCell>
      <TableCell>
        <p className="text-xs font-bold tracking-wide text-gray-700 uppercase max-w-[160px]">
          {state.phaseLabel}
        </p>
      </TableCell>
      <TableCell>
        <OperationalNodeFlow
          current={state.currentNodeName}
          next={state.nextNodeName}
          minutesToNext={state.minutesToNext}
        />
      </TableCell>
      <TableCell>
        <OperationalEtaHero
          time={state.etaHero}
          corridorName={state.corridorName}
          source={state.etaSource}
          expired={state.etaExpired}
        />
      </TableCell>
      <TableCell>
        <OperationalRiskLive risk={state.risk} />
      </TableCell>
    </>
  );
}

function LiveCard({ state, onSelect }: { state: ContainerLiveState; onSelect: () => void }) {
  const band = deriveRiskBand(state.row);
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
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="font-bold text-xl text-[#1E3A5F]">{state.container_label}</p>
          <OperationalRiskLive risk={state.risk} />
        </div>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-600">{state.phaseLabel}</p>
        <OperationalJourneyBar phases={state.journeyPhases} percent={state.progressPercent} compact />
        <OperationalNodeFlow
          current={state.currentNodeName}
          next={state.nextNodeName}
          minutesToNext={state.minutesToNext}
        />
        <OperationalEtaHero
          time={state.etaHero}
          corridorName={state.corridorName}
          source={state.etaSource}
          expired={state.etaExpired}
          size="lg"
        />
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
              <TableHead>Estado</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>ETA</TableHead>
              <TableHead>Riesgo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {states.map((state) => {
              const band = deriveRiskBand(state.row);
              return (
                <TableRow
                  key={state.container_id}
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
          <LiveCard key={state.container_id} state={state} onSelect={() => onSelect(state)} />
        ))}
      </div>
    </>
  );
}
