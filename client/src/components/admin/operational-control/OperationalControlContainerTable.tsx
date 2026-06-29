import type { OperationalControlContainerRow } from "@/api/operational-control";
import { Badge } from "@/components/ui/badge";
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
  driverAssignmentDisplay,
  formatGpsAge,
  formatOperationalDateTime,
  FUTURE_ACTIONS,
  gpsStatusDisplay,
  historyBadgeLabel,
  phaseBadgeClass,
  phaseLabel,
  rutafyStatusBadgeClass,
  rutafyStatusLabel,
} from "@/lib/operationalControlConstants";
import { truncateUuid } from "@/lib/trackingSessionFormatters";
import { ExternalLink, MoreHorizontal } from "lucide-react";

type Props = {
  rows: OperationalControlContainerRow[];
  selectedId: string | null;
  onSelectRow: (row: OperationalControlContainerRow) => void;
  onViewDetail: (row: OperationalControlContainerRow) => void;
};

function AlertsIcon({ alerts }: { alerts: string[] }) {
  if (alerts.length === 0) return <span className="text-gray-300">—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-amber-600 text-base leading-none"
          aria-label={`${alerts.length} alerta(s)`}
          onClick={(e) => e.stopPropagation()}
        >
          ⚠
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs text-left">
        <ul className="space-y-1 text-xs">
          {alerts.map((a, i) => (
            <li key={`${a}-${i}`}>{a}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
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
        <DropdownMenuItem onClick={() => onViewDetail(row)}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Ver detalle
        </DropdownMenuItem>
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
  selected,
  onSelectRow,
  onViewDetail,
}: {
  row: OperationalControlContainerRow;
  selected: boolean;
  onSelectRow: (row: OperationalControlContainerRow) => void;
  onViewDetail: (row: OperationalControlContainerRow) => void;
}) {
  const gpsAge = formatGpsAge(row.gps_last_seen_at);
  const historyLabel = historyBadgeLabel(row.history_count);

  return (
    <button
      type="button"
      onClick={() => onSelectRow(row)}
      className={`w-full text-left rounded-lg border p-4 space-y-2 transition-colors ${
        selected ? "border-[#2A9D8F] bg-[#2A9D8F]/5" : "border-gray-100 bg-gray-50/80"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[#1E3A5F]">
            {row.container_label?.trim() || truncateUuid(row.container_id)}
          </p>
          <p className="text-xs text-gray-500">{row.client_name?.trim() || "—"}</p>
        </div>
        <AlertsIcon alerts={row.alerts} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {row.phase ? (
          <Badge variant="outline" className={`text-[10px] ${phaseBadgeClass(row.phase)}`}>
            {phaseLabel(row.phase)}
          </Badge>
        ) : null}
        {row.rutafy_status ? (
          <Badge
            variant="outline"
            className={`text-[10px] ${rutafyStatusBadgeClass(row.rutafy_status)}`}
          >
            {rutafyStatusLabel(row.rutafy_status)}
          </Badge>
        ) : null}
        {historyLabel ? (
          <Badge variant="outline" className="text-[10px]">
            {historyLabel}
          </Badge>
        ) : null}
      </div>
      <div className="text-xs text-gray-600 space-y-0.5">
        <p>Conductor: {driverAssignmentDisplay(row.driver_assignment_state)}</p>
        <p>
          GPS: {gpsStatusDisplay(row.gps_status)}
          {gpsAge ? ` · ${gpsAge}` : ""}
        </p>
        <p>Programado: {formatOperationalDateTime(row.scheduled_at)}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs w-full"
        onClick={(e) => {
          e.stopPropagation();
          onViewDetail(row);
        }}
      >
        Ver detalle
      </Button>
    </button>
  );
}

export function OperationalControlContainerTable({
  rows,
  selectedId,
  onSelectRow,
  onViewDetail,
}: Props) {
  return (
    <>
      {/* Desktop full */}
      <div className="hidden xl:block overflow-x-auto -mx-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contenedor</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Programa</TableHead>
              <TableHead>Conductor</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Puerto</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Estado Rutafy</TableHead>
              <TableHead>GPS</TableHead>
              <TableHead>Programado</TableHead>
              <TableHead>Última actualización</TableHead>
              <TableHead>Historial</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const gpsAge = formatGpsAge(row.gps_last_seen_at);
              const historyLabel = historyBadgeLabel(row.history_count);
              const selected = selectedId === row.container_id;
              return (
                <TableRow
                  key={row.container_id}
                  className={`cursor-pointer ${selected ? "bg-[#2A9D8F]/5" : ""}`}
                  onClick={() => onSelectRow(row)}
                >
                  <TableCell className="font-medium text-[#1E3A5F] whitespace-nowrap">
                    {row.container_label?.trim() || truncateUuid(row.container_id)}
                  </TableCell>
                  <TableCell className="text-sm">{row.client_name?.trim() || "—"}</TableCell>
                  <TableCell className="text-sm">{row.program_name?.trim() || "—"}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {driverAssignmentDisplay(row.driver_assignment_state)}
                  </TableCell>
                  <TableCell className="text-sm">{row.plate?.trim() || "—"}</TableCell>
                  <TableCell className="text-sm">{row.declared_port?.trim() || "—"}</TableCell>
                  <TableCell className="text-sm max-w-[120px] truncate">
                    {row.destination?.trim() || "—"}
                  </TableCell>
                  <TableCell>
                    {row.phase ? (
                      <Badge variant="outline" className={`text-xs ${phaseBadgeClass(row.phase)}`}>
                        {phaseLabel(row.phase)}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {row.rutafy_status ? (
                      <Badge
                        variant="outline"
                        className={`text-xs ${rutafyStatusBadgeClass(row.rutafy_status)}`}
                      >
                        {rutafyStatusLabel(row.rutafy_status)}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    <div>{gpsStatusDisplay(row.gps_status)}</div>
                    {gpsAge ? <div className="text-gray-500">{gpsAge}</div> : null}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums whitespace-nowrap">
                    {formatOperationalDateTime(row.scheduled_at)}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums whitespace-nowrap">
                    {formatOperationalDateTime(row.last_updated_at)}
                  </TableCell>
                  <TableCell className="text-center space-x-1">
                    {row.alerts.length > 0 ? <AlertsIcon alerts={row.alerts} /> : null}
                    {historyLabel ? (
                      <Badge variant="outline" className="text-xs">
                        {historyLabel}
                      </Badge>
                    ) : !row.alerts.length ? (
                      "—"
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <RowActions row={row} onViewDetail={onViewDetail} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Tablet reduced */}
      <div className="hidden md:block xl:hidden overflow-x-auto -mx-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contenedor</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>GPS</TableHead>
              <TableHead>Programado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.container_id}
                className="cursor-pointer"
                onClick={() => onSelectRow(row)}
              >
                <TableCell className="font-medium text-sm">
                  {row.container_label?.trim() || truncateUuid(row.container_id)}
                </TableCell>
                <TableCell className="text-sm">{row.client_name?.trim() || "—"}</TableCell>
                <TableCell>
                  {row.phase ? (
                    <Badge variant="outline" className={`text-xs ${phaseBadgeClass(row.phase)}`}>
                      {phaseLabel(row.phase)}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {row.rutafy_status ? (
                    <Badge
                      variant="outline"
                      className={`text-xs ${rutafyStatusBadgeClass(row.rutafy_status)}`}
                    >
                      {rutafyStatusLabel(row.rutafy_status)}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-xs">{gpsStatusDisplay(row.gps_status)}</TableCell>
                <TableCell className="text-xs tabular-nums">
                  {formatOperationalDateTime(row.scheduled_at)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <RowActions row={row} onViewDetail={onViewDetail} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.map((row) => (
          <ContainerCard
            key={row.container_id}
            row={row}
            selected={selectedId === row.container_id}
            onSelectRow={onSelectRow}
            onViewDetail={onViewDetail}
          />
        ))}
      </div>
    </>
  );
}
