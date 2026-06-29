import { OperationalControlCommandSearch } from "@/components/admin/operational-control/OperationalControlCommandSearch";
import { OperationalControlDrawer } from "@/components/admin/operational-control/OperationalControlDrawer";
import {
  EMPTY_OPERATIONAL_FILTERS,
  OperationalControlFilters,
  type OperationalControlFiltersState,
} from "@/components/admin/operational-control/OperationalControlFilters";
import { OperationalControlQuickTabs } from "@/components/admin/operational-control/OperationalControlQuickTabs";
import { OperationalLiveContainerTable } from "@/components/admin/operational-twin/OperationalLiveContainerTable";
import { OperationalTowerKpiStrip } from "@/components/admin/operational-twin/OperationalTowerKpiStrip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useOperationalTwinTower } from "@/hooks/useOperationalTwinTower";
import type { OperationalControlContainerRow } from "@/api/operational-control";
import { clientFilterContainers } from "@/lib/operationalControlConstants";
import {
  countByQuickTab,
  filterByQuickTab,
  matchesCommandSearch,
} from "@/lib/operationalControlUx";
import type { ContainerLiveState } from "@/lib/operationalTwinUx";
import { AlertTriangle, LayoutDashboard, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import type { QuickTab } from "@/lib/operationalControlUx";

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
    containers,
    filterOptions,
    isLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    refresh,
    liveStates,
    towerKpis,
  } = useOperationalTwinTower(apiParams);

  const filteredStates = useMemo(() => {
    const filteredRows = clientFilterContainers(containers, filters);
    const allowed = new Set(filteredRows.map((r) => r.container_id));
    const searched = liveStates.filter((s) => {
      if (!allowed.has(s.container_id)) return false;
      return matchesCommandSearch(s.row, searchQuery);
    });
    const tabIds = new Set(
      filterByQuickTab(
        searched.map((s) => s.row),
        quickTab,
      ).map((r) => r.container_id),
    );
    return searched.filter((s) => tabIds.has(s.container_id));
  }, [liveStates, containers, filters, searchQuery, quickTab]);

  const tabBaseRows = useMemo(() => {
    const filteredRows = clientFilterContainers(containers, filters);
    const allowed = new Set(filteredRows.map((r) => r.container_id));
    return liveStates
      .filter((s) => allowed.has(s.container_id))
      .filter((s) => matchesCommandSearch(s.row, searchQuery))
      .map((s) => s.row);
  }, [liveStates, containers, filters, searchQuery]);

  const tabCounts = useMemo(() => countByQuickTab(tabBaseRows), [tabBaseRows]);

  const openDrawer = (state: ContainerLiveState) => {
    setSelectedRow(state.row);
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
        onSelect={(row) => {
          setSelectedRow(row);
          setDrawerOpen(true);
        }}
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

          <OperationalTowerKpiStrip kpis={towerKpis} />

          <OperationalControlFilters
            filters={filters}
            options={filterOptions}
            onChange={setFilters}
            onClear={() => setFilters(EMPTY_OPERATIONAL_FILTERS)}
          />

          <OperationalControlQuickTabs
            active={quickTab}
            counts={tabCounts}
            onChange={setQuickTab}
          />

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0 sm:p-4 pt-4">
              {isLoading && filteredStates.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center px-4">
                  Cargando contenedores…
                </p>
              ) : filteredStates.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center px-4">
                  No hay contenedores con los filtros actuales.
                </p>
              ) : (
                <OperationalLiveContainerTable
                  states={filteredStates}
                  onSelect={openDrawer}
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
