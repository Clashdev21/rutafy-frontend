import type { OperationalControlFilterOptions } from "@/api/operational-control";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RUTAFY_STATUS_LABELS } from "@/lib/operationalControlConstants";
import {
  EMPTY_OPERATIONAL_FILTERS,
  TOWER_FILTER_LABELS,
  availableTowerFilterKeys,
  hasActiveFilterValues,
  type OperationalControlFiltersState,
  type TowerFilterKey,
} from "@/lib/operationalTowerVisibleFilters";
import { Plus, X } from "lucide-react";

export type { OperationalControlFiltersState, TowerFilterKey };
export { EMPTY_OPERATIONAL_FILTERS };

type Props = {
  filters: OperationalControlFiltersState;
  visibleFilters: TowerFilterKey[];
  options?: OperationalControlFilterOptions;
  onChange: (next: OperationalControlFiltersState) => void;
  onClearValues: () => void;
  onAddFilter: (key: TowerFilterKey) => void;
  onRemoveFilter: (key: TowerFilterKey) => void;
  /** When true, only render the + Filtro trigger (for toolbar next to search). */
  addOnly?: boolean;
};

export function OperationalControlFilterAddButton({
  visibleFilters,
  onAddFilter,
}: {
  visibleFilters: TowerFilterKey[];
  onAddFilter: (key: TowerFilterKey) => void;
}) {
  const available = availableTowerFilterKeys(visibleFilters);
  if (available.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="h-[50px] shrink-0 gap-1.5 px-3">
          <Plus className="h-4 w-4" aria-hidden />
          Filtro
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {available.map((key) => (
          <DropdownMenuItem key={key} onSelect={() => onAddFilter(key)}>
            {TOWER_FILTER_LABELS[key]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OperationalControlFilters({
  filters,
  visibleFilters,
  options,
  onChange,
  onClearValues,
  onRemoveFilter,
}: Omit<Props, "onAddFilter" | "addOnly">) {
  const statusOptions = options?.statuses?.length
    ? options.statuses
    : Object.keys(RUTAFY_STATUS_LABELS);

  const hasActive = hasActiveFilterValues(filters);

  if (visibleFilters.length === 0 && !hasActive) {
    return null;
  }

  const optionsFor = (key: TowerFilterKey): string[] => {
    switch (key) {
      case "client":
        return options?.clients ?? [];
      case "program":
        return options?.programs ?? [];
      case "status":
        return statusOptions;
      case "port":
        return options?.ports ?? [];
      case "driver":
        return options?.drivers ?? [];
      case "plate":
        return options?.plates ?? [];
      case "date":
        return [];
    }
  };

  const valueFor = (key: TowerFilterKey): string => {
    if (key === "date") return filters.date;
    return filters[key] || "all";
  };

  const setValue = (key: TowerFilterKey, value: string) => {
    if (key === "date") {
      onChange({ ...filters, date: value });
      return;
    }
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap gap-2 items-end">
      {visibleFilters.map((key) => (
        <div key={key} className="space-y-1 min-w-[140px] flex-1 sm:flex-none sm:max-w-[180px]">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[10px] font-medium text-gray-500 uppercase">
              {TOWER_FILTER_LABELS[key]}
            </p>
            <button
              type="button"
              className="rounded p-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              aria-label={`Quitar filtro ${TOWER_FILTER_LABELS[key]}`}
              onClick={() => onRemoveFilter(key)}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          {key === "date" ? (
            <Input
              type="date"
              className="h-9 text-xs"
              value={valueFor(key)}
              onChange={(e) => setValue(key, e.target.value)}
            />
          ) : (
            <Select value={valueFor(key)} onValueChange={(v) => setValue(key, v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {optionsFor(key).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}
      {hasActive ? (
        <Button type="button" variant="ghost" size="sm" className="h-9" onClick={onClearValues}>
          Limpiar filtros
        </Button>
      ) : null}
    </div>
  );
}
