import { OperationalControlCommandSearch } from "@/components/admin/operational-control/OperationalControlCommandSearch";
import { OperationalControlContainerTable } from "@/components/admin/operational-control/OperationalControlContainerTable";
import { OperationalControlCriticalStrip } from "@/components/admin/operational-control/OperationalControlCriticalStrip";
import { OperationalControlDrawer } from "@/components/admin/operational-control/OperationalControlDrawer";
import {
  EMPTY_OPERATIONAL_FILTERS,
  OperationalControlFilters,
  type OperationalControlFiltersState,
} from "@/components/admin/operational-control/OperationalControlFilters";
import { OperationalControlKpiStrip } from "@/components/admin/operational-control/OperationalControlKpiStrip";
import { OperationalControlQuickTabs } from "@/components/admin/operational-control/OperationalControlQuickTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useOperationalControl } from "@/hooks/useOperationalControl";
import type { OperationalControlContainerRow } from "@/api/operational-control";
import {
  clientFilterContainers,
  sortOperationalContainers,
} from "@/lib/operationalControlConstants";
import {
  countByQuickTab,
  filterByQuickTab,
  matchesCommandSearch,
  pickCriticalContainers,
  type QuickTab,
} from "@/lib/operationalControlUx";
import { AlertTriangle, LayoutDashboard, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

export default function AdminOperationalControlPage() {
  const [filters, setFilters] = useState<OperationalControlFiltersState>(
    EMPTY_OPERATIONAL_FILTERS,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [quickTab, setQuickTab] = useState<QuickTab>("all");
  const [selectedRow, setSelectedRow] = useState<OperationalControlContainerRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const apiParams = useMemo(
    () => ({
      client: filters.client !== "all" ? filters.client : undefined,
      program: filters.program !== "all" ? filters.program : undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      port: filters.port !== "all" ? filters.port : undefined,
      driver: filters.driver !== "all" ? filters.driver : undefined,
      plate: filters.plate !== "all" ? filters.plate : undefined,
      date: filters.date.trim() || undefined,
    }),
    [filters],
  );

  const {
    counts,
    kpis,
    containers,
    filterOptions,
    isLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    refresh,
  } = useOperationalControl(apiParams);

  const baseRows = useMemo(() => {
    const filtered = clientFilterContainers(containers, filters);
    const searched = filtered.filter((row) => matchesCommandSearch(row, searchQuery));
    return sortOperationalContainers(searched);
  }, [containers, filters, searchQuery]);

  const tabCounts = useMemo(() => countByQuickTab(baseRows), [baseRows]);
  const displayRows = useMemo(
    () => filterByQuickTab(baseRows, quickTab),
    [baseRows, quickTab],
  );
  const criticalRows = useMemo(
    () => pickCriticalContainers(sortOperationalContainers(containers)),
    [containers],
  );

  const openDrawer = (row: OperationalControlContainerRow) => {
    setSelectedRow(row);
    setDrawerOpen(true);
  };

  const showInitialLoading = isLoading && containers.length === 0 && !error;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 shrink-0 text-[#2A9D8F]" aria-hidden />
            Torre de Control
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Seguimiento operacional de contenedores, Digital Twin, riesgo y ETA.
          </p>
          {lastUpdatedAt ? (
            <p className="text-xs text-gray-400 mt-1">
              Última actualización:{" "}
              {lastUpdatedAt.toLocaleTimeString("es-CO", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={isLoading || isRefreshing}
          onClick={() => void refresh({ silent: true })}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            aria-hidden
          />
          Actualizar
        </Button>
      </div>

      <OperationalControlCommandSearch
        rows={containers}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onSelect={openDrawer}
      />

      {showInitialLoading ? (
        <p className="text-sm text-gray-500 py-16 text-center">Cargando torre de control…</p>
      ) : error && containers.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <Button type="button" variant="outline" onClick={() => void refresh()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          {error ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <span>{error} (mostrando últimos datos disponibles)</span>
            </div>
          ) : null}

          <OperationalControlKpiStrip counts={counts} kpis={kpis} />

          <OperationalControlFilters
            filters={filters}
            options={filterOptions}
            onChange={setFilters}
            onClear={() => setFilters(EMPTY_OPERATIONAL_FILTERS)}
          />

          <OperationalControlCriticalStrip rows={criticalRows} onSelect={openDrawer} />

          <OperationalControlQuickTabs
            active={quickTab}
            counts={tabCounts}
            onChange={setQuickTab}
          />

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0 sm:p-4 pt-4">
              {isLoading && displayRows.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center px-4">
                  Cargando contenedores…
                </p>
              ) : displayRows.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center px-4">
                  No hay contenedores con los filtros actuales.
                </p>
              ) : (
                <OperationalControlContainerTable
                  rows={displayRows}
                  onSelectRow={openDrawer}
                  onViewDetail={openDrawer}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <OperationalControlDrawer
        open={drawerOpen}
        containerId={selectedRow?.container_id ?? null}
        selectedRow={selectedRow}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
