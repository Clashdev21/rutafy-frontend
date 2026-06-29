import { getAdminMessengers, type AdminMessenger } from "@/api/admin-messengers";
import { OperationalTransporterDrawer } from "@/components/admin/operational-transporters/OperationalTransporterDrawer";
import { OperationalTransportersTable } from "@/components/admin/operational-transporters/OperationalTransportersTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCount } from "@/lib/operationalControlConstants";
import { AlertTriangle, RefreshCw, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const POLL_INTERVAL_MS = 30_000;

function computeFleetKpis(messengers: AdminMessenger[]) {
  const active = messengers.filter((m) => m.is_active);
  const available = active.filter((m) => {
    const s = String(m.availability_status ?? "").toUpperCase();
    return s === "AVAILABLE" || s === "ONLINE";
  });
  const inOperation = active.filter((m) => {
    const s = String(m.availability_status ?? "").toUpperCase();
    return s === "BUSY" || s === "IN_SERVICE" || s === "ASSIGNED";
  });
  const minimulas = active.filter((m) =>
    /mini|minimula/i.test(String(m.vehicle_type ?? "")),
  ).length;
  const tractomula = active.filter((m) =>
    /tracto|trailer|cabezote/i.test(String(m.vehicle_type ?? "")),
  ).length;

  return {
    total: active.length,
    available: available.length,
    inOperation: inOperation.length,
    minimulas,
    tractomula,
  };
}

export default function AdminOperationalTransportersPage() {
  const [messengers, setMessengers] = useState<AdminMessenger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [selected, setSelected] = useState<AdminMessenger | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const loadInFlightRef = useRef(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    const silent = options?.silent ?? false;
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const items = await getAdminMessengers({ limit: 200, is_active: "true" });
      setMessengers(items);
      setError(null);
      setLastUpdatedAt(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No fue posible cargar transportistas");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      loadInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => void load({ silent: true }), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const kpis = useMemo(() => computeFleetKpis(messengers), [messengers]);

  const openDrawer = (m: AdminMessenger) => {
    setSelected(m);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <Truck className="h-6 w-6 shrink-0 text-[#2A9D8F]" aria-hidden />
            Transportistas
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Flota Portex: conductores, vehículos y disponibilidad en operación de contenedores.
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
          disabled={isLoading || isRefreshing}
          onClick={() => void load({ silent: true })}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {error && messengers.length === 0 ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <>
          {error ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Transportistas", value: kpis.total },
              { label: "Disponibles", value: kpis.available },
              { label: "En operación", value: kpis.inOperation },
              { label: "Minimulas", value: kpis.minimulas },
              { label: "Tractomula", value: kpis.tractomula },
            ].map((item) => (
              <Card key={item.label} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-2xl font-bold text-[#1E3A5F] tabular-nums mt-1">
                    {formatCount(item.value)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              {isLoading && messengers.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">Cargando…</p>
              ) : messengers.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">
                  No hay transportistas activos.
                </p>
              ) : (
                <OperationalTransportersTable
                  messengers={messengers}
                  onSelect={openDrawer}
                  onViewDetail={openDrawer}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <OperationalTransporterDrawer
        open={drawerOpen}
        messenger={selected}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
