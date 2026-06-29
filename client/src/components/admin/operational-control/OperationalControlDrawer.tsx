import type { OperationalControlContainerRow } from "@/api/operational-control";
import { getOperationalControlContainerDetail } from "@/api/operational-control";
import { getOperationalDigitalTwinContainer } from "@/api/operational-digital-twin";
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
  formatGpsAge,
  formatOperationalDateTime,
  gpsStatusDisplay,
} from "@/lib/operationalControlConstants";
import {
  formatDestinationLabel,
  formatScheduledLabel,
  formatTimeLabel,
} from "@/lib/operationalControlDisplay";
import {
  buildDrawerViewFromDigitalTwin,
  buildDrawerViewFromLegacyDetail,
  buildDrawerViewFromRow,
  drawerDestinationLabel,
  drawerPortLabel,
  formatBooleanLabel,
  formatProbability,
  type OperationalDrawerViewModel,
} from "@/lib/operationalDrawerViewModel";
import { buildRiskAlerts, TIMELINE_OPERATION_STEPS } from "@/lib/operationalControlUx";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Props = {
  open: boolean;
  containerId: string | null;
  selectedRow?: OperationalControlContainerRow | null;
  onOpenChange: (open: boolean) => void;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-semibold text-sm text-[#1E3A5F]">{value}</p>
    </div>
  );
}

function RowFallbackBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

function RiskSection({ view }: { view: OperationalDrawerViewModel }) {
  const alerts = buildRiskAlerts({
    container_id: view.container_id,
    alerts: view.alerts,
    rutafy_status: view.current_phase_label,
    gps_status: view.gps_status,
    driver_assignment_state: null,
    delay_label: null,
    observed_delay: null,
  });

  if (alerts.length === 0 && !view.risk_level) {
    return <p className="text-sm text-gray-500">Sin alertas activas.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {view.risk_level ? (
        <Badge variant="outline" className="text-xs font-semibold bg-slate-50">
          Riesgo: {view.risk_level}
        </Badge>
      ) : null}
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
  );
}

