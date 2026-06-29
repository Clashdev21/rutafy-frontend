import { OperationalControlContainerTable } from "@/components/admin/operational-control/OperationalControlContainerTable";
import { OperationalControlDrawer } from "@/components/admin/operational-control/OperationalControlDrawer";
import {
  EMPTY_OPERATIONAL_FILTERS,
  OperationalControlFilters,
  type OperationalControlFiltersState,
} from "@/components/admin/operational-control/OperationalControlFilters";
import { OperationalControlSummaryCards } from "@/components/admin/operational-control/OperationalControlSummaryCards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOperationalControl } from "@/hooks/useOperationalControl";
import type { OperationalControlContainerRow } from "@/api/operational-control";
import {
  clientFilterContainers,
  sortOperationalContainers,
} from "@/lib/operationalControlConstants";
import { AlertTriangle, LayoutDashboard, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

export default function AdminOperationalControlPage() {
  const [filters, setFilters] = useState<OperationalControlFiltersState>(
    EMPTY_OPERATIONAL_FILTERS,
  );
  const [selectedRow, setSelectedRow] = useState<OperationalControlContainerRow | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const apiParams = useMemo(
    () => ({
      client: filters.client !== "all" ? filters.client : undefined,
      program: filters.program !== "all" ? filters.program : undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      port: filters.port !== "all" ? filters.port : undefined,
      driver: filters.driver !== "all" ? filters.driver : undefined,
      plate: filters.plate !== "all" ? filters.plate : undefined,
      container: filters.container.trim() || undefined,
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

  const displayRows = useMemo(() => {
    const filtered = clientFilterContainers(containers, filters);
    return sortOperationalContainers(filtered);
  }, [containers, filters]);

  const openDrawer = (row: OperationalControlContainerRow) => {
    setSelectedRow(row);
    setDrawerOpen(true);
  };

  const handleSelectRow = (row: OperationalControlContainerRow) => {
    setSelectedRow(row);
    setDrawerOpen(true);
  };

  const showInitialLoading = isLoading && containers.length === 0 && !error;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 shrink-0 text-[#2A9D8F]" aria-hidden />
            Centro Operacional
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Supervisión de contenedores, conductores y calidad operacional en tiempo real.
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

      {showInitialLoading ? (
        <p className="text-sm text-gray-500 py-16 text-center">Cargando centro operacional…</p>
      ) : error && containers.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <p className="text-xs text-gray-400">
            Verifica VITE_RUTAFY_API_BASE y credenciales admin en .env.local
          </p>
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

          <OperationalControlSummaryCards counts={counts} kpis={kpis} />

          <OperationalControlFilters
            filters={filters}
            options={filterOptions}
            onChange={setFilters}
            onClear={() => setFilters(EMPTY_OPERATIONAL_FILTERS)}
          />

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[#1E3A5F]">
                Contenedores
                {!isLoading ? (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({displayRows.length})
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && displayRows.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">Cargando contenedores…</p>
              ) : displayRows.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">
                  No hay contenedores con los filtros actuales.
                </p>
              ) : (
                <OperationalControlContainerTable
                  rows={displayRows}
                  selectedId={selectedRow?.container_id ?? null}
                  onSelectRow={handleSelectRow}
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
        monitoringId={selectedRow?.monitoring_id}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
