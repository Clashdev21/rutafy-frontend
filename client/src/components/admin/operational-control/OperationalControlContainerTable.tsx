import type { OperationalControlContainerRow } from "@/api/operational-control";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatGpsAge,
  FUTURE_ACTIONS,
  gpsStatusDisplay,
} from "@/lib/operationalControlConstants";
import {
  formatScheduledLabel,
  resolveDestinationLabel,
  resolveEtaDisplay,
  resolveOperationalStateLabel,
  resolvePortDisplay,
} from "@/lib/operationalControlDisplay";
import {
  buildRiskAlerts,
  deriveRiskBand,
  riskBandBarClass,
  riskBandLabel,
  riskBandRowBgClass,
} from "@/lib/operationalControlUx";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";

type Props = {
  rows: OperationalControlContainerRow[];
  onSelectRow: (row: OperationalControlContainerRow) => void;
  onViewDetail: (row: OperationalControlContainerRow) => void;
};

function DriverPlateCell({ row }: { row: OperationalControlContainerRow }) {
  const name = row.driver_name?.trim();
  const plate = row.plate?.trim();
  if (!name && !plate) return <span className="text-gray-400">Sin conductor</span>;
  return (
    <div className="text-sm">
      {name ? <p className="font-medium text-gray-800 truncate max-w-[140px]">{name}</p> : null}
      {plate ? <p className="text-xs font-mono text-gray-500">{plate}</p> : null}
    </div>
  );
}

function PortDestinationCell({ row }: { row: OperationalControlContainerRow }) {
  const port = resolvePortDisplay(row);
  const destination = resolveDestinationLabel(row);
  return (
    <div className="text-sm space-y-0.5">
      <p className="font-medium text-gray-800">{port.code}</p>
      {port.city ? <p className="text-xs text-gray-500">{port.city}</p> : null}
      <p className="text-xs text-[#2A9D8F] font-medium truncate max-w-[160px]">{destination}</p>
    </div>
  );
}

function EtaCell({ row }: { row: OperationalControlContainerRow }) {
  const eta = resolveEtaDisplay(row);
  if (eta.timeLabel === "Sin ETA") {
    return <span className="text-sm text-gray-400">Sin ETA</span>;
  }
  return (
    <div className="text-sm">
      <p
        className={cn(
          "tabular-nums font-medium",
          eta.isExpired ? "text-orange-700" : "text-gray-800",
        )}
      >
        {eta.timeLabel}
      </p>
      {eta.subLabel ? (
        <p
          className={cn(
            "text-xs",
            eta.isExpired ? "text-orange-600 font-medium" : "text-gray-500",
          )}
        >
          {eta.subLabel}
        </p>
      ) : null}
    </div>
  );
}

