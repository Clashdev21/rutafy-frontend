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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  driverAssignmentDisplay,
  formatGpsAge,
  formatOperationalDateTime,
  gpsStatusDisplay,
  historyBadgeLabel,
  LIFECYCLE_DEFAULT_STEPS,
  phaseBadgeClass,
  phaseLabel,
  rutafyStatusBadgeClass,
  rutafyStatusLabel,
} from "@/lib/operationalControlConstants";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

type Props = {
  open: boolean;
  containerId: string | null;
  monitoringId?: string | null;
  onOpenChange: (open: boolean) => void;
};

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-900 break-words">{value}</p>
    </div>
  );
}

function LifecycleSection({ detail }: { detail: OperationalControlContainerDetail }) {
  const steps =
    detail.lifecycle.length > 0
      ? detail.lifecycle
      : LIFECYCLE_DEFAULT_STEPS.map((s) => ({
          key: s.key,
          label: s.label,
          completed: false,
          current: detail.phase?.toLowerCase().includes(s.key),
        }));

  return (
    <div className="space-y-1 py-2">
      {steps.map((step, index) => (
        <div key={step.key} className="flex flex-col items-center">
          <div
            className={cn(
              "w-full rounded-md border px-3 py-2 text-sm text-center",
              step.current
                ? "border-[#2A9D8F] bg-[#2A9D8F]/10 font-semibold text-[#1E3A5F]"
                : step.completed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-gray-100 bg-gray-50 text-gray-600",
            )}
          >
            {step.label}
          </div>
          {index < steps.length - 1 ? (
            <span className="text-gray-300 text-lg leading-none py-0.5" aria-hidden>
              ↓
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function TruthComparison({ detail }: { detail: OperationalControlContainerDetail }) {
  const d = detail.declared_truth;
  const o = detail.observed_truth;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-600 uppercase">Declarado</p>
        <DetailField label="Puerto declarado" value={d.declared_port?.trim() || "—"} />
        <DetailField label="Hora programada" value={formatOperationalDateTime(d.scheduled_time)} />
        <DetailField label="Destino declarado" value={d.declared_destination?.trim() || "—"} />
        {d.original_email?.trim() ? (
          <DetailField label="Correo original" value={d.original_email} />
        ) : null}
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
        <p className="text-xs font-semibold text-emerald-800 uppercase">Real</p>
        <DetailField label="Puerto confirmado" value={o.confirmed_port?.trim() || "—"} />
        <DetailField label="Ingreso real" value={formatOperationalDateTime(o.actual_entry_at)} />
        <DetailField label="Salida real" value={formatOperationalDateTime(o.actual_exit_at)} />
        <DetailField label="ETA" value={formatOperationalDateTime(o.eta_at)} />
        <DetailField label="Cumplimiento" value={o.compliance?.trim() || "—"} />
        <DetailField
          label="Retraso"
          value={o.delay_label?.trim() || (o.delay_minutes != null ? `${o.delay_minutes} min` : "—")}
        />
      </div>
    </div>
  );
}

export function OperationalControlDrawer({
  open,
  containerId,
  monitoringId,
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
    if (open && (containerId || monitoringId)) {
      void loadDetail();
    }
    if (!open) {
      setDetail(null);
      setError(null);
    }
  }, [open, containerId, monitoringId, loadDetail]);

  const historyLabel = historyBadgeLabel(detail?.history_count);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-[#1E3A5F] flex flex-wrap items-center gap-2">
            {detail?.container_label?.trim() || containerId || "Contenedor"}
            {historyLabel ? (
              <Badge variant="outline" className="text-xs">
                {historyLabel}
              </Badge>
            ) : null}
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <p className="text-sm text-gray-500 py-8 text-center">Cargando detalle…</p>
        ) : error ? (
          <p className="text-sm text-red-600 py-8 text-center">{error}</p>
        ) : detail ? (
          <Tabs defaultValue="resumen" className="mt-4">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
              {[
                ["resumen", "Resumen"],
                ["lifecycle", "Lifecycle"],
                ["declarada", "Verdad declarada"],
                ["real", "Verdad real"],
                ["conductor", "Conductor"],
                ["mapa", "Mapa"],
                ["timeline", "Timeline"],
                ["historial", "Historial"],
              ].map(([value, label]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="text-xs data-[state=active]:bg-[#2A9D8F]/15 data-[state=active]:text-[#1E3A5F]"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="resumen" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Contenedor" value={detail.container_label?.trim() || "—"} />
                <DetailField label="Cliente" value={detail.client_name?.trim() || "—"} />
                <DetailField label="Programa" value={detail.program_name?.trim() || "—"} />
                <DetailField
                  label="Estado"
                  value={rutafyStatusLabel(detail.rutafy_status)}
                />
                <DetailField
                  label="Conductor"
                  value={detail.driver.name?.trim() || "—"}
                />
                <DetailField label="Placa" value={detail.driver.plate?.trim() || "—"} />
                <DetailField
                  label="GPS"
                  value={`${gpsStatusDisplay(detail.gps_status)}${formatGpsAge(detail.gps_last_seen_at) ? ` · ${formatGpsAge(detail.gps_last_seen_at)}` : ""}`}
                />
              </div>
            </TabsContent>

            <TabsContent value="lifecycle" className="mt-4">
              <LifecycleSection detail={detail} />
            </TabsContent>

            <TabsContent value="declarada" className="mt-4 space-y-2">
              <DetailField
                label="Puerto declarado"
                value={detail.declared_truth.declared_port?.trim() || "—"}
              />
              <DetailField
                label="Hora programada"
                value={formatOperationalDateTime(detail.declared_truth.scheduled_time)}
              />
              <DetailField
                label="Destino declarado"
                value={detail.declared_truth.declared_destination?.trim() || "—"}
              />
              <DetailField
                label="Correo original"
                value={detail.declared_truth.original_email?.trim() || "—"}
              />
            </TabsContent>

            <TabsContent value="real" className="mt-4">
              <TruthComparison detail={detail} />
            </TabsContent>

            <TabsContent value="conductor" className="mt-4 space-y-2">
              <DetailField label="Nombre" value={detail.driver.name?.trim() || "—"} />
              <DetailField label="Placa" value={detail.driver.plate?.trim() || "—"} />
              <DetailField
                label="Estado"
                value={driverAssignmentDisplay(detail.driver.assignment_state)}
              />
              <DetailField label="Teléfono" value={detail.driver.phone?.trim() || "—"} />
            </TabsContent>

            <TabsContent value="mapa" className="mt-4">
              <OperationalControlDrawerMap map={detail.map} />
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              {detail.timeline.length === 0 ? (
                <p className="text-sm text-gray-400">Sin eventos en timeline.</p>
              ) : (
                <ol className="space-y-2">
                  {detail.timeline.map((ev, i) => (
                    <li
                      key={`${ev.title}-${i}`}
                      className="rounded-md border border-gray-100 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-[#1E3A5F]">{ev.title}</p>
                      {ev.at ? (
                        <p className="text-xs text-gray-500 tabular-nums">
                          {formatOperationalDateTime(ev.at)}
                        </p>
                      ) : null}
                      {ev.detail ? (
                        <p className="text-xs text-gray-600 mt-0.5">{ev.detail}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </TabsContent>

            <TabsContent value="historial" className="mt-4">
              {detail.history.length === 0 ? (
                <p className="text-sm text-gray-400">Sin historial adicional.</p>
              ) : (
                <div className="space-y-1 py-2">
                  {detail.history.map((ev, index) => (
                    <div key={`${ev.title}-${index}`} className="flex flex-col items-center">
                      <div className="w-full rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
                        <p className="font-medium text-[#1E3A5F]">{ev.title}</p>
                        {ev.at ? (
                          <p className="text-xs text-gray-500">
                            {formatOperationalDateTime(ev.at)}
                          </p>
                        ) : null}
                      </div>
                      {index < detail.history.length - 1 ? (
                        <span className="text-gray-300 py-0.5" aria-hidden>
                          ↓
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : null}

        {detail ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {detail.rutafy_status ? (
              <Badge
                variant="outline"
                className={rutafyStatusBadgeClass(detail.rutafy_status)}
              >
                {rutafyStatusLabel(detail.rutafy_status)}
              </Badge>
            ) : null}
            {detail.phase ? (
              <Badge variant="outline" className={phaseBadgeClass(detail.phase)}>
                {phaseLabel(detail.phase)}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
