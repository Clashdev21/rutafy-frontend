import type { OperationalControlContainerDetail } from "@/api/operational-control";
import type { OperationalControlContainerRow } from "@/api/operational-control";
import type { OperationalControlMapData } from "@/api/operational-control";
import type {
  OperationalCdrElapsed,
  OperationalDigitalTwin,
  OperationalInsidePortElapsed,
  OperationalStationaryTime,
} from "@/api/operational-digital-twin";
import {
  formatDestinationLabel,
  resolveDestinationLabel,
  resolveEtaDisplay,
  resolveOperationalStateLabel,
  resolvePortDisplay,
} from "@/lib/operationalControlDisplay";
import {
  buildContainerLiveState,
  type JourneyPhaseUi,
  type RiskPresentation,
  type RouteNodeUi,
} from "@/lib/operationalTwinUx";
import {
  journeyTrackingModeLabel,
  resolveCorridorLabel,
  resolveDriverIdentity,
  resolveEtaSourceKind,
  resolveJourneyStateLabel,
  resolveNextOperationalStepLabel,
  resolveOperationalEventLabel,
  resolveOperationalPhaseLabel,
  resolveTechnicalGpsStatus,
  type EtaSourceKind,
} from "@/lib/operationalTwinContract";
import { operationalEtaAt } from "@/api/operational-digital-twin";

export type OperationalDrawerSource = "digital_twin" | "legacy" | "row_fallback";

export type OperationalDrawerViewModel = {
  source: OperationalDrawerSource;
  container_id: string;
  container_label?: string | null;
  client_name?: string | null;
  program_name?: string | null;
  /** Microestado visible (current_phase_label). */
  current_phase_label?: string | null;
  /** Código micro (current_phase), p.ej. AT_GATE. */
  operational_phase?: string | null;
  /** Lifecycle macro (journey_current_state), p.ej. TRACKING_STARTED. */
  journey_state?: string | null;
  journey_current_leg?: number | null;
  journey_corridor_code?: string | null;
  journey_tracking_mode?: string | null;
  journey_tracking_mode_label?: string | null;
  risk_level?: string | null;
  driver_name?: string | null;
  plate?: string | null;
  driver_phone?: string | null;
  driver_messenger_id?: string | null;
  driver_vehicle_type?: string | null;
  gps_status?: string | null;
  technical_gps_status?: string | null;
  gps_last_seen_at?: string | null;
  journey_progress_percent?: number | null;
  current_step?: string | null;
  next_step?: string | null;
  next_expected_step_label?: string | null;
  eta_display: ReturnType<typeof resolveEtaDisplay>;
  declared_truth: {
    port_code?: string | null;
    destination_code?: string | null;
    scheduled_at?: string | null;
    driver_name?: string | null;
    plate?: string | null;
    status_raw?: string | null;
  };
  observed_truth: {
    last_event_type?: string | null;
    last_operational_event_type?: string | null;
    last_event_at?: string | null;
    current_node_code?: string | null;
    inside_port?: boolean | null;
    loading_inferred?: boolean | null;
    confirmed_port?: string | null;
    movement_status?: string | null;
    monitoring_status?: string | null;
    gps_status?: string | null;
    technical_gps_status?: string | null;
  };
  inferred_truth: {
    loading_probability?: number | null;
    expected_exit_port_at?: string | null;
    expected_arrival_cdr?: string | null;
    next_expected_event?: string | null;
  };
  current_location?: {
    node_code?: string | null;
    name?: string | null;
    lat?: number | null;
    lng?: number | null;
  } | null;
  inside_port_elapsed?: OperationalInsidePortElapsed | null;
  cdr_elapsed?: OperationalCdrElapsed | null;
  stationary_time?: OperationalStationaryTime | null;
  timeline: Array<{ title: string; at?: string | null; detail?: string | null }>;
  timeline_summary?: Array<{
    key?: string | null;
    label?: string | null;
    at?: string | null;
    status?: string | null;
  }>;
  alerts: string[];
  map: OperationalControlMapData;
  history: Array<{ title: string; at?: string | null; status?: string | null }>;
  corridor_name?: string | null;
  current_node_label?: string | null;
  next_node_label?: string | null;
  minutes_to_next?: string | null;
  route_nodes: RouteNodeUi[];
  journey_phases: JourneyPhaseUi[];
  risk_presentation: RiskPresentation;
  active_alerts: string[];
  eta_source: EtaSourceKind;
  /** True when twin.eta.is_expired or computed clock is past. */
  eta_expired?: boolean;
  /** ISO used for ETA clock / última referencia when expired. */
  eta_reference_iso?: string | null;
  /** Human corridor label for executive UI. */
  corridor_label?: string | null;
  journey_state_label?: string | null;
};

