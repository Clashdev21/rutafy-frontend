import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import type { OperationalControlContainerRow } from "@/api/operational-control";
import { normalizeOperationalDigitalTwin } from "@/api/operational-digital-twin";
import { matchesCommandSearch } from "@/lib/operationalControlUx";
import {
  computeTowerSummaryMetrics,
  formatTowerOperationsHeadline,
  isSummaryAtCdr,
  isSummaryInPort,
  isSummaryInRoute,
  needsOperationalAttention,
} from "@/lib/operationalTowerSummary";
import { buildContainerLiveState, resolveDrawerRiskPresentation, type ContainerLiveState } from "@/lib/operationalTwinUx";
import {
  DEFAULT_VISIBLE_FILTERS,
  EMPTY_OPERATIONAL_FILTERS,
  VISIBLE_FILTERS_STORAGE_KEY,
  addVisibleFilter,
  availableTowerFilterKeys,
  loadVisibleFilters,
  removeVisibleFilter,
  resetFilterValues,
  sanitizeVisibleFilters,
  saveVisibleFilters,
} from "@/lib/operationalTowerVisibleFilters";

function minimalRow(
  overrides: Partial<OperationalControlContainerRow> = {},
): OperationalControlContainerRow {
  return {
    container_id: "CNT-001",
    container_label: "MSCU1234567",
    client_name: "MABE",
    program_name: "BV_YUMBO",
    plate: "ABC123",
    driver_name: "Juan Pérez",
    alerts: [],
    ...overrides,
  } as OperationalControlContainerRow;
}

function liveFromPhase(
  phase: string,
  extras?: {
    row?: Partial<OperationalControlContainerRow>;
    twin?: Record<string, unknown>;
  },
): ContainerLiveState {
  const twin = normalizeOperationalDigitalTwin({
    container_id: "CNT-001",
    current_phase: phase,
    journey_live: [],
    observed_truth: {},
    declared_truth: {},
    inferred_truth: {},
    risk: { level: "low", reasons: [] },
    alerts: [],
    ...extras?.twin,
  });
  return buildContainerLiveState(minimalRow(extras?.row), twin);
}

describe("Sprint 3D.2 — tower summary headline", () => {
  it("A: 12 operaciones → headline completo", () => {
    expect(formatTowerOperationsHeadline(12, 12)).toBe("12 operaciones");
  });

  it("B: 4 de 12 cuando search/filtro reduce", () => {
    expect(formatTowerOperationsHeadline(4, 12)).toBe("4 de 12 operaciones");
  });

  it("N: quickTab no altera total/visible del resumen (métricas usan universos sin chip)", () => {
    const states = Array.from({ length: 12 }, (_, i) =>
      liveFromPhase("AT_GATE", {
        row: { container_id: `C-${i}`, container_label: `L-${i}` },
        twin: { container_id: `C-${i}` },
      }),
    );
    const metrics = computeTowerSummaryMetrics(states, states.slice(0, 4));
    expect(metrics.totalOperations).toBe(12);
    expect(metrics.visibleOperations).toBe(4);
    expect(formatTowerOperationsHeadline(metrics.visibleOperations, metrics.totalOperations)).toBe(
      "4 de 12 operaciones",
    );
  });
});

describe("Sprint 3D.2 — summary location metrics", () => {
  it("C: AT_GATE → Puerto +1", () => {
    const s = liveFromPhase("AT_GATE");
    expect(isSummaryInPort(s)).toBe(true);
    expect(isSummaryInRoute(s)).toBe(false);
    const m = computeTowerSummaryMetrics([s], [s]);
    expect(m.inPort).toBe(1);
  });

  it("D: ENTERED_PORT → Puerto +1", () => {
    const s = liveFromPhase("ENTERED_PORT");
    expect(isSummaryInPort(s)).toBe(true);
    const m = computeTowerSummaryMetrics([s], [s]);
    expect(m.inPort).toBe(1);
  });

  it("E: señal explícita AT_CDR → CDR +1", () => {
    const s = liveFromPhase("AT_CDR");
    expect(isSummaryAtCdr(s)).toBe(true);
    expect(isSummaryInPort(s)).toBe(false);
    const m = computeTowerSummaryMetrics([s], [s]);
    expect(m.atCdr).toBe(1);
  });

  it("E2: destination CDR alone does not count", () => {
    const s = liveFromPhase("AT_GATE", {
      row: { destination: "CDR Yumbo", destination_code: "CDR_YUMBO" },
    });
    expect(isSummaryAtCdr(s)).toBe(false);
  });

  it("en ruta: IN_TRANSIT counts; ambiguous does not", () => {
    const route = liveFromPhase("IN_TRANSIT");
    expect(isSummaryInRoute(route)).toBe(true);
    const ambiguous = liveFromPhase("UNKNOWN");
    expect(isSummaryInRoute(ambiguous)).toBe(false);
  });
});

