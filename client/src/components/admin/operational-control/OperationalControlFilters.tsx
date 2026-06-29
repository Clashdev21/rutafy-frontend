import type { OperationalControlFilterOptions } from "@/api/operational-control";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  container: string;
  date: string;
};

export const EMPTY_OPERATIONAL_FILTERS: OperationalControlFiltersState = {
  client: "all",
  program: "all",
  status: "all",
  port: "all",
  driver: "all",
  plate: "all",
  container: "",
  date: "",
};

type Props = {
  filters: OperationalControlFiltersState;
  options?: OperationalControlFilterOptions;
  onChange: (next: OperationalControlFiltersState) => void;
  onClear: () => void;
};

function SelectFilter({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: string[];
  onValueChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <Select value={value || "all"} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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
    Boolean(filters.container.trim()) ||
    Boolean(filters.date.trim());

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-[#1E3A5F]">Filtros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SelectFilter
            label="Cliente"
            value={filters.client}
            options={options?.clients ?? []}
            onValueChange={(v) => onChange({ ...filters, client: v })}
          />
          <SelectFilter
            label="Programa"
            value={filters.program}
            options={options?.programs ?? []}
            onValueChange={(v) => onChange({ ...filters, program: v })}
          />
          <SelectFilter
            label="Estado"
            value={filters.status}
            options={statusOptions}
            onValueChange={(v) => onChange({ ...filters, status: v })}
          />
          <SelectFilter
            label="Puerto"
            value={filters.port}
            options={options?.ports ?? []}
            onValueChange={(v) => onChange({ ...filters, port: v })}
          />
          <SelectFilter
            label="Conductor"
            value={filters.driver}
            options={options?.drivers ?? []}
            onValueChange={(v) => onChange({ ...filters, driver: v })}
          />
          <SelectFilter
            label="Placa"
            value={filters.plate}
            options={options?.plates ?? []}
            onValueChange={(v) => onChange({ ...filters, plate: v })}
          />
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Contenedor
            </p>
            <Input
              value={filters.container}
              onChange={(e) => onChange({ ...filters, container: e.target.value })}
              placeholder="Buscar contenedor…"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Fecha</p>
            <Input
              type="date"
              value={filters.date}
              onChange={(e) => onChange({ ...filters, date: e.target.value })}
            />
          </div>
        </div>
        <Button type="button" variant="ghost" disabled={!hasActive} onClick={onClear}>
          Limpiar filtros
        </Button>
      </CardContent>
    </Card>
  );
}
