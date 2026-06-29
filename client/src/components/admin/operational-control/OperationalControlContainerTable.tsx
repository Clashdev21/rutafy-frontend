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
  formatOperationalDateTime,
  FUTURE_ACTIONS,
  gpsStatusDisplay,
  rutafyStatusLabel,
} from "@/lib/operationalControlConstants";
import {
  buildRiskAlerts,
  deriveRiskBand,
  riskBandBarClass,
  riskBandLabel,
  riskBandRowBgClass,
} from "@/lib/operationalControlUx";
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
      <p className="font-medium text-gray-800 truncate max-w-[140px]">{name || "—"}</p>
      {plate ? <p className="text-xs font-mono text-gray-500">{plate}</p> : null}
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
          <p className="text-sm text-gray-700">{rutafyStatusLabel(row.rutafy_status)}</p>
          <p className="text-xs text-gray-600">
            {row.declared_port?.trim() || "—"} → {row.destination?.trim() || "—"}
          </p>
          <DriverPlateCell row={row} />
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
      <TableCell className="text-sm">{rutafyStatusLabel(row.rutafy_status)}</TableCell>
      {!compact ? (
        <>
          <TableCell className="text-sm">{row.declared_port?.trim() || "—"}</TableCell>
          <TableCell>
            <DriverPlateCell row={row} />
          </TableCell>
          <TableCell className="text-xs tabular-nums whitespace-nowrap">
            {formatOperationalDateTime(row.scheduled_at)}
          </TableCell>
          <TableCell>
            <RiskCell row={row} />
          </TableCell>
        </>
      ) : null}
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
              <TableHead>Estado operacional</TableHead>
              <TableHead>Puerto</TableHead>
              <TableHead>Conductor / Placa</TableHead>
              <TableHead>Programado</TableHead>
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
