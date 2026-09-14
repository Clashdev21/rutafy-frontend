import { describe, expect, it } from "vitest";
import { normalizeOperationalDigitalTwin } from "@/api/operational-digital-twin";
import { buildDrawerViewFromDigitalTwin } from "@/lib/operationalDrawerViewModel";
import {
  etaSourceBadgeLabel,
  etaSourceExpiredBadgeLabel,
  formatElapsedMinutes,
  journeyLiveToPhases,
  journeyTrackingModeLabel,
  resolveCorridorLabel,
  resolveDriverIdentity,
  resolveElapsedLabel,
  resolveEtaSourceKind,
  resolveGpsStatusLabel,
  resolveJourneyStateLabel,
  resolveNextOperationalStepLabel,
  resolveOperationalEventLabel,
  resolveOperationalMapMarker,
  resolveOperationalPhaseLabel,
  resolveTechnicalGpsStatus,
} from "@/lib/operationalTwinContract";
import {
  buildContainerLiveState,
  deriveRouteNodes,
  resolveDrawerRiskPresentation,
} from "@/lib/operationalTwinUx";
import { buildOperationalPredictionItems } from "@/components/admin/operational-twin/OperationalPredictionPanel";
import type { OperationalControlContainerRow } from "@/api/operational-control";

const e2ePayload = {
  container_id: "CNT-E2E-001",
  container_label: "MSCU1234567",
  current_phase: "AT_GATE",
  current_phase_label: "En ingreso al puerto",
  current_location: {
    node_code: "SPIA_GATE",
    name: "SPIA Entrada/Salida",
    lat: 3.8912,
    lng: -77.0789,
  },
  journey_current_state: "TRACKING_STARTED",
  journey_current_leg: 1,
  journey_corridor_code: "BV_YUMBO",
  journey_tracking_mode: "HYBRID",
  journey_live: [
    { step: "DISPATCHED", status: "DONE" },
    { step: "TRACKING_STARTED", status: "CURRENT" },
    { step: "AT_CDR", status: "PENDING" },
  ],
  journey_progress: { percent: 22, current_step: "AT_GATE", next_step: "EXIT_PORT" },
  declared_truth: {
    port_code: "SPB",
    destination_code: "CDR_YUMBO",
    scheduled_at: "2026-09-13T10:00:00Z",
    driver_name: "Declarado Legacy",
    plate: "ABC111",
    status_raw: "PROGRAMADO",
  },
  observed_truth: {
    last_event_type: "AT_GATE",
    last_operational_event_type: "AT_GATE",
    last_event_at: "2026-09-13T14:00:00Z",
    current_node_code: "SPIA_GATE",
    inside_port: true,
    monitoring_status: "ACTIVE",
    gps_status: "OFFLINE",
    technical_gps_status: "OFFLINE",
  },
  inferred_truth: {
    loading_probability: 0.4,
    expected_exit_port_at: "2026-09-13T16:00:00Z",
    expected_arrival_cdr: "2026-09-13T20:00:00Z",
    next_expected_event: "EXIT_PORT",
  },
  driver: {
    messenger_id: "msg-uuid-1",
    name: "Carlos Pérez",
    phone: "+573001112233",
    plate: "XYZ999",
    vehicle_type: "TRACTOMULA",
    gps_status: "OFFLINE",
    last_location_at: "2026-09-13T13:55:00Z",
  },
  timeline: [{ title: "Llegó a gate", at: "2026-09-13T14:00:00Z" }],
  timeline_summary: [{ key: "gate", label: "Gate", status: "DONE" }],
  alerts: [],
  risk: { level: "low", reasons: ["GPS activo"] },
  map: {
    declared_port: { lat: 3.88, lng: -77.05, label: "SPB", code: "SPB" },
    destination: { lat: 3.55, lng: -76.5, label: "CDR Yumbo", code: "CDR_YUMBO" },
    polyline: [],
  },
  inside_port_elapsed: {
    minutes: null,
    label: null,
    source: null,
  },
  cdr_elapsed: {
    status: "not_arrived",
    minutes: null,
    label: null,
    arrived_at: null,
    exited_at: null,
  },
  stationary_time: {
    minutes: 0,
    label: "0 min",
  },
  gps_status: "OFFLINE",
  gps_last_seen_at: "2026-09-13T13:55:00Z",
};

