import type { OperationalControlContainerRow } from "@/api/operational-control";
import { getOperationalControlContainerDetail } from "@/api/operational-control";
import { getOperationalDigitalTwinContainer } from "@/api/operational-digital-twin";
import { OperationalControlDrawerMap } from "@/components/admin/operational-control/OperationalControlDrawerMap";
import { OperationalEtaHero } from "@/components/admin/operational-twin/OperationalEtaHero";
import { OperationalJourneyBar } from "@/components/admin/operational-twin/OperationalJourneyBar";
import { OperationalNodeFlow } from "@/components/admin/operational-twin/OperationalNodeFlow";
import { OperationalPredictionPanel } from "@/components/admin/operational-twin/OperationalPredictionPanel";
import { OperationalRiskLive } from "@/components/admin/operational-twin/OperationalRiskLive";
import { OperationalRouteVertical } from "@/components/admin/operational-twin/OperationalRouteVertical";
import { OperationalVisualTimeline } from "@/components/admin/operational-twin/OperationalVisualTimeline";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatGpsAge, formatOperationalDateTime } from "@/lib/operationalControlConstants";
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
import {
  resolveCorridorLabel,
  resolveElapsedLabel,
  resolveGpsStatusLabel,
  resolveJourneyStateLabel,
  resolveOperationalEventLabel,
} from "@/lib/operationalTwinContract";
import { formatEtaHero } from "@/lib/operationalTwinUx";
import { TIMELINE_OPERATION_STEPS } from "@/lib/operationalControlUx";
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
      <p className="font-semibold text-[15px] text-[#1E3A5F] leading-snug">{value}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{children}</p>
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
        /* fallback */
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

  const progressPercent =
    view?.journey_progress_percent != null && Number.isFinite(view.journey_progress_percent)
      ? Math.min(100, Math.max(0, Math.round(view.journey_progress_percent)))
      : 0;

  const timelineItems =
    view && view.timeline.length > 0
      ? view.timeline
      : TIMELINE_OPERATION_STEPS.map((stepTitle) => ({ title: stepTitle, at: null, detail: null }));

  const locationLabel =
    view?.current_location?.name?.trim() ||
    view?.current_node_label?.trim() ||
    "Sin ubicación";

  const corridorLabel =
    view?.corridor_label ||
    resolveCorridorLabel(view?.journey_corridor_code, view?.corridor_name);

  const journeyStateLabel =
    view?.journey_state_label || resolveJourneyStateLabel(view?.journey_state);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold text-[#1E3A5F] text-left">{title}</SheetTitle>
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
            <p className="text-sm text-gray-500 py-12 text-center">Cargando operación…</p>
          ) : error && !view ? (
            <p className="text-sm text-red-600 py-12 text-center">{error}</p>
          ) : view ? (
            <>
              {error ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              ) : null}

              <Tabs defaultValue="operacion" className="w-full">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
                  {[
                    ["operacion", "Operación"],
                    ["ruta", "Ruta"],
                    ["historial", "Historial"],
                    ["mapa", "Mapa"],
                    ["auditoria", "Auditoría"],
                  ].map(([value, label]) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="text-sm data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="operacion" className="mt-4 space-y-5">
                  {view.journey_phases.length > 0 ? (
                    <OperationalJourneyBar
                      phases={view.journey_phases}
                      percent={progressPercent}
                    />
                  ) : null}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <OperationalNodeFlow
                      vertical
                      current={locationLabel}
                      next={view.next_node_label ?? "Sin destino"}
                      minutesToNext={view.minutes_to_next}
                    />
                    <OperationalEtaHero
                      size="lg"
                      time={
                        view.eta_display.isExpired
                          ? formatEtaFromView(view)
                          : view.eta_display.timeLabel === "Sin ETA"
                            ? "—"
                            : formatEtaFromView(view)
                      }
                      corridorName={corridorLabel}
                      source={view.eta_source}
                      expired={view.eta_display.isExpired || view.eta_display.timeLabel === "ETA vencido"}
                    />
                  </div>

                  <div className="space-y-1">
                    <SectionLabel>Estado operacional</SectionLabel>
                    <p className="text-[15px] font-semibold text-[#1E3A5F]">
                      {view.current_phase_label?.trim() || "Sin estado"}
                    </p>
                  </div>

                  {(journeyStateLabel ||
                    view.journey_current_leg != null ||
                    view.journey_tracking_mode_label ||
                    corridorLabel) && (
                    <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-3 space-y-1.5 text-sm">
                      <SectionLabel>Viaje</SectionLabel>
                      {journeyStateLabel ? (
                        <p>
                          <span className="text-gray-500">Estado: </span>
                          <span className="font-medium text-[#1E3A5F] text-[15px]">
                            {journeyStateLabel}
                          </span>
                        </p>
                      ) : null}
                      {corridorLabel ? (
                        <p>
                          <span className="text-gray-500">Tramo: </span>
                          <span className="font-medium text-[15px]">{corridorLabel}</span>
                        </p>
                      ) : null}
                      {view.journey_current_leg != null ? (
                        <p>
                          <span className="text-gray-500">Tramo nº: </span>
                          <span className="font-medium tabular-nums">{view.journey_current_leg}</span>
                        </p>
                      ) : null}
                      {view.journey_tracking_mode_label ? (
                        <p>
                          <span className="text-gray-500">Seguimiento: </span>
                          <span className="font-medium">{view.journey_tracking_mode_label}</span>
                        </p>
                      ) : null}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm border-t pt-3">
                    <Field
                      label="GPS"
                      value={resolveGpsStatusLabel(
                        view.technical_gps_status ?? view.gps_status,
                      )}
                    />
                    <Field
                      label="Última señal"
                      value={formatGpsAge(view.gps_last_seen_at) || "Sin señal reciente"}
                    />
                    {view.driver_name ? (
                      <Field label="Conductor" value={view.driver_name} />
                    ) : null}
                    {view.plate ? <Field label="Placa" value={view.plate} /> : null}
                    {view.driver_vehicle_type ? (
                      <Field label="Vehículo" value={view.driver_vehicle_type} />
                    ) : null}
                    {view.driver_phone ? (
                      <Field label="Teléfono" value={view.driver_phone} />
                    ) : null}
                  </div>

                  <OperationalRiskLive
                    risk={view.risk_presentation}
                    activeAlerts={view.active_alerts}
                  />

                  {(resolveElapsedLabel(view.inside_port_elapsed) ||
                    resolveElapsedLabel(view.cdr_elapsed) ||
                    resolveElapsedLabel(view.stationary_time)) && (
                    <div className="grid grid-cols-3 gap-2 rounded-lg border border-gray-100 px-3 py-2.5 text-sm">
                      {resolveElapsedLabel(view.inside_port_elapsed) ? (
                        <div>
                          <p className="text-xs text-gray-500">En puerto</p>
                          <p className="font-semibold tabular-nums text-[15px]">
                            {resolveElapsedLabel(view.inside_port_elapsed)}
                          </p>
                        </div>
                      ) : null}
                      {resolveElapsedLabel(view.cdr_elapsed) ? (
                        <div>
                          <p className="text-xs text-gray-500">En CDR</p>
                          <p className="font-semibold tabular-nums text-[15px]">
                            {resolveElapsedLabel(view.cdr_elapsed)}
                          </p>
                        </div>
                      ) : null}
                      {resolveElapsedLabel(view.stationary_time) ? (
                        <div>
                          <p className="text-xs text-gray-500">Estático</p>
                          <p className="font-semibold tabular-nums text-[15px]">
                            {resolveElapsedLabel(view.stationary_time)}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <OperationalPredictionPanel view={view} title="Pronóstico" />
                </TabsContent>

                <TabsContent value="ruta" className="mt-4">
                  <OperationalRouteVertical nodes={view.route_nodes} />
                </TabsContent>

                <TabsContent value="historial" className="mt-4">
                  {view.history.length > 0 ? (
                    <div className="space-y-2 mb-6">
                      <p className="text-xs font-semibold text-gray-500 uppercase">
                        Intentos anteriores
                      </p>
                      {view.history.map((ev, i) => (
                        <div
                          key={`${ev.title}-${i}`}
                          className="rounded-lg border bg-gray-50 px-3 py-2 text-sm"
                        >
                          <p className="font-medium text-[15px]">
                            {resolveOperationalEventLabel(ev.title)}
                          </p>
                          {ev.at ? (
                            <p className="text-xs text-gray-500">
                              {formatOperationalDateTime(ev.at)}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <OperationalVisualTimeline items={timelineItems} />
                </TabsContent>

                <TabsContent value="mapa" className="mt-4">
                  <OperationalControlDrawerMap
                    map={view.map}
                    currentLocation={view.current_location}
                    className="h-96"
                  />
                </TabsContent>

                <TabsContent value="auditoria" className="mt-4 space-y-6">
                  <section className="space-y-3">
                    <h3 className="text-base font-semibold text-[#1E3A5F]">Verdad declarada</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Puerto" value={drawerPortLabel(view)} />
                      <Field label="Destino" value={drawerDestinationLabel(view)} />
                      <Field
                        label="Programado"
                        value={formatScheduledLabel(view.declared_truth.scheduled_at)}
                      />
                      <Field
                        label="Conductor"
                        value={view.declared_truth.driver_name?.trim() || "Sin conductor"}
                      />
                      <Field
                        label="Placa"
                        value={view.declared_truth.plate?.trim() || "Sin placa"}
                      />
                      {view.declared_truth.status_raw ? (
                        <Field label="Status raw" value={view.declared_truth.status_raw} />
                      ) : null}
                    </div>
                  </section>
                  <section className="space-y-3">
                    <h3 className="text-base font-semibold text-[#1E3A5F]">Verdad observada</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Estado operacional"
                        value={
                          view.operational_phase
                            ? `${view.operational_phase}${
                                view.current_phase_label
                                  ? ` · ${view.current_phase_label}`
                                  : ""
                              }`
                            : view.current_phase_label || "Sin estado"
                        }
                      />
                      <Field
                        label="Estado Journey"
                        value={
                          view.journey_state
                            ? `${view.journey_state}${
                                journeyStateLabel ? ` · ${journeyStateLabel}` : ""
                              }`
                            : "Sin journey"
                        }
                      />
                      <Field
                        label="Último evento"
                        value={view.observed_truth.last_event_type?.trim() || "Sin evento"}
                      />
                      <Field
                        label="Evento operacional"
                        value={
                          view.observed_truth.last_operational_event_type?.trim() || "Sin evento"
                        }
                      />
                      <Field
                        label="Hora"
                        value={formatTimeLabel(view.observed_truth.last_event_at)}
                      />
                      <Field
                        label="Nodo"
                        value={
                          view.observed_truth.current_node_code?.trim() ||
                          view.current_location?.node_code ||
                          "Sin nodo"
                        }
                      />
                      <Field
                        label="Corredor"
                        value={view.journey_corridor_code?.trim() || "Sin corredor"}
                      />
                      <Field
                        label="Dentro del puerto"
                        value={formatBooleanLabel(view.observed_truth.inside_port)}
                      />
                      <Field
                        label="GPS técnico"
                        value={
                          view.observed_truth.technical_gps_status ??
                          view.technical_gps_status ??
                          view.observed_truth.gps_status ??
                          view.gps_status ??
                          "—"
                        }
                      />
                      {view.observed_truth.monitoring_status ? (
                        <Field
                          label="Monitoreo"
                          value={view.observed_truth.monitoring_status}
                        />
                      ) : null}
                    </div>
                  </section>
                  <section className="space-y-3">
                    <h3 className="text-base font-semibold text-[#1E3A5F]">Verdad inferida</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Prob. carga"
                        value={formatProbability(view.inferred_truth.loading_probability)}
                      />
                      <Field
                        label="Salida puerto est."
                        value={formatTimeLabel(view.inferred_truth.expected_exit_port_at)}
                      />
                      <Field
                        label="Llegada CDR est."
                        value={formatTimeLabel(view.inferred_truth.expected_arrival_cdr)}
                      />
                      <Field
                        label="Próximo evento"
                        value={
                          view.inferred_truth.next_expected_event?.trim()
                            ? `${view.inferred_truth.next_expected_event} · ${resolveOperationalEventLabel(view.inferred_truth.next_expected_event)}`
                            : "Sin evento"
                        }
                      />
                    </div>
                  </section>
                  {view.declared_truth.destination_code ? (
                    <p className="text-xs text-gray-400">
                      Destino declarado:{" "}
                      {formatDestinationLabel(view.declared_truth.destination_code)}
                    </p>
                  ) : null}
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatEtaFromView(view: OperationalDrawerViewModel): string {
  if (view.eta_display.isExpired) {
    const iso = view.inferred_truth.expected_arrival_cdr;
    if (iso) {
      const hero = formatEtaHero(iso);
      return hero !== "—" ? hero : "ETA vencido";
    }
    return "ETA vencido";
  }
  const iso =
    view.inferred_truth.expected_arrival_cdr ||
    (view.eta_display.isWeakFallback ? null : view.declared_truth.scheduled_at);
  if (iso) {
    const hero = formatEtaHero(iso);
    if (hero !== "—") return hero;
  }
  return view.eta_display.timeLabel;
}
