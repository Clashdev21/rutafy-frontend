import { describe, expect, it } from "vitest";
import { normalizeOperationalDigitalTwin } from "@/api/operational-digital-twin";
import { buildDrawerViewFromDigitalTwin } from "@/lib/operationalDrawerViewModel";
import {
  formatElapsedMinutes,
  journeyLiveToPhases,
  journeyTrackingModeLabel,
  resolveDriverIdentity,
  resolveElapsedLabel,
  resolveOperationalMapMarker,
  resolveOperationalPhaseLabel,
  resolveTechnicalGpsStatus,
} from "@/lib/operationalTwinContract";
import { buildContainerLiveState } from "@/lib/operationalTwinUx";
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
    expect(live.phaseLabel).toContain("INGRESO");
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
