import type { OperationalControlContainerDetail } from "@/api/operational-control";
import {
  getOperationalControlContainerDetail,
  getOperationalControlMonitoringDetail,
} from "@/api/operational-control";
import { OperationalControlDrawerMap } from "@/components/admin/operational-control/OperationalControlDrawerMap";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  driverAssignmentDisplay,
  formatGpsAge,
  formatOperationalDateTime,
  gpsStatusDisplay,
  rutafyStatusLabel,
} from "@/lib/operationalControlConstants";
import { buildRiskAlerts, TIMELINE_OPERATION_STEPS } from "@/lib/operationalControlUx";
import { cn } from "@/lib/utils";
import { FileText, Mail } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Props = {
  open: boolean;
  containerId: string | null;
  monitoringId?: string | null;
  riskAlerts?: string[];
  onOpenChange: (open: boolean) => void;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-[#1E3A5F] border-b border-gray-100 pb-2">
      {children}
    </h3>
  );
}

function TruthComparison({ detail }: { detail: OperationalControlContainerDetail }) {
  const d = detail.declared_truth;
  const o = detail.observed_truth;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-xs font-bold tracking-wide text-slate-500">DECLARADO</p>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-gray-500">Puerto </span>
            <span className="font-semibold">{d.declared_port?.trim() || "—"}</span>
          </p>
          <p>
            <span className="text-gray-500">Hora </span>
            <span className="font-semibold tabular-nums">
              {formatOperationalDateTime(d.scheduled_time)}
            </span>
          </p>
          <p>
            <span className="text-gray-500">Conductor </span>
            <span className="font-semibold">{d.driver_name?.trim() || detail.driver.name?.trim() || "—"}</span>
          </p>
          <p>
            <span className="text-gray-500">Placa </span>
            <span className="font-semibold font-mono">
              {d.driver_plate?.trim() || detail.driver.plate?.trim() || "—"}
            </span>
          </p>
        </div>
      </div>
      <div className="hidden sm:flex items-center justify-center text-2xl text-gray-300">↓</div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
        <p className="text-xs font-bold tracking-wide text-emerald-800">REAL</p>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-gray-500">Puerto </span>
            <span className="font-semibold">{o.confirmed_port?.trim() || "—"}</span>
          </p>
          <p>
            <span className="text-gray-500">Hora </span>
            <span className="font-semibold tabular-nums">
              {formatOperationalDateTime(o.actual_entry_at ?? o.eta_at)}
            </span>
          </p>
          <p>
            <span className="text-gray-500">GPS </span>
            <span className="font-semibold">
              {gpsStatusDisplay(o.gps_status ?? detail.gps_status)}
            </span>
          </p>
          <p>
            <span className="text-gray-500">Movimiento </span>
            <span className="font-semibold">{o.movement_status?.trim() || "—"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function OperationalControlDrawer({
  open,
  containerId,
  monitoringId,
  riskAlerts = [],
  onOpenChange,
}: Props) {
  const [detail, setDetail] = useState<OperationalControlContainerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!containerId && !monitoringId) return;
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const result = monitoringId
        ? await getOperationalControlMonitoringDetail(monitoringId)
        : await getOperationalControlContainerDetail(containerId!);
      setDetail(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el detalle");
    } finally {
      setLoading(false);
    }
  }, [containerId, monitoringId]);

  useEffect(() => {
    if (open && (containerId || monitoringId)) void loadDetail();
    if (!open) {
      setDetail(null);
      setError(null);
    }
  }, [open, containerId, monitoringId, loadDetail]);

  const alerts = detail
    ? buildRiskAlerts({
        container_id: detail.container_id,
        alerts: riskAlerts,
        rutafy_status: detail.rutafy_status,
        gps_status: detail.gps_status,
        driver_assignment_state: detail.driver.assignment_state,
        delay_label: detail.observed_truth.delay_label,
        observed_delay: detail.observed_truth.delay_label,
      })
    : riskAlerts;

  const timelineItems =
    detail && detail.timeline.length > 0
      ? detail.timeline
      : TIMELINE_OPERATION_STEPS.map((title) => ({ title, at: null, detail: null }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold text-[#1E3A5F] text-left">
              {detail?.container_label?.trim() || containerId || "Contenedor"}
            </SheetTitle>
            {detail ? (
              <p className="text-sm text-gray-500 text-left">
                {detail.client_name?.trim() || "—"} · {detail.program_name?.trim() || "—"}
              </p>
            ) : null}
          </SheetHeader>
        </div>

        <div className="px-6 py-5 space-y-8">
          {loading ? (
            <p className="text-sm text-gray-500 py-12 text-center">Cargando…</p>
          ) : error ? (
            <p className="text-sm text-red-600 py-12 text-center">{error}</p>
          ) : detail ? (
            <>
              <section className="space-y-3">
                <SectionTitle>Resumen</SectionTitle>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Estado</p>
                    <p className="font-semibold text-[#1E3A5F]">
                      {rutafyStatusLabel(detail.rutafy_status)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Puerto</p>
                    <p className="font-semibold">
                      {detail.declared_truth.declared_port?.trim() || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Destino</p>
                    <p className="font-semibold">
                      {detail.declared_truth.declared_destination?.trim() || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Programación</p>
                    <p className="font-semibold tabular-nums">
                      {formatOperationalDateTime(detail.declared_truth.scheduled_time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Conductor</p>
                    <p className="font-semibold">{detail.driver.name?.trim() || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Placa / GPS</p>
                    <p className="font-semibold">
                      {detail.driver.plate?.trim() || "—"} ·{" "}
                      {gpsStatusDisplay(detail.gps_status)}
                      {formatGpsAge(detail.gps_last_seen_at)
                        ? ` · ${formatGpsAge(detail.gps_last_seen_at)}`
                        : ""}
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle>Riesgo</SectionTitle>
                {alerts.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin alertas activas.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {alerts.map((alert, i) => (
                      <Badge
                        key={`${alert}-${i}`}
                        variant="outline"
                        className={cn(
                          "text-xs font-semibold",
                          /critical|offline|delay|sin match/i.test(alert)
                            ? "bg-red-50 text-red-800 border-red-200"
                            : "bg-amber-50 text-amber-800 border-amber-200",
                        )}
                      >
                        {alert}
                      </Badge>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <SectionTitle>Timeline</SectionTitle>
                <div className="space-y-0">
                  {timelineItems.map((ev, index) => (
                    <div key={`${ev.title}-${index}`} className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-full rounded-lg border px-3 py-2.5 text-sm",
                          index === timelineItems.length - 1 && detail.timeline.length === 0
                            ? "border-gray-100 bg-gray-50 text-gray-500"
                            : "border-[#2A9D8F]/30 bg-white font-medium text-[#1E3A5F]",
                        )}
                      >
                        <p>{ev.title}</p>
                        {ev.at ? (
                          <p className="text-xs text-gray-500 tabular-nums mt-0.5">
                            {formatOperationalDateTime(ev.at)}
                          </p>
                        ) : null}
                      </div>
                      {index < timelineItems.length - 1 ? (
                        <span className="text-gray-300 py-0.5" aria-hidden>
                          ↓
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle>Mapa</SectionTitle>
                <OperationalControlDrawerMap map={detail.map} className="h-80" />
              </section>

              <section className="space-y-3">
                <SectionTitle>Verdad declarada vs real</SectionTitle>
                <TruthComparison detail={detail} />
              </section>

              <section className="space-y-3">
                <SectionTitle>Historial</SectionTitle>
                {detail.history.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin intentos anteriores registrados.</p>
                ) : (
                  <div className="space-y-0">
                    {detail.history.map((ev, index) => (
                      <div key={`${ev.title}-${index}`} className="flex flex-col items-center">
                        <div className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                          <p className="text-sm font-medium">{ev.title}</p>
                          {ev.at ? (
                            <p className="text-xs text-gray-500">
                              {formatOperationalDateTime(ev.at)}
                            </p>
                          ) : null}
                        </div>
                        {index < detail.history.length - 1 ? (
                          <span className="text-gray-300 py-0.5">↓</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <SectionTitle>Documentos</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { icon: FileText, label: "PDF" },
                    { icon: Mail, label: "Correo" },
                    { icon: FileText, label: "Evidencias" },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-4 text-center text-sm text-gray-500"
                    >
                      <Icon className="h-5 w-5 mx-auto mb-1 text-gray-400" aria-hidden />
                      {label}
                      <p className="text-[10px] mt-1">Próximamente</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
