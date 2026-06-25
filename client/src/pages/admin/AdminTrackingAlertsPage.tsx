import {
  listAdminTrackingAlerts,
  type AdminTrackingAlert,
} from "@/api/tracking-alerts";
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
  ALERT_TYPE_FILTER_OPTIONS,
  formatAlertCount,
  normalizeAlertType,
  normalizeSeverity,
  SEVERITY_FILTER_OPTIONS,
  SINCE_FILTER_OPTIONS,
  sincePresetToIso,
  trackingAlertTypeLabel,
  trackingSeverityBadgeClass,
  trackingSeverityLabel,
  type AlertTypeFilter,
  type SeverityFilter,
  type SinceFilter,
} from "@/lib/trackingAlertConstants";
import {
  captureQualityBadgeClass,
  captureQualityDisplay,
  trackingPurposeLabel,
} from "@/lib/trackingSessionConstants";
import {
  formatCoveragePct,
  formatDurationSeconds,
  formatTrackingDateTime,
  truncateUuid,
} from "@/lib/trackingSessionFormatters";
import {
  AlertTriangle,
  ExternalLink,
  PauseCircle,
  Radar,
  RefreshCw,
  Route,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

const POLL_INTERVAL_MS = 30_000;
const LIST_LIMIT = 50;

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
  icon: typeof ShieldAlert;
  valueClass?: string;
  iconClass?: string;
  iconBg?: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-gray-500 leading-tight">{label}</p>
            <p
              className={`text-xl sm:text-2xl font-bold tabular-nums mt-1 ${valueClass ?? "text-[#1E3A5F]"}`}
            >
              {value}
            </p>
          </div>
          <div
            className={`shrink-0 p-2 sm:p-2.5 rounded-xl ${iconBg ?? "bg-slate-100"}`}
          >
            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconClass ?? "text-[#1E3A5F]"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertCard({
  alert,
  onViewSession,
}: {
  alert: AdminTrackingAlert;
  onViewSession: (sessionId: string) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={`text-xs ${trackingSeverityBadgeClass(alert.severity)}`}
          >
            {trackingSeverityLabel(alert.severity)}
          </Badge>
          <Badge variant="outline" className="text-xs text-gray-700">
            {trackingAlertTypeLabel(alert.alert_type)}
          </Badge>
        </div>
        <span className="text-xs text-gray-500 tabular-nums">
          {formatTrackingDateTime(alert.detected_at)}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1 text-xs text-gray-600">
        <span>
          Vehículo:{" "}
          <span className="font-medium text-gray-800">
            {alert.vehicle_label?.trim() || "—"}
          </span>
        </span>
        <span>
          Cobertura:{" "}
          <span className="font-medium tabular-nums">
            {formatCoveragePct(alert.coverage_pct)}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          Calidad:{" "}
          {alert.capture_quality?.trim() ? (
            <Badge
              variant="outline"
              className={`text-[10px] ${captureQualityBadgeClass(alert.capture_quality)}`}
            >
              {captureQualityDisplay(alert.capture_quality)}
            </Badge>
          ) : (
            "—"
          )}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1 w-full sm:w-auto"
        onClick={() => onViewSession(alert.session_id)}
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        Ver sesión
      </Button>
    </div>
  );
}

function computeKpis(alerts: AdminTrackingAlert[]) {
  const sessionIds = new Set<string>();
  let high = 0;
  let medium = 0;
  let largeGap = 0;
  let lowCoverage = 0;

  for (const alert of alerts) {
    sessionIds.add(alert.session_id);
    const severity = normalizeSeverity(alert.severity);
    if (severity === "high") high += 1;
    if (severity === "medium") medium += 1;
    const type = normalizeAlertType(alert.alert_type);
    if (type === "tracking_large_gap") largeGap += 1;
    if (type === "tracking_low_coverage") lowCoverage += 1;
  }

  return {
    total: alerts.length,
    high,
    medium,
    largeGap,
    lowCoverage,
    affectedSessions: sessionIds.size,
  };
}

export default function AdminTrackingAlertsPage() {
  const [, setLocation] = useLocation();
  const [alerts, setAlerts] = useState<AdminTrackingAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [alertTypeFilter, setAlertTypeFilter] = useState<AlertTypeFilter>("all");
  const [sinceFilter, setSinceFilter] = useState<SinceFilter>("7d");

  const loadInFlightRef = useRef(false);

  const kpis = useMemo(() => computeKpis(alerts), [alerts]);

  const loadAlerts = useCallback(
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
        const since = sincePresetToIso(sinceFilter);
        const result = await listAdminTrackingAlerts({
          limit: LIST_LIMIT,
          severity: severityFilter,
          alert_type: alertTypeFilter,
          since: since ?? undefined,
        });
        setAlerts(result.items);
        setError(null);
        setLastUpdatedAt(new Date());
      } catch (e: unknown) {
        const message =
          e instanceof Error
            ? e.message
            : "No fue posible cargar las alertas de calidad GPS";
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        loadInFlightRef.current = false;
      }
    },
    [severityFilter, alertTypeFilter, sinceFilter],
  );

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

  const handleClearFilters = () => {
    setSeverityFilter("all");
    setAlertTypeFilter("all");
    setSinceFilter("all");
  };

  const handleViewSession = (sessionId: string) => {
    const id = sessionId.trim();
    if (!id) return;
    setLocation(`/admin/tracking/${encodeURIComponent(id)}`);
  };

  const hasActiveFilters =
    severityFilter !== "all" ||
    alertTypeFilter !== "all" ||
    sinceFilter !== "all";

  const showInitialLoading = isLoading && alerts.length === 0 && !error;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 shrink-0 text-[#2A9D8F]" aria-hidden />
            Calidad GPS
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Alertas de calidad de captura. Solo visibles para administración.
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
      ) : error && alerts.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <p className="text-xs text-gray-400">
            Verifica VITE_RUTAFY_API_BASE y credenciales admin en .env.local
          </p>
          <Button type="button" variant="outline" onClick={() => void loadAlerts()}>
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

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <SummaryCard
              label="Total alertas"
              value={formatAlertCount(kpis.total)}
              icon={ShieldAlert}
            />
            <SummaryCard
              label="Alta severidad"
              value={formatAlertCount(kpis.high)}
              icon={AlertTriangle}
              valueClass="text-red-700"
              iconBg="bg-red-50"
              iconClass="text-red-600"
            />
            <SummaryCard
              label="Media severidad"
              value={formatAlertCount(kpis.medium)}
              icon={AlertTriangle}
              valueClass="text-amber-700"
              iconBg="bg-amber-50"
              iconClass="text-amber-600"
            />
            <SummaryCard
              label="Large gap"
              value={formatAlertCount(kpis.largeGap)}
              icon={PauseCircle}
              iconBg="bg-orange-50"
              iconClass="text-orange-600"
            />
            <SummaryCard
              label="Low coverage"
              value={formatAlertCount(kpis.lowCoverage)}
              icon={Radar}
              iconBg="bg-blue-50"
              iconClass="text-blue-600"
            />
            <SummaryCard
              label="Sesiones afectadas"
              value={formatAlertCount(kpis.affectedSessions)}
              icon={Users}
              iconBg="bg-teal-50"
              iconClass="text-teal-700"
            />
          </div>

          <p className="text-[11px] text-gray-400">
            KPIs calculados sobre los últimos {LIST_LIMIT} registros devueltos por
            la API.
          </p>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#1E3A5F]">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Select
                  value={severityFilter}
                  onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Severidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_FILTER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={alertTypeFilter}
                  onValueChange={(v) => setAlertTypeFilter(v as AlertTypeFilter)}
                >
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Tipo de alerta" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALERT_TYPE_FILTER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sinceFilter}
                  onValueChange={(v) => setSinceFilter(v as SinceFilter)}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    {SINCE_FILTER_OPTIONS.map((opt) => (
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
              <CardTitle className="text-lg text-[#1E3A5F] flex items-center gap-2">
                <Route className="h-5 w-5 shrink-0" aria-hidden />
                Alertas de calidad
                {!isLoading ? (
                  <span className="text-sm font-normal text-gray-400">
                    ({alerts.length})
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && alerts.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  Cargando alertas…
                </p>
              ) : alerts.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">
                  No hay alertas de calidad GPS con los filtros actuales.
                </p>
              ) : (
                <>
                  <div className="hidden lg:block overflow-x-auto -mx-1">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Severidad</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Sesión</TableHead>
                          <TableHead>Propósito</TableHead>
                          <TableHead>Vehículo</TableHead>
                          <TableHead className="text-right">Cobertura</TableHead>
                          <TableHead>Calidad</TableHead>
                          <TableHead>Gap máximo</TableHead>
                          <TableHead className="text-right">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alerts.map((alert) => (
                          <TableRow key={alert.id}>
                            <TableCell className="text-xs whitespace-nowrap tabular-nums text-gray-600">
                              {formatTrackingDateTime(alert.detected_at)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${trackingSeverityBadgeClass(alert.severity)}`}
                              >
                                {trackingSeverityLabel(alert.severity)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {trackingAlertTypeLabel(alert.alert_type)}
                            </TableCell>
                            <TableCell
                              className="font-mono text-xs text-gray-700"
                              title={alert.session_id}
                            >
                              {truncateUuid(alert.session_id)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-700 whitespace-nowrap">
                              {trackingPurposeLabel(alert.purpose)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-700 max-w-[140px] truncate">
                              {alert.vehicle_label?.trim() || "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-gray-700">
                              {formatCoveragePct(alert.coverage_pct)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {alert.capture_quality?.trim() ? (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${captureQualityBadgeClass(alert.capture_quality)}`}
                                >
                                  {captureQualityDisplay(alert.capture_quality)}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap tabular-nums text-gray-600">
                              {formatDurationSeconds(alert.max_gap_seconds)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs gap-1 text-[#2A9D8F]"
                                onClick={() => handleViewSession(alert.session_id)}
                              >
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                                Ver sesión
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="lg:hidden space-y-3">
                    {alerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onViewSession={handleViewSession}
                      />
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