describe("Sprint 3D.2 — Atención aligns with drawer", () => {
  it("F: GPS OFFLINE + GPS alert + NORMAL reasons → Atención 0", () => {
    const twin = normalizeOperationalDigitalTwin({
      container_id: "CNT-001",
      current_phase: "AT_GATE",
      alerts: ["Señal GPS perdida"],
      risk: {
        level: "low",
        reasons: ["Sin retrasos detectados", "Operación en curso normal"],
      },
      observed_truth: { technical_gps_status: "OFFLINE" },
      declared_truth: {},
      inferred_truth: {},
      journey_live: [],
    });
    const row = minimalRow({ alerts: ["Señal GPS perdida"], gps_status: "OFFLINE" });
    const drawer = resolveDrawerRiskPresentation(row, twin);
    expect(drawer.requiresOperationalAttention).toBe(false);
    expect(needsOperationalAttention(row, twin)).toBe(false);
    const live = buildContainerLiveState(row, twin);
    const m = computeTowerSummaryMetrics([live], [live]);
    expect(m.attention).toBe(0);
  });

  it("G: riesgo operacional negativo real → Atención +1", () => {
    const twin = normalizeOperationalDigitalTwin({
      container_id: "CNT-001",
      current_phase: "IN_TRANSIT",
      alerts: [],
      risk: { level: "medium", reasons: ["Retraso detectado en corredor"] },
      observed_truth: { technical_gps_status: "ONLINE" },
      declared_truth: {},
      inferred_truth: {},
      journey_live: [],
    });
    const row = minimalRow({ alerts: [], gps_status: "ONLINE", risk_band: "normal" });
    const drawer = resolveDrawerRiskPresentation(row, twin);
    expect(drawer.requiresOperationalAttention).toBe(true);
    expect(needsOperationalAttention(row, twin)).toBe(true);
    const live = buildContainerLiveState(row, twin);
    const m = computeTowerSummaryMetrics([live], [live]);
    expect(m.attention).toBe(1);
  });
});

describe("Sprint 3D.2 — +Filtro availability", () => {
  it("no duplica keys ya visibles en el menú", () => {
    expect(availableTowerFilterKeys(["client", "status", "port"])).toEqual([
      "program",
      "driver",
      "plate",
      "date",
    ]);
    expect(addVisibleFilter(["client", "status"], "client")).toEqual(["client", "status"]);
    expect(addVisibleFilter(["client"], "port")).toEqual(["client", "port"]);
  });
});

describe("Sprint 3D.2 — visibleFilters localStorage", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("H: JSON inválido → default seguro", () => {
    store.set(VISIBLE_FILTERS_STORAGE_KEY, "{not-json");
    expect(loadVisibleFilters()).toEqual([...DEFAULT_VISIBLE_FILTERS]);
    expect(sanitizeVisibleFilters(undefined)).toEqual([...DEFAULT_VISIBLE_FILTERS]);
    expect(sanitizeVisibleFilters("oops")).toEqual([...DEFAULT_VISIBLE_FILTERS]);
  });

  it("I: keys inválidas ignoradas", () => {
    expect(sanitizeVisibleFilters(["client", "foo", "port", 12, null])).toEqual([
      "client",
      "port",
    ]);
  });

  it("J: duplicados eliminados", () => {
    expect(sanitizeVisibleFilters(["port", "client", "port", "status"])).toEqual([
      "port",
      "client",
      "status",
    ]);
  });

  it("save/load roundtrip", () => {
    saveVisibleFilters(["driver", "plate"]);
    expect(loadVisibleFilters()).toEqual(["driver", "plate"]);
  });
});

describe("Sprint 3D.2 — filter remove / clear", () => {
  it("K: quitar filtro → quita visible + limpia valor", () => {
    const values = {
      ...EMPTY_OPERATIONAL_FILTERS,
      client: "MABE",
      port: "SPIA",
    };
    const next = removeVisibleFilter(["client", "status", "port"], "port", values);
    expect(next.visibleFilters).toEqual(["client", "status"]);
    expect(next.filterValues.port).toBe("all");
    expect(next.filterValues.client).toBe("MABE");
  });

  it("L: Limpiar filtros → limpia values, conserva visibleFilters", () => {
    const visible = ["client", "port", "plate"] as const;
    const cleared = resetFilterValues();
    expect(cleared).toEqual(EMPTY_OPERATIONAL_FILTERS);
    expect([...visible]).toEqual(["client", "port", "plate"]);
  });
});

describe("Sprint 3D.2 — buscador", () => {
  const row = minimalRow({
    container_label: "MSCU9999999",
    container_id: "CNT-XYZ",
    plate: "XYZ789",
    driver_name: "Carlos Ruiz",
  });

  it("M: encuentra contenedor, placa y conductor", () => {
    expect(matchesCommandSearch(row, "MSCU999")).toBe(true);
    expect(matchesCommandSearch(row, "XYZ789")).toBe(true);
    expect(matchesCommandSearch(row, "Carlos")).toBe(true);
    expect(matchesCommandSearch(row, "no-existe")).toBe(false);
  });
});