function mergeRowBasics(
  vm: OperationalDrawerViewModel,
  row?: OperationalControlContainerRow | null,
): OperationalDrawerViewModel {
  if (!row) return vm;
  return {
    ...vm,
    container_label: vm.container_label ?? row.container_label,
    client_name: vm.client_name ?? row.client_name,
    program_name: vm.program_name ?? row.program_name,
    driver_name: vm.driver_name ?? row.driver_name,
    plate: vm.plate ?? row.plate,
    gps_status: vm.gps_status ?? row.gps_status,
    gps_last_seen_at: vm.gps_last_seen_at ?? row.gps_last_seen_at,
    current_phase_label:
      vm.current_phase_label ?? resolveOperationalStateLabel(row),
    risk_level: vm.risk_level ?? row.risk_band,
    alerts: vm.alerts.length > 0 ? vm.alerts : row.alerts,
    declared_truth: {
      port_code:
        vm.declared_truth.port_code ??
        row.declared_port_code ??
        row.declared_port,
      destination_code:
        vm.declared_truth.destination_code ??
        row.declared_destination_code ??
        row.destination_code ??
        row.destination,
      scheduled_at: vm.declared_truth.scheduled_at ?? row.scheduled_at,
      driver_name: vm.declared_truth.driver_name ?? row.driver_name,
      plate: vm.declared_truth.plate ?? row.plate,
    },
    eta_display:
      vm.eta_display.timeLabel !== "Sin ETA"
        ? vm.eta_display
        : resolveEtaDisplay(row),
  };
}

export function buildDrawerViewFromDigitalTwin(
  twin: OperationalDigitalTwin,
  row?: OperationalControlContainerRow | null,
): OperationalDrawerViewModel {
  const live = row ? buildContainerLiveState(row, twin) : null;
  const driver = resolveDriverIdentity(twin);
  const technicalGps = resolveTechnicalGpsStatus(twin);
  const vm: OperationalDrawerViewModel = {
    source: "digital_twin",
    container_id: twin.container_id,
    container_label: twin.container_label,
    client_name: twin.client_name,
    program_name: twin.program_code ?? row?.program_name,
    current_phase_label: resolveOperationalPhaseLabel(
      twin.current_phase,
      twin.current_phase_label,
    ),
    operational_phase: twin.current_phase?.trim() || null,
    journey_state: twin.journey_current_state?.trim() || null,
    journey_current_leg:
      twin.journey_current_leg != null && Number.isFinite(twin.journey_current_leg)
        ? twin.journey_current_leg
        : null,
    journey_corridor_code: twin.journey_corridor_code?.trim() || null,
    journey_tracking_mode: twin.journey_tracking_mode
      ? String(twin.journey_tracking_mode)
      : null,
    journey_tracking_mode_label: journeyTrackingModeLabel(twin.journey_tracking_mode),
    risk_level: twin.risk?.level ?? null,
    driver_name: driver.name,
    plate: driver.plate,
    driver_phone: driver.phone,
    driver_messenger_id: driver.messenger_id,
    driver_vehicle_type: driver.vehicle_type,
    gps_status: twin.gps_status,
    technical_gps_status: technicalGps,
    gps_last_seen_at: twin.gps_last_seen_at ?? driver.last_location_at,
    journey_progress_percent: twin.journey_progress?.percent ?? null,
    current_step: twin.journey_progress?.current_step ?? null,
    next_step: twin.journey_progress?.next_step ?? null,
    next_expected_step_label: twin.next_expected_step?.label ?? null,
    eta_display: resolveEtaDisplay(
      {
        eta: operationalEtaAt(twin.eta),
        window_end_at: row?.window_end_at ?? null,
        scheduled_at: twin.declared_truth.scheduled_at,
      },
      { detailEta: operationalEtaAt(twin.eta) ?? twin.inferred_truth.expected_arrival_cdr },
    ),
    declared_truth: { ...twin.declared_truth },
    observed_truth: { ...twin.observed_truth },
    inferred_truth: { ...twin.inferred_truth },
    current_location: twin.current_location ?? null,
    inside_port_elapsed: twin.inside_port_elapsed ?? null,
    cdr_elapsed: twin.cdr_elapsed ?? null,
    stationary_time: twin.stationary_time ?? null,
    timeline: (live?.timeline?.length
      ? live.timeline
      : twin.timeline.map((ev) => ({
          // Historical events: only event-owned context (none on current contract).
          title: resolveOperationalEventLabel(ev.title),
          at: ev.at,
          detail: ev.detail,
        }))
    ),
    timeline_summary: twin.timeline_summary,
    alerts: [
      ...twin.alerts,
      ...(twin.risk?.reasons ?? []).filter((r) => !twin.alerts.includes(r)),
    ],
    map: twin.map,
    history: [],
    corridor_name:
      twin.corridor_name ?? twin.journey_corridor_code ?? live?.corridorName,
    corridor_label:
      live?.corridorName ??
      resolveCorridorLabel(twin.journey_corridor_code, twin.corridor_name),
    journey_state_label: resolveJourneyStateLabel(twin.journey_current_state),
    current_node_label:
      live?.currentNodeName ??
      twin.current_location?.name ??
      twin.current_node_label,
    next_node_label:
      live?.nextNodeName ??
      resolveNextOperationalStepLabel({
        currentPhase: twin.current_phase,
        nextNodeLabel: twin.next_node_label,
        nextExpectedStepKey: twin.next_expected_step?.key,
        nextExpectedStepLabel: twin.next_expected_step?.label,
        journeyNextStep: twin.journey_progress?.next_step,
        inferredNextEvent: twin.inferred_truth.next_expected_event,
      }),
    minutes_to_next: live?.minutesToNext ?? null,
    route_nodes: live?.routeNodes ?? [],
    journey_phases: live?.journeyPhases ?? [],
    risk_presentation: live?.drawerRisk ?? resolveRiskPresentationFromRow(row, twin),
    active_alerts: live?.activeAlerts ?? [],
    eta_reference_iso:
      operationalEtaAt(twin.eta) ||
      twin.inferred_truth.expected_arrival_cdr ||
      row?.window_end_at ||
      twin.declared_truth.scheduled_at ||
      row?.eta ||
      null,
    eta_expired: live?.etaExpired ?? twin.eta?.is_expired === true,
    eta_source:
      live?.etaSource ??
      resolveEtaSourceKind({
        eta: twin.eta,
        windowEndAt: row?.window_end_at,
        scheduledAt: twin.declared_truth.scheduled_at,
        usedIso: operationalEtaAt(twin.eta),
        fromInferredOnly: !operationalEtaAt(twin.eta) && Boolean(twin.inferred_truth.expected_arrival_cdr),
      }),
  };
  return mergeRowBasics(vm, row);
}