export function OperationalControlDrawer({
  open,
  containerId,
  selectedRow = null,
  onOpenChange,
}: Props) {
  const [view, setView] = useState<OperationalDrawerViewModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!containerId) return;
    setLoading(true);
    setError(null);
    setView(null);

    const programCode = selectedRow?.program_name?.trim();
    const params = programCode ? { program_code: programCode } : undefined;

    try {
      try {
        const twin = await getOperationalDigitalTwinContainer(containerId, params);
        setView(buildDrawerViewFromDigitalTwin(twin, selectedRow));
        return;
      } catch {
        /* fallback al detail legacy */
      }

      try {
        const legacy = await getOperationalControlContainerDetail(containerId, params);
        setView(buildDrawerViewFromLegacyDetail(legacy, selectedRow));
        return;
      } catch {
        if (selectedRow) {
          setView(buildDrawerViewFromRow(selectedRow));
          setError("No se pudo cargar el detalle operacional");
        } else {
          setError("No se pudo cargar el detalle operacional");
        }
      }
    } finally {
      setLoading(false);
    }
  }, [containerId, selectedRow]);

  useEffect(() => {
    if (open && containerId) void loadDetail();
    if (!open) {
      setView(null);
      setError(null);
    }
  }, [open, containerId, loadDetail]);

  const title =
    view?.container_label?.trim() ||
    selectedRow?.container_label?.trim() ||
    containerId ||
    "Contenedor";

  const timelineItems =
    view && view.timeline.length > 0
      ? view.timeline
      : TIMELINE_OPERATION_STEPS.map((title) => ({ title, at: null, detail: null }));

  const progressPercent =
    view?.journey_progress_percent != null && Number.isFinite(view.journey_progress_percent)
      ? Math.min(100, Math.max(0, Math.round(view.journey_progress_percent)))
      : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold text-[#1E3A5F] text-left">
              {title}
            </SheetTitle>
            {view || selectedRow ? (
              <p className="text-sm text-gray-500 text-left">
                {view?.client_name?.trim() || selectedRow?.client_name?.trim() || "Sin cliente"} ·{" "}
                {view?.program_name?.trim() || selectedRow?.program_name?.trim() || "Sin programa"}
              </p>
            ) : null}
          </SheetHeader>
        </div>

        <div className="px-6 py-5 space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500 py-12 text-center">Cargando…</p>
          ) : error && !view ? (
            <p className="text-sm text-red-600 py-12 text-center">{error}</p>
          ) : view ? (
            <>
              {error ? <RowFallbackBanner message={error} /> : null}
              {view.source === "row_fallback" ? (
                <p className="text-xs text-gray-500">
                  Mostrando datos mínimos de la fila seleccionada.
                </p>
              ) : null}

              <Tabs defaultValue="resumen" className="w-full">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
                  {[
                    ["resumen", "Resumen"],
                    ["avance", "Avance"],
                    ["declarada", "Declarada"],
                    ["observada", "Observada"],
                    ["inferida", "Inferida"],
                    ["timeline", "Timeline"],
                    ["mapa", "Mapa"],
                  ].map(([value, label]) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="text-xs data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="resumen" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Contenedor" value={view.container_id} />
                    <Field
                      label="Fase actual"
                      value={view.current_phase_label?.trim() || "Sin estado"}
                    />
                    <Field label="Riesgo" value={view.risk_level?.trim() || "Sin riesgo"} />
                    <Field
                      label="Conductor"
                      value={view.driver_name?.trim() || "Sin conductor"}
                    />
                    <Field label="Placa" value={view.plate?.trim() || "Sin placa"} />
                    <Field label="GPS" value={gpsStatusDisplay(view.gps_status)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm border-t pt-3">
                    <div>
                      <p className="text-gray-500 text-xs">Puerto</p>
                      <p className="font-semibold">{drawerPortLabel(view)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Destino</p>
                      <p className="font-semibold">{drawerDestinationLabel(view)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">ETA destino</p>
                      <p
                        className={cn(
                          "font-semibold tabular-nums",
                          view.eta_display.isExpired && "text-orange-700",
                        )}
                      >
                        {view.eta_display.timeLabel}
                      </p>
                      {view.eta_display.subLabel ? (
                        <p className="text-xs text-gray-500">{view.eta_display.subLabel}</p>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Último GPS</p>
                      <p className="font-semibold">
                        {formatGpsAge(view.gps_last_seen_at) || "Sin señal reciente"}
                      </p>
                    </div>
                  </div>
                  <RiskSection view={view} />
                </TabsContent>

                <TabsContent value="avance" className="mt-4 space-y-4">
                  {progressPercent != null ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Progreso del viaje</span>
                        <span className="font-semibold tabular-nums">{progressPercent}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-[#2A9D8F] transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Sin progreso reportado.</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field
                      label="Paso actual"
                      value={view.current_step?.trim() || "Sin paso actual"}
                    />
                    <Field label="Siguiente paso" value={view.next_step?.trim() || "Sin siguiente"} />
                    <Field
                      label="Próximo evento esperado"
                      value={view.next_expected_step_label?.trim() || "Sin evento esperado"}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="declarada" className="mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Puerto declarado"
                      value={view.declared_truth.port_code?.trim() || drawerPortLabel(view)}
                    />
                    <Field
                      label="Destino declarado"
                      value={
                        view.declared_truth.destination_code?.trim()
                          ? formatDestinationLabel(view.declared_truth.destination_code)
                          : drawerDestinationLabel(view)
                      }
                    />
                    <Field
                      label="Programado"
                      value={formatScheduledLabel(view.declared_truth.scheduled_at)}
                    />
                    <Field
                      label="Conductor declarado"
                      value={view.declared_truth.driver_name?.trim() || "Sin conductor"}
                    />
                    <Field
                      label="Placa declarada"
                      value={view.declared_truth.plate?.trim() || "Sin placa"}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="observada" className="mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Último evento"
                      value={view.observed_truth.last_event_type?.trim() || "Sin evento"}
                    />
                    <Field
                      label="Hora del evento"
                      value={formatTimeLabel(view.observed_truth.last_event_at)}
                    />
                    <Field
                      label="Nodo actual"
                      value={view.observed_truth.current_node_code?.trim() || "Sin nodo"}
                    />
                    <Field
                      label="Dentro del puerto"
                      value={formatBooleanLabel(view.observed_truth.inside_port)}
                    />
                    <Field
                      label="Carga inferida (obs.)"
                      value={formatBooleanLabel(view.observed_truth.loading_inferred)}
                    />
                    <Field
                      label="GPS observado"
                      value={gpsStatusDisplay(view.observed_truth.gps_status ?? view.gps_status)}
                    />
                    <Field
                      label="Movimiento"
                      value={view.observed_truth.movement_status?.trim() || "Sin movimiento"}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="inferida" className="mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Probabilidad de carga"
                      value={formatProbability(view.inferred_truth.loading_probability)}
                    />
                    <Field
                      label="Salida estimada puerto"
                      value={formatTimeLabel(view.inferred_truth.expected_exit_port_at)}
                    />
                    <Field
                      label="Llegada estimada CDR"
                      value={formatTimeLabel(view.inferred_truth.expected_arrival_cdr)}
                    />
                    <Field
                      label="Próximo evento inferido"
                      value={view.inferred_truth.next_expected_event?.trim() || "Sin evento"}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  <div className="space-y-0">
                    {timelineItems.map((ev, index) => (
                      <div key={`${ev.title}-${index}`} className="flex flex-col items-center">
                        <div
                          className={cn(
                            "w-full rounded-lg border px-3 py-2.5 text-sm",
                            view.timeline.length === 0
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
                          {ev.detail ? (
                            <p className="text-xs text-gray-500 mt-0.5">{ev.detail}</p>
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
                </TabsContent>

                <TabsContent value="mapa" className="mt-4">
                  <OperationalControlDrawerMap map={view.map} className="h-80" />
                </TabsContent>
              </Tabs>

              {view.history.length > 0 ? (
                <section className="space-y-2 border-t pt-4">
                  <h3 className="text-sm font-semibold text-[#1E3A5F]">Historial</h3>
                  <div className="space-y-2">
                    {view.history.map((ev, index) => (
                      <div
                        key={`${ev.title}-${index}`}
                        className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                      >
                        <p className="text-sm font-medium">{ev.title}</p>
                        {ev.at ? (
                          <p className="text-xs text-gray-500">
                            {formatOperationalDateTime(ev.at)}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