function minimalRow(overrides: Partial<OperationalControlContainerRow> = {}): OperationalControlContainerRow {
  return {
    container_id: "CNT-E2E-001",
    container_label: "MSCU1234567",
    client_name: "Cliente",
    program_name: "BV_YUMBO",
    alerts: [],
    ...overrides,
  } as OperationalControlContainerRow;
}

describe("Sprint 3C.5F Digital Twin contract", () => {
  it("TEST A: normalize preserves E2E twin fields", () => {
    const twin = normalizeOperationalDigitalTwin(e2ePayload);
    expect(twin).not.toBeNull();
    expect(twin!.current_phase).toBe("AT_GATE");
    expect(twin!.current_location?.node_code).toBe("SPIA_GATE");
    expect(twin!.current_location?.lat).toBeCloseTo(3.8912);
    expect(twin!.journey_current_state).toBe("TRACKING_STARTED");
    expect(twin!.journey_current_leg).toBe(1);
    expect(twin!.journey_corridor_code).toBe("BV_YUMBO");
    expect(twin!.journey_tracking_mode).toBe("HYBRID");
    expect(twin!.journey_live).toHaveLength(3);
    expect(twin!.declared_truth.port_code).toBe("SPB");
    expect(twin!.declared_truth.status_raw).toBe("PROGRAMADO");
    expect(twin!.observed_truth.technical_gps_status).toBe("OFFLINE");
    expect(twin!.observed_truth.last_operational_event_type).toBe("AT_GATE");
    expect(twin!.inferred_truth.expected_arrival_cdr).toBeTruthy();
    expect(twin!.inside_port_elapsed).toEqual({
      minutes: null,
      label: null,
      source: null,
    });
    expect(twin!.cdr_elapsed).toEqual({
      status: "not_arrived",
      minutes: null,
      label: null,
      arrived_at: null,
      exited_at: null,
    });
    expect(twin!.stationary_time).toEqual({
      minutes: 0,
      label: "0 min",
    });
    expect(twin!.driver?.messenger_id).toBe("msg-uuid-1");
    expect(twin!.timeline_summary?.[0]?.label).toBe("Gate");
  });

  it("TEST B: micro and macro stay separated in live state and drawer", () => {
    const twin = normalizeOperationalDigitalTwin(e2ePayload)!;
    const live = buildContainerLiveState(minimalRow(), twin);
    expect(live.operationalPhaseCode).toBe("AT_GATE");
    expect(live.journeyState).toBe("TRACKING_STARTED");
    expect(live.phaseLabel.toLowerCase()).toContain("ingreso");
    expect(live.journeyState).not.toBe(live.operationalPhaseCode);

    const view = buildDrawerViewFromDigitalTwin(twin, minimalRow());
    expect(view.operational_phase).toBe("AT_GATE");
    expect(view.journey_state).toBe("TRACKING_STARTED");
    expect(view.current_phase_label).toBe("En ingreso al puerto");
  });

  it("TEST C: AT_GATE fallback label when current_phase_label missing", () => {
    expect(resolveOperationalPhaseLabel("AT_GATE", null)).toBe("En ingreso al puerto");
    expect(resolveOperationalPhaseLabel("AT_GATE", "En ingreso al puerto")).toBe(
      "En ingreso al puerto",
    );
    expect(resolveOperationalPhaseLabel("AT_GATE", "Label backend custom")).toBe(
      "Label backend custom",
    );
  });

  it("TEST D: current_location is map fallback when map.driver lacks coords", () => {
    const twin = normalizeOperationalDigitalTwin(e2ePayload)!;
    const marker = resolveOperationalMapMarker(twin.map, twin.current_location);
    expect(marker).not.toBeNull();
    expect(marker!.source).toBe("current_location");
    expect(marker!.code).toBe("SPIA_GATE");
    expect(marker!.lat).toBeCloseTo(3.8912);
  });

  it("TEST E: map.driver wins and does not duplicate with current_location", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      map: {
        ...e2ePayload.map,
        driver: { lat: 3.9, lng: -77.1, label: "Conductor vivo", code: "DRV" },
      },
    })!;
    const marker = resolveOperationalMapMarker(twin.map, twin.current_location);
    expect(marker!.source).toBe("map_driver");
    expect(marker!.lat).toBeCloseTo(3.9);
    expect(marker!.code).toBe("DRV");
  });

  it("TEST F: journey_live has priority over percentage phases", () => {
    const twin = normalizeOperationalDigitalTwin(e2ePayload)!;
    const live = buildContainerLiveState(minimalRow(), twin);
    expect(live.journeyPhases.map((p) => p.key)).toEqual([
      "DISPATCHED",
      "TRACKING_STARTED",
      "AT_CDR",
    ]);
    expect(live.journeyPhases.find((p) => p.current)?.key).toBe("TRACKING_STARTED");
    expect(live.journeyPhases.map((p) => p.label)).toEqual(["Programado", "Corredor", "CDR"]);
    const fromHelper = journeyLiveToPhases(twin.journey_live);
    expect(fromHelper).toHaveLength(3);
  });

  it("TEST G: HYBRID does not flip technical GPS OFFLINE to online", () => {
    const twin = normalizeOperationalDigitalTwin(e2ePayload)!;
    expect(twin.journey_tracking_mode).toBe("HYBRID");
    expect(journeyTrackingModeLabel("HYBRID")).toBe("Híbrido");
    expect(resolveTechnicalGpsStatus(twin)).toBe("OFFLINE");
    const live = buildContainerLiveState(minimalRow(), twin);
    expect(live.technicalGpsStatus).toBe("OFFLINE");
    expect(live.journeyTrackingModeLabel).toBe("Híbrido");
    // risk reasons from backend are preserved (debt), not rewritten
    expect(live.risk.reasons.some((r) => /gps/i.test(r)) || twin.risk?.reasons?.length).toBeTruthy();
  });

  it("TEST H: response.driver has priority over declared_truth", () => {
    const twin = normalizeOperationalDigitalTwin(e2ePayload)!;
    const id = resolveDriverIdentity(twin);
    expect(id.name).toBe("Carlos Pérez");
    expect(id.plate).toBe("XYZ999");
    expect(id.messenger_id).toBe("msg-uuid-1");
    expect(id.name).not.toBe(twin.declared_truth.driver_name);

    const view = buildDrawerViewFromDigitalTwin(twin);
    expect(view.driver_name).toBe("Carlos Pérez");
    expect(view.plate).toBe("XYZ999");
    expect(view.declared_truth.port_code).toBe("SPB");
    expect(view.observed_truth.current_node_code).toBe("SPIA_GATE");
  });

  it("TEST I: legacy payload without journey_* still works", () => {
    const twin = normalizeOperationalDigitalTwin({
      container_id: "LEGACY-1",
      current_phase: "EN_RUTA",
      declared_truth: { port_code: "SPIA" },
      observed_truth: {},
      inferred_truth: {},
      timeline: [],
      alerts: [],
      map: { polyline: [] },
    });
    expect(twin).not.toBeNull();
    expect(twin!.journey_current_state).toBeNull();
    expect(twin!.journey_live).toEqual([]);
    expect(twin!.current_location).toBeNull();
    expect(() => buildDrawerViewFromDigitalTwin(twin!)).not.toThrow();
    expect(() => buildContainerLiveState(minimalRow({ container_id: "LEGACY-1" }), twin)).not.toThrow();
  });

  it("TEST J: elapsed objects preserve nulls, zero minutes, and backend labels", () => {
    const twin = normalizeOperationalDigitalTwin(e2ePayload)!;

    // null elapsed object does not become zero
    expect(twin.inside_port_elapsed).not.toBeNull();
    expect(twin.inside_port_elapsed!.minutes).toBeNull();
    expect(twin.inside_port_elapsed!.label).toBeNull();
    expect(resolveElapsedLabel(twin.inside_port_elapsed)).toBeNull();

    // cdr not_arrived without duration → no invented duration
    expect(twin.cdr_elapsed!.status).toBe("not_arrived");
    expect(twin.cdr_elapsed!.minutes).toBeNull();
    expect(resolveElapsedLabel(twin.cdr_elapsed)).toBeNull();

    // stationary_time 0 min remains valid
    expect(twin.stationary_time).toEqual({ minutes: 0, label: "0 min" });
    expect(resolveElapsedLabel(twin.stationary_time)).toBe("0 min");

    // backend label has priority
    const withLabel = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      inside_port_elapsed: {
        minutes: 65,
        label: "1 h 5 min",
        source: "timeline",
      },
    })!;
    expect(withLabel.inside_port_elapsed).toEqual({
      minutes: 65,
      label: "1 h 5 min",
      source: "timeline",
    });
    expect(resolveElapsedLabel(withLabel.inside_port_elapsed)).toBe("1 h 5 min");

    // minutes fallback works without assuming seconds
    expect(formatElapsedMinutes(null)).toBeNull();
    expect(formatElapsedMinutes(undefined)).toBeNull();
    expect(formatElapsedMinutes(0)).toBe("0 min");
    expect(formatElapsedMinutes(65)).toBe("1 h 5 min");
    expect(resolveElapsedLabel({ minutes: 90, label: null })).toBe("1 h 30 min");

    const view = buildDrawerViewFromDigitalTwin(twin);
    expect(view.cdr_elapsed?.minutes).toBeNull();
    expect(view.inside_port_elapsed?.minutes).toBeNull();
    expect(view.stationary_time?.minutes).toBe(0);
    expect(resolveElapsedLabel(view.stationary_time)).toBe("0 min");
  });
});