function resolveRiskPresentationFromRow(
  row?: OperationalControlContainerRow | null,
  twin?: OperationalDigitalTwin | null,
) {
  if (row) return buildContainerLiveState(row, twin ?? null).drawerRisk;
  return { band: "normal" as const, emoji: "🟢", label: "Normal", reasons: [] };
}

export function buildDrawerViewFromLegacyDetail(
  detail: OperationalControlContainerDetail,
  row?: OperationalControlContainerRow | null,
): OperationalDrawerViewModel {
  const vm: OperationalDrawerViewModel = {
    source: "legacy",
    container_id: detail.container_id,
    container_label: detail.container_label,
    client_name: detail.client_name,
    program_name: detail.program_name ?? row?.program_name,
    current_phase_label: resolveOperationalStateLabel({
      operational_state: null,
      monitoring_status: null,
      status_raw: null,
      operational_phase: detail.phase,
      rutafy_status: detail.rutafy_status,
      phase: detail.phase,
    }),
    risk_level: row?.risk_band ?? null,
    driver_name: detail.driver.name,
    plate: detail.driver.plate,
    gps_status: detail.gps_status,
    gps_last_seen_at: detail.gps_last_seen_at,
    journey_progress_percent: null,
    current_step: detail.lifecycle.find((s) => s.current)?.label ?? null,
    next_step: detail.lifecycle.find((s) => !s.completed && !s.current)?.label ?? null,
    next_expected_step_label: null,
    eta_display: resolveEtaDisplay(
      {
        eta: detail.current_monitoring?.eta ?? detail.observed_truth.eta_at,
        window_end_at: null,
        scheduled_at: detail.declared_truth.scheduled_time,
      },
      { detailEta: detail.current_monitoring?.eta ?? detail.observed_truth.eta_at },
    ),
    declared_truth: {
      port_code: detail.declared_truth.declared_port,
      destination_code: detail.declared_truth.declared_destination,
      scheduled_at: detail.declared_truth.scheduled_time,
      driver_name: detail.declared_truth.driver_name ?? detail.driver.name,
      plate: detail.declared_truth.driver_plate ?? detail.driver.plate,
    },
    observed_truth: {
      last_event_type: null,
      last_event_at: detail.observed_truth.actual_exit_at ?? detail.observed_truth.actual_entry_at,
      current_node_code: detail.observed_truth.confirmed_port,
      inside_port: null,
      loading_inferred: null,
      confirmed_port: detail.observed_truth.confirmed_port,
      movement_status: detail.observed_truth.movement_status,
      gps_status: detail.observed_truth.gps_status ?? detail.gps_status,
    },
    inferred_truth: {
      loading_probability: null,
      expected_exit_port_at: detail.observed_truth.actual_exit_at,
      expected_arrival_cdr: detail.observed_truth.eta_at,
      next_expected_event: null,
    },
    timeline: detail.timeline.map((ev) => ({
      title: ev.title,
      at: ev.at,
      detail: ev.detail,
    })),
    alerts: row?.alerts ?? [],
    map: detail.map,
    history: detail.history,
    corridor_name: null,
    current_node_label: null,
    next_node_label: null,
    minutes_to_next: null,
    route_nodes: row ? buildContainerLiveState(row, null).routeNodes : [],
    journey_phases: row ? buildContainerLiveState(row, null).journeyPhases : [],
    risk_presentation: row
      ? buildContainerLiveState(row, null).drawerRisk
      : { band: "normal", emoji: "🟢", label: "Normal", reasons: [] },
    active_alerts: row ? buildContainerLiveState(row, null).activeAlerts : [],
    eta_source: "programacion",
    corridor_label: null,
    journey_state_label: null,
  };
  return mergeRowBasics(vm, row);
}

