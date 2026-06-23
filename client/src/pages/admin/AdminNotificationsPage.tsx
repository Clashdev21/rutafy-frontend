import {
  getAdminNotificationSummary,
  listAdminNotificationDeliveries,
  listAdminNotificationDevices,
  type AdminNotificationDelivery,
  type AdminNotificationDevice,
  type AdminNotificationSummary,
} from "@/api/admin-notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  actorTypeLabel,
  deliveryStatusBadgeClass,
  deliveryStatusLabel,
  DELIVERY_STATUS_FILTER_OPTIONS,
  enabledBadgeClass,
  enabledLabel,
  EVENT_TYPE_FILTER_OPTIONS,
  eventTypeLabel,
  formatCount,
  formatNotificationDateTime,
  platformEnvironmentLabel,
  truncateId,
  truncateText,
} from "@/lib/adminNotificationConstants";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  MinusCircle,
  RefreshCw,
  Smartphone,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 30_000;
const LIST_LIMIT = 50;

type StatusFilter = (typeof DELIVERY_STATUS_FILTER_OPTIONS)[number]["value"];
type EventTypeFilter = (typeof EVENT_TYPE_FILTER_OPTIONS)[number]["value"];

function DeliveryCard({ delivery }: { delivery: AdminNotificationDelivery }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Badge
          variant="outline"
          className={`text-xs ${deliveryStatusBadgeClass(delivery.status)}`}
        >
          {deliveryStatusLabel(delivery.status)}
        </Badge>
        <span className="text-xs text-gray-500 tabular-nums">
          {formatNotificationDateTime(delivery.created_at)}
        </span>
      </div>
      <p className="text-sm font-medium text-[#1E3A5F]">
        {eventTypeLabel(delivery.event_type)}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
        <span>
          Usuario:{" "}
          <span className="font-mono" title={delivery.user_id ?? undefined}>
            {truncateId(delivery.user_id)}
          </span>
        </span>
        <span>
          Actor: {actorTypeLabel(delivery.actor_type)}{" "}
          <span className="font-mono" title={delivery.actor_id ?? undefined}>
            {truncateId(delivery.actor_id)}
          </span>
        </span>
        <span className="col-span-2">
          Dispositivo:{" "}
          {platformEnvironmentLabel(delivery.platform, delivery.environment)}
        </span>
        <span className="col-span-2">
          Título: {truncateText(delivery.title, 64)}
        </span>
        <span className="col-span-2">
          Cuerpo: {truncateText(delivery.body, 80)}
        </span>
        {delivery.error?.trim() ? (
          <span className="col-span-2 text-red-700" title={delivery.error}>
            Error: {truncateText(delivery.error, 120)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function DeviceCard({ device }: { device: AdminNotificationDevice }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Badge
          variant="outline"
          className={`text-xs ${enabledBadgeClass(device.enabled)}`}
        >
          {enabledLabel(device.enabled)}
        </Badge>
        <span className="text-sm font-medium text-[#1E3A5F]">
          {actorTypeLabel(device.actor_type)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
        <span>
          Usuario:{" "}
          <span className="font-mono" title={device.user_id ?? undefined}>
            {truncateId(device.user_id)}
          </span>
        </span>
        <span>
          Plataforma: {device.platform?.trim() || "—"}
        </span>
        <span>Entorno: {device.environment?.trim() || "—"}</span>
        <span>
          7d: {formatCount(device.deliveries_7d)} / fallos{" "}
          {formatCount(device.failed_7d)}
        </span>
        <span className="col-span-2">
          Última señal: {formatNotificationDateTime(device.last_seen_at)}
        </span>
        <span className="col-span-2">
          Última notificación:{" "}
          {formatNotificationDateTime(device.last_notification_at)}
        </span>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  valueClass,
  iconClass,
  iconBg,
}: {
  label: string;
  value: string;
  icon: typeof Bell;
  valueClass?: string;
  iconClass?: string;
  iconBg?: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 leading-tight">{label}</p>
            <p
              className={`text-2xl font-bold tabular-nums mt-1 ${valueClass ?? "text-[#1E3A5F]"}`}
            >
              {value}
            </p>
          </div>
          <div
            className={`shrink-0 p-2.5 rounded-xl ${iconBg ?? "bg-slate-100"}`}
          >
            <Icon className={`h-5 w-5 ${iconClass ?? "text-[#1E3A5F]"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminNotificationsPage() {
  const [summary, setSummary] = useState<AdminNotificationSummary | null>(null);
  const [deliveries, setDeliveries] = useState<AdminNotificationDelivery[]>([]);
  const [devices, setDevices] = useState<AdminNotificationDevice[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>("all");

  const loadInFlightRef = useRef(false);

  const loadData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (loadInFlightRef.current) return;
      loadInFlightRef.current = true;

      const silent = options?.silent ?? false;
      if (!silent) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const [summaryResult, deliveriesResult, devicesResult] = await Promise.all([
          getAdminNotificationSummary(),
          listAdminNotificationDeliveries({
            limit: LIST_LIMIT,
            status: statusFilter,
            event_type: eventTypeFilter,
          }),
          listAdminNotificationDevices({ limit: LIST_LIMIT }),
        ]);

        setSummary(summaryResult);
        setDeliveries(deliveriesResult.deliveries);
        setDevices(devicesResult.devices);
        setError(null);
        setLastUpdatedAt(new Date());
      } catch (e: unknown) {
        const message =
          e instanceof Error
            ? e.message
            : "No fue posible cargar las notificaciones push";
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        loadInFlightRef.current = false;
      }
    },
    [statusFilter, eventTypeFilter],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadData({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadData]);

  const handleRefresh = () => {
    void loadData({ silent: true });
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setEventTypeFilter("all");
  };

  const hasActiveFilters = statusFilter !== "all" || eventTypeFilter !== "all";
  const showInitialLoading = isLoading && !summary && deliveries.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <Bell className="h-6 w-6 shrink-0 text-[#2A9D8F]" aria-hidden />
            Push Notifications
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Observabilidad de entregas push y dispositivos registrados.
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
          onClick={handleRefresh}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            aria-hidden
          />
          Actualizar
        </Button>
      </div>

      {showInitialLoading ? (
        <p className="text-sm text-gray-500 py-10 text-center">Cargando…</p>
      ) : error && !summary && deliveries.length === 0 && devices.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <p className="text-xs text-gray-400">
            Verifica VITE_RUTAFY_API_BASE y credenciales admin en .env.local
          </p>
          <Button type="button" variant="outline" onClick={() => void loadData()}>
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

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <SummaryCard
              label="Devices activos"
              value={formatCount(summary?.devices_active)}
              icon={Smartphone}
              iconBg="bg-blue-50"
              iconClass="text-blue-700"
            />
            <SummaryCard
              label="Total deliveries"
              value={formatCount(summary?.deliveries_total)}
              icon={Bell}
            />
            <SummaryCard
              label="Sent"
              value={formatCount(summary?.deliveries_sent)}
              icon={CheckCircle2}
              valueClass="text-emerald-700"
              iconBg="bg-emerald-50"
              iconClass="text-emerald-600"
            />
            <SummaryCard
              label="Failed"
              value={formatCount(summary?.deliveries_failed)}
              icon={XCircle}
              valueClass="text-red-700"
              iconBg="bg-red-50"
              iconClass="text-red-600"
            />
            <SummaryCard
              label="Skipped"
              value={formatCount(summary?.deliveries_skipped)}
              icon={MinusCircle}
              valueClass="text-amber-700"
              iconBg="bg-amber-50"
              iconClass="text-amber-600"
            />
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#1E3A5F]">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_STATUS_FILTER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={eventTypeFilter}
                  onValueChange={(v) => setEventTypeFilter(v as EventTypeFilter)}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Tipo de evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPE_FILTER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  className="sm:ml-auto"
                  disabled={!hasActiveFilters}
                  onClick={handleClearFilters}
                >
                  Limpiar filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[#1E3A5F]">
                Entregas
                {!isLoading ? (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({deliveries.length})
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && deliveries.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">Cargando entregas…</p>
              ) : deliveries.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">
                  No hay entregas push con los filtros actuales.
                </p>
              ) : (
                <>
                  <div className="hidden lg:block overflow-x-auto -mx-1">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Evento</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Actor</TableHead>
                          <TableHead>Dispositivo</TableHead>
                          <TableHead>Título / cuerpo</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deliveries.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell className="text-xs whitespace-nowrap tabular-nums text-gray-600">
                              {formatNotificationDateTime(d.created_at)}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {eventTypeLabel(d.event_type)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${deliveryStatusBadgeClass(d.status)}`}
                              >
                                {deliveryStatusLabel(d.status)}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className="font-mono text-xs text-gray-700"
                              title={d.user_id ?? undefined}
                            >
                              {truncateId(d.user_id)}
                            </TableCell>
                            <TableCell className="text-xs text-gray-700 whitespace-nowrap">
                              <span>{actorTypeLabel(d.actor_type)}</span>
                              <span
                                className="font-mono text-gray-500 ml-1"
                                title={d.actor_id ?? undefined}
                              >
                                {truncateId(d.actor_id)}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                              {platformEnvironmentLabel(d.platform, d.environment)}
                            </TableCell>
                            <TableCell className="text-xs text-gray-700 max-w-[220px]">
                              <p className="truncate" title={d.title ?? undefined}>
                                {truncateText(d.title, 40)}
                              </p>
                              <p
                                className="truncate text-gray-500 mt-0.5"
                                title={d.body ?? undefined}
                              >
                                {truncateText(d.body, 56)}
                              </p>
                            </TableCell>
                            <TableCell
                              className="text-xs text-red-700 max-w-[160px] truncate"
                              title={d.error ?? undefined}
                            >
                              {d.error?.trim() ? truncateText(d.error, 80) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="lg:hidden space-y-3">
                    {deliveries.map((d) => (
                      <DeliveryCard key={d.id} delivery={d} />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[#1E3A5F]">
                Dispositivos
                {!isLoading ? (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({devices.length})
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && devices.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  Cargando dispositivos…
                </p>
              ) : devices.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">
                  No hay dispositivos push registrados.
                </p>
              ) : (
                <>
                  <div className="hidden lg:block overflow-x-auto -mx-1">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Actor</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Plataforma</TableHead>
                          <TableHead>Entorno</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Última señal</TableHead>
                          <TableHead>Última notificación</TableHead>
                          <TableHead className="text-right">7d</TableHead>
                          <TableHead className="text-right">Fallos 7d</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {devices.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell className="text-sm whitespace-nowrap">
                              {actorTypeLabel(device.actor_type)}
                            </TableCell>
                            <TableCell
                              className="font-mono text-xs text-gray-700"
                              title={device.user_id ?? undefined}
                            >
                              {truncateId(device.user_id)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-700">
                              {device.platform?.trim() || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-gray-700">
                              {device.environment?.trim() || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${enabledBadgeClass(device.enabled)}`}
                              >
                                {enabledLabel(device.enabled)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap tabular-nums text-gray-600">
                              {formatNotificationDateTime(device.last_seen_at)}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap tabular-nums text-gray-600">
                              {formatNotificationDateTime(device.last_notification_at)}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {formatCount(device.deliveries_7d)}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-red-700">
                              {formatCount(device.failed_7d)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="lg:hidden space-y-3">
                    {devices.map((device) => (
                      <DeviceCard key={device.id} device={device} />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
