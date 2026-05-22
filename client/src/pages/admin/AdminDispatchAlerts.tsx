import {
  getDispatchAlerts,
  redispatchService,
  type DispatchAlertItem,
} from "@/api/admin";
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 30_000;

const ALERT_TYPE_LABELS: Record<string, string> = {
  sla_pickup_breach: "Recogida retrasada",
  sla_delivery_breach: "Entrega retrasada",
};

const TITLE_CURRENT_STATUS =
  "Estado actual del servicio. CLAIMED significa que ya fue tomado por un mensajero. REQUESTED significa que sigue pendiente.";

const TITLE_DISPATCH_STATUS =
  "Estado del proceso de asignación. EXHAUSTED significa que no hay candidatos disponibles o se agotaron las ofertas.";

const TITLE_DEADLINE_VENCIDO =
  "El plazo SLA configurado para esta etapa ya fue superado.";

function formatMinutesAgo(iso?: string | null): string | null {
  if (iso == null || String(iso).trim() === "") return null;
  const detectedMs = Date.parse(String(iso));
  if (!Number.isFinite(detectedMs)) return null;
  const minutes = (Date.now() - detectedMs) / 60_000;
  if (minutes < 1) return "hace <1 min";
  return `hace ${Math.floor(minutes)} min`;
}

function isSlaDeadlineBreached(deadlineIso?: string | null): boolean {
  if (deadlineIso == null || String(deadlineIso).trim() === "") return false;
  const deadlineMs = Date.parse(String(deadlineIso));
  if (!Number.isFinite(deadlineMs)) return false;
  return Date.now() > deadlineMs;
}

function getAlertLabel(alertType: string): string {
  const key = alertType.trim().toLowerCase();
  return ALERT_TYPE_LABELS[key] ?? alertType;
}

function truncateServiceId(serviceId: string, maxLen = 12): string {
  const id = serviceId.trim();
  if (id.length <= maxLen) return id;
  return `${id.slice(0, maxLen)}…`;
}

function getAssignedMessengerId(item: DispatchAlertItem): string | null {
  const assigned = item.assigned_messenger_id?.trim();
  if (assigned) return assigned;
  const mensajero = item.mensajero_id?.trim();
  return mensajero || null;
}

function canRedispatch(item: DispatchAlertItem): boolean {
  if (item.current_status !== "REQUESTED") return false;
  if (item.assigned_messenger_id != null) return false;
  const dispatch = item.dispatch_status;
  return dispatch === "EXHAUSTED" || dispatch === "PENDING";
}

function getRedispatchTitle(item: DispatchAlertItem): string {
  if (canRedispatch(item)) {
    return "Reintentar asignación de mensajero para este servicio.";
  }
  if (item.current_status !== "REQUESTED") {
    return "Solo se puede redispatchar servicios en estado REQUESTED.";
  }
  if (item.assigned_messenger_id != null) {
    return "No se puede redispatchar porque el servicio ya tiene mensajero asignado.";
  }
  const dispatch = item.dispatch_status;
  if (dispatch !== "EXHAUSTED" && dispatch !== "PENDING") {
    return "Redispatch disponible solo cuando dispatch_status es EXHAUSTED o PENDING.";
  }
  return "Reintentar asignación de mensajero para este servicio.";
}

function AlertRow({
  item,
  onRefresh,
}: {
  item: DispatchAlertItem;
  onRefresh: () => void;
}) {
  const [isRedispatching, setIsRedispatching] = useState(false);
  const detectedLabel = formatMinutesAgo(item.detected_at);
  const deadlineBreached = isSlaDeadlineBreached(item.sla_deadline_at);
  const messengerId = getAssignedMessengerId(item);
  const redispatchEnabled = canRedispatch(item);

  const handleViewService = () => {
    window.open(
      `/admin/services?service_id=${encodeURIComponent(item.service_id)}`,
      "_blank",
    );
  };

  const handleRedispatch = async () => {
    if (!redispatchEnabled || isRedispatching) return;
    setIsRedispatching(true);
    try {
      await redispatchService(item.service_id);
      toast.success("Redispatch ejecutado");
      onRefresh();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No fue posible ejecutar redispatch";
      toast.error(message);
    } finally {
      setIsRedispatching(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Badge variant="destructive" className="text-xs font-semibold">
          {getAlertLabel(item.alert_type)}
        </Badge>
        {detectedLabel ? (
          <span className="text-xs text-gray-500">{detectedLabel}</span>
        ) : null}
      </div>

      <div className="space-y-1">
        <p className="text-xs text-gray-500">Servicio</p>
        <p
          className="font-mono text-sm font-medium text-[#1E3A5F] break-all"
          title={item.service_id}
        >
          {truncateServiceId(item.service_id)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {item.current_status ? (
          <Badge
            variant="outline"
            className="text-xs cursor-help"
            title={TITLE_CURRENT_STATUS}
          >
            {item.current_status}
          </Badge>
        ) : null}
        {item.dispatch_status ? (
          <Badge
            variant="secondary"
            className="text-xs cursor-help"
            title={TITLE_DISPATCH_STATUS}
          >
            {item.dispatch_status}
          </Badge>
        ) : null}
        {deadlineBreached ? (
          <Badge
            variant="destructive"
            className="text-xs cursor-help"
            title={TITLE_DEADLINE_VENCIDO}
          >
            Deadline vencido
          </Badge>
        ) : null}
      </div>

      {messengerId ? (
        <div className="text-xs text-gray-600">
          <span className="text-gray-500">Mensajero: </span>
          <span className="font-mono break-all">{messengerId}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-200/80">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={handleViewService}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver servicio
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 text-xs gap-1"
          disabled={!redispatchEnabled || isRedispatching}
          title={getRedispatchTitle(item)}
          onClick={() => void handleRedispatch()}
        >
          <RotateCcw
            className={`h-3.5 w-3.5 ${isRedispatching ? "animate-spin" : ""}`}
          />
          {isRedispatching ? "Redispatch…" : "Redispatch"}
        </Button>
      </div>
    </div>
  );
}

export default function AdminDispatchAlerts() {
  const [items, setItems] = useState<DispatchAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const loadInFlightRef = useRef(false);

  const loadAlerts = useCallback(async (options?: { silent?: boolean }) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;

    const silent = options?.silent ?? false;
    if (!silent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const data = await getDispatchAlerts({ status: "active", limit: 50 });
      setItems(data.items);
      setError(null);
      setLastUpdatedAt(new Date());
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No fue posible cargar las alertas";
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      loadInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadAlerts({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadAlerts]);

  const handleRefresh = () => {
    void loadAlerts({ silent: true });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">Alertas SLA</h1>
            <p className="text-gray-500 mt-1">
              Alertas activas de dispatch
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
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#1E3A5F] flex items-center gap-2">
              <TriangleAlert className="h-5 w-5" />
              Alertas activas ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && items.length === 0 ? (
              <div className="text-center py-8 text-gray-400">Cargando...</div>
            ) : error && items.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-red-600 text-sm font-medium">{error}</p>
                <p className="text-xs text-gray-400">
                  Verifica VITE_RUTAFY_API_BASE y VITE_RUTAFY_ADMIN_KEY en
                  .env.local
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No hay alertas activas
              </div>
            ) : (
              <div className="space-y-3">
                {error ? (
                  <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
                    {error} (mostrando últimos datos disponibles)
                  </p>
                ) : null}
                {items.map((item) => (
                  <AlertRow
                    key={item.alert_id}
                    item={item}
                    onRefresh={() => void loadAlerts({ silent: true })}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