function RiskCell({ row }: { row: OperationalControlContainerRow }) {
  const band = deriveRiskBand(row);
  const alerts = buildRiskAlerts(row);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-gray-700">{riskBandLabel(band)}</span>
      {alerts.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-amber-600 cursor-help" aria-label="Alertas">
              ⚠
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <ul className="text-xs space-y-1">
              {alerts.map((a, i) => (
                <li key={`${a}-${i}`}>{a}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

function RowActions({
  row,
  onViewDetail,
}: {
  row: OperationalControlContainerRow;
  onViewDetail: (row: OperationalControlContainerRow) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Acciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onViewDetail(row)}>Ver detalle</DropdownMenuItem>
        <DropdownMenuSeparator />
        {FUTURE_ACTIONS.map((action) => (
          <DropdownMenuItem key={action.id} disabled={action.disabled}>
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ContainerCard({
  row,
  onSelectRow,
  onViewDetail,
}: {
  row: OperationalControlContainerRow;
  onSelectRow: (row: OperationalControlContainerRow) => void;
  onViewDetail: (row: OperationalControlContainerRow) => void;
}) {
  const band = deriveRiskBand(row);
  const gpsAge = formatGpsAge(row.gps_last_seen_at);
  const port = resolvePortDisplay(row);
  const destination = resolveDestinationLabel(row);
  const eta = resolveEtaDisplay(row);

  return (
    <div
      className={`rounded-xl border border-gray-200 overflow-hidden shadow-sm ${riskBandRowBgClass(band)}`}
    >
      <div className="flex">
        <div className={`w-1.5 shrink-0 ${riskBandBarClass(band)}`} />
        <button
          type="button"
          onClick={() => onSelectRow(row)}
          className="flex-1 p-4 text-left space-y-2"
        >
          <p className="text-lg font-bold text-[#1E3A5F]">
            {row.container_label?.trim() || row.container_id}
          </p>
          <p className="text-sm text-gray-700">{resolveOperationalStateLabel(row)}</p>
          <p className="text-xs text-gray-600">
            {port.code}
            {port.city ? ` · ${port.city}` : ""} → {destination}
          </p>
          <DriverPlateCell row={row} />
          <p className="text-xs text-gray-500">
            ETA: {eta.timeLabel}
            {eta.subLabel ? ` · ${eta.subLabel}` : ""}
          </p>
          <p className="text-xs text-gray-500">
            {gpsStatusDisplay(row.gps_status)}
            {gpsAge ? ` · ${gpsAge}` : ""}
          </p>
        </button>
      </div>
      <div className="px-4 pb-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => onViewDetail(row)}
        >
          Ver detalle
        </Button>
      </div>
    </div>
  );
}

function DataRow({
  row,
  onSelectRow,
  onViewDetail,
  compact,
}: {
  row: OperationalControlContainerRow;
  onSelectRow: (row: OperationalControlContainerRow) => void;
  onViewDetail: (row: OperationalControlContainerRow) => void;
  compact?: boolean;
}) {
  const band = deriveRiskBand(row);
  const gpsAge = formatGpsAge(row.gps_last_seen_at);

  return (
    <TableRow
      className={`cursor-pointer ${riskBandRowBgClass(band)}`}
      onClick={() => onSelectRow(row)}
    >
      <TableCell className="p-0 w-1.5">
        <div className={`w-1.5 min-h-[3rem] h-full ${riskBandBarClass(band)}`} />
      </TableCell>
      <TableCell className="font-bold text-[#1E3A5F] whitespace-nowrap">
        {row.container_label?.trim() || row.container_id}
      </TableCell>
      <TableCell className="text-sm font-medium text-gray-800">
        {resolveOperationalStateLabel(row)}
      </TableCell>
      {!compact ? (
        <>
          <TableCell>
            <PortDestinationCell row={row} />
          </TableCell>
          <TableCell>
            <DriverPlateCell row={row} />
          </TableCell>
          <TableCell className="text-xs tabular-nums whitespace-nowrap">
            {formatScheduledLabel(row.scheduled_at)}
          </TableCell>
          <TableCell>
            <EtaCell row={row} />
          </TableCell>
          <TableCell>
            <RiskCell row={row} />
          </TableCell>
        </>
      ) : (
        <TableCell>
          <EtaCell row={row} />
        </TableCell>
      )}
      <TableCell className="text-xs whitespace-nowrap">
        <div>{gpsStatusDisplay(row.gps_status)}</div>
        {gpsAge ? <div className="text-gray-500">{gpsAge}</div> : null}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <RowActions row={row} onViewDetail={onViewDetail} />
      </TableCell>
    </TableRow>
  );
}

export function OperationalControlContainerTable({
  rows,
  onSelectRow,
  onViewDetail,
}: Props) {
  return (
    <>
      <div className="hidden xl:block overflow-x-auto -mx-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-2 p-0" />
              <TableHead>Contenedor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Puerto / Destino</TableHead>
              <TableHead>Conductor / Placa</TableHead>
              <TableHead>Programado</TableHead>
              <TableHead>ETA destino</TableHead>
              <TableHead>Riesgo</TableHead>
              <TableHead>GPS</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <DataRow
                key={row.container_id}
                row={row}
                onSelectRow={onSelectRow}
                onViewDetail={onViewDetail}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="hidden md:block xl:hidden overflow-x-auto -mx-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-2 p-0" />
              <TableHead>Contenedor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>ETA destino</TableHead>
              <TableHead>GPS</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <DataRow
                key={row.container_id}
                row={row}
                compact
                onSelectRow={onSelectRow}
                onViewDetail={onViewDetail}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {rows.map((row) => (
          <ContainerCard
            key={row.container_id}
            row={row}
            onSelectRow={onSelectRow}
            onViewDetail={onViewDetail}
          />
        ))}
      </div>
    </>
  );
}