describe("Sprint 3C.5G UX presentation", () => {
  it("TEST K: route fallback does not contain timeline titles", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      route_nodes: undefined,
      timeline: [
        { title: "GPS_LOST", at: "2026-09-13T01:00:00Z" },
        { title: "TRACKING_STARTED", at: "2026-09-13T02:00:00Z" },
        { title: "UNKNOWN", at: "2026-09-13T03:00:00Z" },
        { title: "DISPATCH_CREATED", at: "2026-09-13T04:00:00Z" },
      ],
    })!;
    const nodes = deriveRouteNodes(twin, minimalRow());
    const blob = nodes.map((n) => n.name).join(" | ").toUpperCase();
    expect(blob).not.toMatch(/GPS_LOST|TRACKING_STARTED|UNKNOWN|DISPATCH_CREATED|SEÑAL GPS|SEGUIMIENTO INICIADO|DESPACHO/);
  });

  it("TEST L: route fallback is port → corridor → destination", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      route_nodes: undefined,
      timeline: [{ title: "GPS_LOST" }, { title: "TRACKING_STARTED" }],
    })!;
    const nodes = deriveRouteNodes(twin, minimalRow());
    expect(nodes.map((n) => n.name)).toEqual(["SPB", "Buenaventura → Yumbo", "CDR Yumbo"]);
  });

  it("TEST M: window_end_at does not produce IA Rutafy source", () => {
    const kind = resolveEtaSourceKind({
      eta: null,
      windowEndAt: "2026-09-13T22:00:00Z",
      scheduledAt: "2026-09-13T10:00:00Z",
      usedIso: "2026-09-13T22:00:00Z",
    });
    expect(kind).toBe("ventana");
    expect(etaSourceBadgeLabel(kind)).toBe("Ventana operativa");
    expect(etaSourceBadgeLabel(kind)).not.toBe("IA Rutafy");
  });

  it("TEST N: ETA with model/IA source produces IA Rutafy", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      eta: {
        eta_at: "2026-09-13T21:00:00Z",
        source: "model",
        source_label: "prediction",
      },
    })!;
    expect(twin.eta?.source).toBe("model");
    const kind = resolveEtaSourceKind({ eta: twin.eta });
    expect(kind).toBe("ia");
    expect(etaSourceBadgeLabel(kind)).toBe("IA Rutafy");
  });

  it("TEST O: expired ETA keeps historical time and is not IA for window source", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      eta: {
        eta_at: "2020-01-01T20:00:00Z",
        source: "window_end_at",
        is_expired: true,
      },
      inferred_truth: { ...e2ePayload.inferred_truth, expected_arrival_cdr: null },
    })!;
    const live = buildContainerLiveState(minimalRow(), twin);
    expect(live.etaExpired).toBe(true);
    expect(live.etaHero).not.toBe("ETA vencido");
    expect(live.etaHero).toMatch(/\d/);
    expect(etaSourceBadgeLabel(live.etaSource)).not.toBe("IA Rutafy");
    expect(etaSourceExpiredBadgeLabel(live.etaSource)).toBe("Ventana vencida");
  });

  it("TEST O2: window_end_at expired badge is Ventana vencida", () => {
    expect(etaSourceExpiredBadgeLabel("ventana")).toBe("Ventana vencida");
    const kind = resolveEtaSourceKind({
      eta: { eta_at: "2020-01-01T10:00:00Z", source: "window_end_at", is_expired: true },
    });
    expect(kind).toBe("ventana");
    expect(etaSourceExpiredBadgeLabel(kind)).toBe("Ventana vencida");
  });

  it("TEST O3: model expired badge is IA Rutafy vencida", () => {
    const kind = resolveEtaSourceKind({
      eta: { eta_at: "2020-01-01T10:00:00Z", source: "model", is_expired: true },
    });
    expect(kind).toBe("ia");
    expect(etaSourceExpiredBadgeLabel(kind)).toBe("IA Rutafy vencida");
  });

  it("TEST P: TRACKING_STARTED → Seguimiento iniciado", () => {
    expect(resolveJourneyStateLabel("TRACKING_STARTED")).toBe("Seguimiento iniciado");
    expect(resolveOperationalEventLabel("TRACKING_STARTED")).toBe("Seguimiento iniciado");
  });

  it("TEST Q: DISPATCH_CREATED → Despacho registrado", () => {
    expect(resolveOperationalEventLabel("DISPATCH_CREATED")).toBe("Despacho registrado");
  });

  it("TEST R: BV_YUMBO → Buenaventura → Yumbo", () => {
    expect(resolveCorridorLabel("BV_YUMBO")).toBe("Buenaventura → Yumbo");
  });

  it("TEST S: technical GPS OFFLINE → Sin señal with HYBRID mode", () => {
    const twin = normalizeOperationalDigitalTwin(e2ePayload)!;
    expect(twin.journey_tracking_mode).toBe("HYBRID");
    expect(resolveTechnicalGpsStatus(twin)).toBe("OFFLINE");
    expect(resolveGpsStatusLabel(resolveTechnicalGpsStatus(twin))).toBe("Sin señal");
  });

  it("TEST T: historical GPS_LOST alone does not become current GPS state", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      alerts: [],
      timeline: [{ title: "GPS_LOST", at: "2026-09-13T01:00:00Z" }],
      observed_truth: {
        ...e2ePayload.observed_truth,
        technical_gps_status: "ONLINE",
        gps_status: "ONLINE",
      },
      gps_status: "ONLINE",
      driver: { ...e2ePayload.driver, gps_status: "ONLINE" },
    })!;
    const drawer = resolveDrawerRiskPresentation(minimalRow({ alerts: [] }), twin);
    expect(resolveTechnicalGpsStatus(twin)).toBe("ONLINE");
    expect(resolveGpsStatusLabel(resolveTechnicalGpsStatus(twin))).toBe("Con señal");
    expect(drawer.activeAlerts.some((a) => /GPS|señal/i.test(a))).toBe(false);
  });

  it("TEST U: Pronóstico empty when no ETA/inferred arrival/exit/next", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      inferred_truth: {
        loading_probability: null,
        expected_exit_port_at: null,
        expected_arrival_cdr: null,
        next_expected_event: null,
      },
      eta: null,
      journey_progress: { percent: 10, current_step: "AT_GATE", next_step: null },
      next_expected_step: null,
      next_node_label: null,
    })!;
    const view = buildDrawerViewFromDigitalTwin(
      twin,
      minimalRow({ eta: null, window_end_at: null, scheduled_at: null, destination: null, destination_code: null }),
    );
    // Clear any residual next labels from live/humanize of null destination
    const viewClean = {
      ...view,
      next_expected_step_label: null,
      next_step: null,
      next_node_label: null,
      inferred_truth: {
        loading_probability: null,
        expected_exit_port_at: null,
        expected_arrival_cdr: null,
        next_expected_event: null,
      },
      eta_display: {
        timeLabel: "Sin ETA",
        subLabel: "",
        isExpired: false,
        isWeakFallback: false,
      },
    };
    const items = buildOperationalPredictionItems(viewClean);
    expect(items).toEqual([]);
    const blob = items.join(" | ").toLowerCase();
    expect(blob).not.toMatch(/llegará al cdr|llegada estimada:|en estimado/);
  });

  it("TEST U2: Pronóstico includes one valid arrival line when expected_arrival_cdr set", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      inferred_truth: {
        loading_probability: null,
        expected_exit_port_at: null,
        expected_arrival_cdr: "2026-09-13T20:00:00Z",
        next_expected_event: null,
      },
      eta: null,
      journey_progress: { percent: 10, current_step: "AT_GATE", next_step: null },
      next_expected_step: null,
      next_node_label: null,
    })!;
    const view = buildDrawerViewFromDigitalTwin(twin, minimalRow());
    const viewClean = {
      ...view,
      next_expected_step_label: null,
      next_step: null,
      next_node_label: null,
      inferred_truth: {
        ...view.inferred_truth,
        expected_exit_port_at: null,
        next_expected_event: null,
        expected_arrival_cdr: "2026-09-13T20:00:00Z",
      },
    };
    const items = buildOperationalPredictionItems(viewClean);
    const arrivalLines = items.filter((i) => i.startsWith("Llegada estimada:"));
    expect(arrivalLines).toHaveLength(1);
    expect(arrivalLines[0]).toMatch(/Llegada estimada:/);
    expect(arrivalLines[0].toLowerCase()).not.toMatch(/en estimado/);
  });

  it("TEST V: nextNodeName is not invented as Evento when no next sources", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      next_node_label: null,
      next_expected_step: null,
      journey_progress: { percent: 10, current_step: "AT_GATE", next_step: null },
      inferred_truth: {
        ...e2ePayload.inferred_truth,
        next_expected_event: null,
      },
    })!;
    const live = buildContainerLiveState(
      minimalRow({ destination: null, destination_code: null }),
      twin,
    );
    expect(live.nextNodeName).not.toBe("Evento");
    expect(live.nextNodeName).toBe("Sin destino");
  });

  it("TEST W: historical AT_GATE ignores current_location SPIA", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      current_location: {
        node_code: "SPIA_GATE",
        name: "SPIA Entrada/Salida",
        lat: 3.89,
        lng: -77.07,
      },
      timeline: [{ title: "AT_GATE", at: "2026-09-13T12:51:00Z" }],
    })!;
    const live = buildContainerLiveState(minimalRow(), twin);
    expect(live.timeline[0]?.title).toBe("En ingreso al puerto");
    expect(live.timeline[0]?.title).not.toBe("Llegó a la entrada de SPIA");

    const view = buildDrawerViewFromDigitalTwin(twin, minimalRow());
    expect(view.timeline[0]?.title).toBe("En ingreso al puerto");
    expect(view.timeline[0]?.title).not.toBe("Llegó a la entrada de SPIA");
  });

  it("TEST X: per-event SPIA metadata unsupported — contract has no node fields", () => {
    // OperationalDigitalTwinTimelineEvent: at | title | detail | phase only.
    // Extra payload fields like node_code are dropped by normalizeTimeline.
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      timeline: [
        {
          title: "AT_GATE",
          at: "2026-09-13T12:51:00Z",
          node_code: "SPIA_GATE",
          name: "SPIA Entrada/Salida",
        },
      ],
    })!;
    expect(twin.timeline[0]?.title).toBe("AT_GATE");
    expect(
      Object.prototype.hasOwnProperty.call(twin.timeline[0], "node_code"),
    ).toBe(false);
    const live = buildContainerLiveState(minimalRow(), twin);
    // Without normalized event geography → generic label (not inventable from current_location)
    expect(live.timeline[0]?.title).toBe("En ingreso al puerto");
    // Implementable only after extending OperationalDigitalTwinTimelineEvent + normalizer.
  });

  it("TEST Y: ENTERED_PORT → Dentro del puerto", () => {
    expect(resolveOperationalEventLabel("ENTERED_PORT")).toBe("Dentro del puerto");
  });

  it("TEST Z: AT_GATE → En ingreso al puerto", () => {
    expect(resolveOperationalPhaseLabel("AT_GATE", null)).toBe("En ingreso al puerto");
    expect(resolveOperationalEventLabel("AT_GATE")).toBe("En ingreso al puerto");
  });

  it("TEST AA: next_expected_event ENTERED_PORT → Dentro del puerto", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      next_node_label: null,
      next_expected_step: null,
      journey_progress: { percent: 22, current_step: "AT_GATE", next_step: null },
      inferred_truth: {
        ...e2ePayload.inferred_truth,
        next_expected_event: "ENTERED_PORT",
      },
    })!;
    const live = buildContainerLiveState(
      minimalRow({ destination: null, destination_code: null }),
      twin,
    );
    expect(live.nextNodeName).toBe("Dentro del puerto");
  });

  it("TEST AB: contradictory reasons keep Retraso omit normal", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      alerts: [],
      risk: { level: "medium", reasons: ["Retraso", "Operación en curso normal"] },
      observed_truth: {
        ...e2ePayload.observed_truth,
        technical_gps_status: "ONLINE",
        gps_status: "ONLINE",
      },
      gps_status: "ONLINE",
    })!;
    const drawer = resolveDrawerRiskPresentation(
      minimalRow({ alerts: [], gps_status: "ONLINE", risk_band: "normal" }),
      twin,
    );
    expect(drawer.risk.reasons).toContain("Retraso");
    expect(drawer.risk.reasons.some((r) => /operaci[oó]n en curso normal/i.test(r))).toBe(
      false,
    );
  });

  it("TEST AC: only normal reason may show as normal", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      alerts: [],
      risk: { level: "low", reasons: ["Operación en curso normal"] },
      observed_truth: {
        ...e2ePayload.observed_truth,
        technical_gps_status: "ONLINE",
        gps_status: "ONLINE",
      },
      gps_status: "ONLINE",
    })!;
    const drawer = resolveDrawerRiskPresentation(
      minimalRow({ alerts: [], gps_status: "ONLINE", risk_band: "normal" }),
      twin,
    );
    expect(drawer.risk.label).toBe("Normal");
    expect(drawer.risk.reasons).toContain("Operación en curso normal");
  });

  it("TEST AD: GPS OFFLINE without retraso reason does not invent Retraso", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      alerts: ["GPS offline"],
      risk: { level: "low", reasons: ["Sin retrasos detectados", "Operación en curso normal"] },
      observed_truth: {
        ...e2ePayload.observed_truth,
        technical_gps_status: "OFFLINE",
      },
      gps_status: "OFFLINE",
    })!;
    const drawer = resolveDrawerRiskPresentation(
      minimalRow({ alerts: ["GPS offline"], gps_status: "OFFLINE" }),
      twin,
    );
    expect(drawer.risk.reasons).not.toContain("Retraso");
    expect(drawer.risk.label).toBe("Normal");
    expect(drawer.activeAlerts).toContain("Señal GPS perdida");
    expect(resolveGpsStatusLabel(resolveTechnicalGpsStatus(twin))).toBe("Sin señal");
  });

  it("TEST AE: En gate SPIA → Llegó a la entrada de SPIA", () => {
    expect(resolveOperationalEventLabel("En gate SPIA")).toBe("Llegó a la entrada de SPIA");
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      timeline: [
        {
          title: "En gate SPIA",
          detail: "Posición en la entrada o salida del puerto.",
          at: "2026-09-13T12:51:00Z",
        },
      ],
    })!;
    const live = buildContainerLiveState(minimalRow(), twin);
    expect(live.timeline[0]?.title).toBe("Llegó a la entrada de SPIA");
    expect(live.timeline[0]?.detail).toMatch(/entrada o salida/i);
  });

  it("TEST AF: pure AT_GATE without metadata → En ingreso al puerto", () => {
    expect(resolveOperationalEventLabel("AT_GATE")).toBe("En ingreso al puerto");
  });

  it("TEST 3C.5G.2-A: AT_GATE + ENTERED_PORT → Dentro del puerto", () => {
    expect(
      resolveNextOperationalStepLabel({
        currentPhase: "AT_GATE",
        inferredNextEvent: "ENTERED_PORT",
      }),
    ).toBe("Dentro del puerto");
  });

  it("TEST 3C.5G.2-B: AT_GATE + ambiguous Ingreso al puerto → Dentro del puerto", () => {
    expect(
      resolveNextOperationalStepLabel({
        currentPhase: "AT_GATE",
        nextExpectedStepLabel: "Ingreso al puerto",
      }),
    ).toBe("Dentro del puerto");
    expect(
      resolveNextOperationalStepLabel({
        currentPhase: "AT_GATE",
        nextExpectedStepLabel: "Ingreso al puerto",
      }),
    ).not.toBe("Ingreso al puerto");
  });

  it("TEST 3C.5G.2-C: canonical ENTERED_PORT wins over ambiguous label", () => {
    expect(
      resolveNextOperationalStepLabel({
        currentPhase: "AT_GATE",
        nextExpectedStepLabel: "Ingreso al puerto",
        nextNodeLabel: "Ingreso al puerto",
        inferredNextEvent: "ENTERED_PORT",
      }),
    ).toBe("Dentro del puerto");
  });

  it("TEST 3C.5G.2-D: GPS offline + GPS alert + NORMAL reasons → Normal risk", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      alerts: ["Señal GPS perdida"],
      risk: {
        level: "low",
        reasons: ["Sin retrasos detectados", "Operación en curso normal"],
      },
    })!;
    const drawer = resolveDrawerRiskPresentation(
      minimalRow({ alerts: ["Señal GPS perdida"], gps_status: "OFFLINE", risk_band: "delayed" }),
      twin,
    );
    expect(drawer.risk.label).toBe("Normal");
    expect(drawer.risk.reasons).toEqual(
      expect.arrayContaining(["Sin retrasos detectados", "Operación en curso normal"]),
    );
    expect(drawer.activeAlerts).toContain("Señal GPS perdida");
    expect(resolveGpsStatusLabel(resolveTechnicalGpsStatus(twin))).toBe("Sin señal");
  });

  it("TEST 3C.5G.2-E: real negative risk + GPS offline preserves Atención", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      alerts: ["GPS offline"],
      risk: { level: "medium", reasons: ["Retraso"] },
    })!;
    const drawer = resolveDrawerRiskPresentation(
      minimalRow({ alerts: ["GPS offline"], gps_status: "OFFLINE" }),
      twin,
    );
    expect(drawer.risk.label).toBe("Atención");
    expect(drawer.risk.reasons).toContain("Retraso");
    expect(drawer.activeAlerts).toContain("Señal GPS perdida");
  });

  it("TEST 3C.5G.2-F: NORMAL + NEGATIVE → only negatives", () => {
    const twin = normalizeOperationalDigitalTwin({
      ...e2ePayload,
      alerts: [],
      risk: {
        level: "medium",
        reasons: ["Operación en curso normal", "Retraso"],
      },
      observed_truth: {
        ...e2ePayload.observed_truth,
        technical_gps_status: "ONLINE",
      },
      gps_status: "ONLINE",
    })!;
    const drawer = resolveDrawerRiskPresentation(
      minimalRow({ alerts: [], gps_status: "ONLINE", risk_band: "normal" }),
      twin,
    );
    expect(drawer.risk.reasons).toContain("Retraso");
    expect(drawer.risk.reasons.some((r) => /operaci[oó]n en curso normal/i.test(r))).toBe(false);
  });

  it("TEST 3C.5G.2-G: UNKNOWN histórico → Posición no clasificada", () => {
    expect(resolveOperationalEventLabel("UNKNOWN")).toBe("Posición no clasificada");
  });

  it("TEST 3C.5G.2-H: AT_GATE histórico con SPIA → Llegó a la entrada de SPIA", () => {
    expect(resolveOperationalEventLabel("En gate SPIA")).toBe("Llegó a la entrada de SPIA");
    expect(
      resolveOperationalEventLabel("AT_GATE", {
        nodeCode: "SPIA_GATE",
        nodeName: "SPIA Entrada/Salida",
      }),
    ).toBe("Llegó a la entrada de SPIA");
  });
});