export function buildDrawerViewFromRow(
  row: OperationalControlContainerRow,
): OperationalDrawerViewModel {
  const port = resolvePortDisplay(row);
  const destination = resolveDestinationLabel(row);
  const liveFallback = buildContainerLiveState(row, null);
  return {
    source: "row_fallback",
    container_id: row.container_id,
    container_label: row.container_label,
    client_name: row.client_name,
    program_name: row.program_name,
    current_phase_label: resolveOperationalStateLabel(row),
    risk_level: row.risk_band,
    driver_name: row.driver_name,
    plate: row.plate,
    gps_status: row.gps_status,
    gps_last_seen_at: row.gps_last_seen_at,
    journey_progress_percent: null,
    current_step: null,
    next_step: null,
    next_expected_step_label: null,
    eta_display: resolveEtaDisplay(row),
    declared_truth: {
      port_code: port.code !== "Sin puerto" ? port.code : row.declared_port_code ?? row.declared_port,
      destination_code:
        destination !== "Sin destino"
          ? destination
          : row.destination_code ?? row.destination,
      scheduled_at: row.scheduled_at,
      driver_name: row.driver_name,
      plate: row.plate,
    },
    observed_truth: {},
    inferred_truth: {},
    timeline: [],
    alerts: row.alerts,
    map: { polyline: [] },
    history: [],
    corridor_name: null,
    current_node_label: liveFallback.currentNodeName,
    next_node_label: liveFallback.nextNodeName,
    minutes_to_next: liveFallback.minutesToNext,
    route_nodes: liveFallback.routeNodes,
    journey_phases: liveFallback.journeyPhases,
    risk_presentation: liveFallback.drawerRisk,
    active_alerts: liveFallback.activeAlerts,
    eta_source: liveFallback.etaSource,
    corridor_label: liveFallback.corridorName,
    journey_state_label: null,
  };
}

export function formatProbability(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Sin dato";
  const pct = value <= 1 ? value * 100 : value;
  return `${Math.round(pct)}%`;
}

export function formatBooleanLabel(value?: boolean | null, yes = "Sí", no = "No"): string {
  if (value == null) return "Sin dato";
  return value ? yes : no;
}

export function drawerPortLabel(vm: OperationalDrawerViewModel): string {
  const fromDeclared = vm.declared_truth.port_code?.trim();
  if (fromDeclared) return fromDeclared;
  const port = resolvePortDisplay(
    {
      confirmed_port_code: vm.observed_truth.confirmed_port,
      declared_port_code: vm.declared_truth.port_code,
      declared_port: vm.declared_truth.port_code,
      confirmed_port_city: null,
      declared_port_city: null,
    },
    vm.map,
  );
  return port.code;
}

export function drawerDestinationLabel(vm: OperationalDrawerViewModel): string {
  const code = vm.declared_truth.destination_code;
  if (code?.trim()) return formatDestinationLabel(code);
  return resolveDestinationLabel(
    {
      destination_code: null,
      declared_destination_code: code,
      destination: code,
      destination_city: vm.map.destination?.city ?? null,
    },
    vm.map,
  );
}
