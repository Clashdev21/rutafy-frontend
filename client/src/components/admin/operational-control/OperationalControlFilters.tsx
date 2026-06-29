import type { OperationalControlFilterOptions } from "@/api/operational-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RUTAFY_STATUS_LABELS } from "@/lib/operationalControlConstants";

export type OperationalControlFiltersState = {
  client: string;
  program: string;
  status: string;
  port: string;
  driver: string;
  plate: string;
  date: string;
};

export const EMPTY_OPERATIONAL_FILTERS: OperationalControlFiltersState = {
  client: "all",
  program: "all",
  status: "all",
  port: "all",
  driver: "all",
  plate: "all",
  date: "",
};

type Props = {
  filters: OperationalControlFiltersState;
  options?: OperationalControlFilterOptions;
  onChange: (next: OperationalControlFiltersState) => void;
  onClear: () => void;
};

export function OperationalControlFilters({
  filters,
  options,
  onChange,
  onClear,
}: Props) {
  const statusOptions = options?.statuses?.length
    ? options.statuses
    : Object.keys(RUTAFY_STATUS_LABELS);

  const hasActive =
    filters.client !== "all" ||
    filters.program !== "all" ||
    filters.status !== "all" ||
    filters.port !== "all" ||
    filters.driver !== "all" ||
    filters.plate !== "all" ||
    Boolean(filters.date.trim());

  const compactSelect = (
    label: string,
    value: string,
    opts: string[],
    onValueChange: (v: string) => void,
  ) => (
    <div className="space-y-1 min-w-[130px] flex-1">
      <p className="text-[10px] font-medium text-gray-500 uppercase">{label}</p>
      <Select value={value || "all"} onValueChange={onValueChange}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {opts.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="rounded-xl border border-gray-100 bg-white/80 p-3 space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        {compactSelect("Cliente", filters.client, options?.clients ?? [], (v) =>
          onChange({ ...filters, client: v }),
        )}
        {compactSelect("Programa", filters.program, options?.programs ?? [], (v) =>
          onChange({ ...filters, program: v }),
        )}
        {compactSelect("Estado", filters.status, statusOptions, (v) =>
          onChange({ ...filters, status: v }),
        )}
        {compactSelect("Puerto", filters.port, options?.ports ?? [], (v) =>
          onChange({ ...filters, port: v }),
        )}
        {compactSelect("Conductor", filters.driver, options?.drivers ?? [], (v) =>
          onChange({ ...filters, driver: v }),
        )}
        {compactSelect("Placa", filters.plate, options?.plates ?? [], (v) =>
          onChange({ ...filters, plate: v }),
        )}
        <div className="space-y-1 min-w-[130px]">
          <p className="text-[10px] font-medium text-gray-500 uppercase">Fecha</p>
          <Input
            type="date"
            className="h-9 text-xs"
            value={filters.date}
            onChange={(e) => onChange({ ...filters, date: e.target.value })}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9"
          disabled={!hasActive}
          onClick={onClear}
        >
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}
