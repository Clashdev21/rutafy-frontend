import type { AdminMessenger } from "@/api/admin-messengers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatOperationalDateTime } from "@/lib/operationalControlConstants";

type Props = {
  messengers: AdminMessenger[];
  onSelect: (m: AdminMessenger) => void;
  onViewDetail: (m: AdminMessenger) => void;
};

function statusBadge(status?: string | null) {
  const s = String(status ?? "").toUpperCase();
  if (s === "AVAILABLE" || s === "ONLINE") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (s === "BUSY" || s === "IN_SERVICE") {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function MessengerCard({
  m,
  onSelect,
}: {
  m: AdminMessenger;
  onSelect: (m: AdminMessenger) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(m)}
      className="w-full text-left rounded-xl border border-gray-100 bg-gray-50/80 p-4 space-y-2"
    >
      <p className="font-semibold text-[#1E3A5F]">{m.full_name}</p>
      <p className="text-xs font-mono text-gray-600">{m.plate?.trim() || "—"}</p>
      <p className="text-xs text-gray-500">{m.vehicle_type?.trim() || "—"}</p>
      <Badge variant="outline" className={`text-xs ${statusBadge(m.availability_status)}`}>
        {m.availability_status?.trim() || "—"}
      </Badge>
    </button>
  );
}

export function OperationalTransportersTable({ messengers, onSelect, onViewDetail }: Props) {
  return (
    <>
      <div className="hidden md:block overflow-x-auto -mx-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conductor</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Programa</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>GPS</TableHead>
              <TableHead>Última ubicación</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {messengers.map((m) => (
              <TableRow
                key={m.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onSelect(m)}
              >
                <TableCell className="font-medium">{m.full_name}</TableCell>
                <TableCell className="font-mono text-sm">{m.plate?.trim() || "—"}</TableCell>
                <TableCell className="text-sm">{m.vehicle_type?.trim() || "—"}</TableCell>
                <TableCell className="text-sm">{m.current_node_name?.trim() || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${statusBadge(m.availability_status)}`}>
                    {m.availability_status?.trim() || "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">⚪ Sin dato GPS</TableCell>
                <TableCell className="text-xs text-gray-500 tabular-nums">
                  {formatOperationalDateTime(m.created_at)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => onViewDetail(m)}
                  >
                    Ver detalle
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="md:hidden space-y-3">
        {messengers.map((m) => (
          <MessengerCard key={m.id} m={m} onSelect={onSelect} />
        ))}
      </div>
    </>
  );
}
