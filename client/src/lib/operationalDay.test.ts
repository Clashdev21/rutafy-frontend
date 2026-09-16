import { describe, expect, it } from "vitest";
import type { OperationalControlContainerRow } from "@/api/operational-control";
import { clientFilterContainers } from "@/lib/operationalControlConstants";
import {
  OPERATIONAL_TIMEZONE,
  buildTemporalDayQuery,
  getCalendarDateInTimeZone,
  getOperationalDay,
  shiftCalendarDate,
} from "@/lib/operationalDay";
import {
  filterLiveStatesByRowIdentity,
  operationalRowIdentity,
} from "@/lib/operationalRowIdentity";
import { resolveTowerEmptyMessage } from "@/lib/operationalTowerEmpty";
import {
  formatLastGpsAge,
  formatReportAge,
  resolveReportObservedAt,
} from "@/lib/operationalUpdateDisplay";
import { matchesCommandSearch } from "@/lib/operationalControlUx";
import type { ContainerLiveState } from "@/lib/operationalTwinUx";

function row(overrides: Partial<OperationalControlContainerRow> = {}): OperationalControlContainerRow {
  return {
    container_id: "CNT-1",
    container_label: "MSCU1",
    alerts: [],
    ...overrides,
  } as OperationalControlContainerRow;
}

describe("Sprint 3D.4C — operational day (America/Bogota)", () => {
  it("1: Hoy genera temporal_mode=day y day correcto en America/Bogota", () => {
    const now = new Date("2026-09-16T04:30:00.000Z"); // 23:30 Bogota prev calendar day? UTC 04:30 = 23:30 Sep 15 Bogota
    // 2026-09-16T04:30Z = 2026-09-15 23:30 America/Bogota
    const q = buildTemporalDayQuery("today", { now, timeZone: OPERATIONAL_TIMEZONE });
    expect(q.temporal_mode).toBe("day");
    expect(q.timezone).toBe("America/Bogota");
    expect(q.day).toBe("2026-09-15");
    expect(q.day).toBe(getOperationalDay("today", OPERATIONAL_TIMEZONE, now));
    expect(q.day).not.toBe(now.toISOString().slice(0, 10)); // must not be naive UTC
  });

  it("2: Ayer es día calendario anterior en Bogota", () => {
    const now = new Date("2026-09-16T15:00:00.000Z"); // 10:00 Bogota Sep 16
    expect(getOperationalDay("today", OPERATIONAL_TIMEZONE, now)).toBe("2026-09-16");
    expect(getOperationalDay("yesterday", OPERATIONAL_TIMEZONE, now)).toBe("2026-09-15");
    expect(shiftCalendarDate("2026-09-01", -1)).toBe("2026-08-31");
  });

  it("3: cambio Hoy→Ayer cambia day del request", () => {
    const now = new Date("2026-09-16T15:00:00.000Z");
    const today = buildTemporalDayQuery("today", { now });
    const yesterday = buildTemporalDayQuery("yesterday", { now });
    expect(today.day).not.toBe(yesterday.day);
    expect(yesterday.day).toBe(shiftCalendarDate(today.day, -1));
    expect(yesterday.temporal_mode).toBe("day");
  });

  it("getCalendarDateInTimeZone uses zone not UTC midnight", () => {
    const nearUtcMidnight = new Date("2026-03-20T02:00:00.000Z");
    expect(getCalendarDateInTimeZone(nearUtcMidnight, "America/Bogota")).toBe("2026-03-19");
  });
});

describe("Sprint 3D.4C — no local scheduled_at filter in day mode", () => {
  it("4: structural filters with date cleared keep backend day rows", () => {
    const rows = [
      row({
        container_id: "A",
        scheduled_at: "2026-09-10T10:00:00.000Z", // not "today"
      }),
      row({
        container_id: "B",
        scheduled_at: "2026-09-16T10:00:00.000Z",
      }),
    ];
    // Simulate page: date forced empty while temporal day mode active
    const filtered = clientFilterContainers(rows, { date: "" });
    expect(filtered.map((r) => r.container_id)).toEqual(["A", "B"]);
  });

  it("5: journey scheduled ayer still visible if present in list (backend ownership)", () => {
    const rows = [
      row({
        container_id: "OPEN-YDAY",
        scheduled_at: "2026-09-15T08:00:00.000Z",
        journey_id: "j-1",
        journey_started_at: "2026-09-15T08:00:00.000Z",
        journey_current_state: "TRACKING_STARTED",
      }),
    ];
    const kept = clientFilterContainers(rows, {
      client: "all",
      status: "all",
      port: "all",
      date: "",
    });
    expect(kept).toHaveLength(1);
    expect(kept[0].container_id).toBe("OPEN-YDAY");
  });
});

describe("Sprint 3D.4C — Reporte vs GPS", () => {
  it("6–8: separated labels; null → Sin reporte / Sin GPS", () => {
    expect(resolveReportObservedAt({ observed_at: "2026-09-16T20:42:00.000Z" })).toBe(
      "2026-09-16T20:42:00.000Z",
    );
    expect(resolveReportObservedAt(null)).toBeNull();
    expect(formatReportAge(null)).toBe("Sin reporte");
    expect(formatLastGpsAge(null)).toBe("Sin GPS");

    const now = Date.parse("2026-09-16T21:00:00.000Z");
    expect(formatReportAge("2026-09-16T20:52:00.000Z", now)).toMatch(/Hace 8 minutos/);
    expect(formatLastGpsAge("2026-09-16T20:50:00.000Z", now)).toMatch(/Hace 10 minutos/);
  });

  it("9: does not use received_at as report timestamp", () => {
    expect(
      resolveReportObservedAt({
        observed_at: null,
        received_at: "2026-09-16T22:00:00.000Z",
      }),
    ).toBeNull();
    expect(formatReportAge(null)).toBe("Sin reporte");
  });
});

describe("Sprint 3D.4C — search still works", () => {
  it("10: search finds plate/driver/container", () => {
    const r = row({
      container_label: "MSCU999",
      plate: "XYZ789",
      driver_name: "Ana",
    });
    expect(matchesCommandSearch(r, "MSCU")).toBe(true);
    expect(matchesCommandSearch(r, "XYZ789")).toBe(true);
    expect(matchesCommandSearch(r, "Ana")).toBe(true);
  });
});

describe("Sprint 3D.4C — journey_id identity", () => {
  it("same container_id + distinct journey_id: only matching journey stays", () => {
    const j1 = row({
      container_id: "ABC",
      journey_id: "j-1",
      client_name: "MABE",
    });
    const j2 = row({
      container_id: "ABC",
      journey_id: "j-2",
      client_name: "OTHER",
    });
    expect(operationalRowIdentity(j1)).toBe("j-1");
    expect(operationalRowIdentity(j2)).toBe("j-2");
    expect(operationalRowIdentity(row({ container_id: "LEGACY" }))).toBe("LEGACY");

    const liveStates = [
      { container_id: "ABC", row: j1 },
      { container_id: "ABC", row: j2 },
    ] as ContainerLiveState[];

    const filteredRows = clientFilterContainers([j1, j2], { client: "MABE" });
    expect(filteredRows.map((r) => operationalRowIdentity(r))).toEqual(["j-1"]);

    const visible = filterLiveStatesByRowIdentity(liveStates, filteredRows);
    expect(visible).toHaveLength(1);
    expect(operationalRowIdentity(visible[0].row)).toBe("j-1");
  });
});

describe("Sprint 3D.4C — midnight Bogotá rollover", () => {
  it("poll clock crossing midnight advances today and yesterday", () => {
    const before = new Date("2026-09-16T04:59:00.000Z"); // 23:59 Bogotá Sep 15
    const after = new Date("2026-09-16T05:01:00.000Z"); // 00:01 Bogotá Sep 16

    const todayBefore = buildTemporalDayQuery("today", { now: before });
    const todayAfter = buildTemporalDayQuery("today", { now: after });
    const ydayBefore = buildTemporalDayQuery("yesterday", { now: before });
    const ydayAfter = buildTemporalDayQuery("yesterday", { now: after });

    expect(todayBefore.day).toBe("2026-09-15");
    expect(todayAfter.day).toBe("2026-09-16");
    expect(ydayBefore.day).toBe("2026-09-14");
    expect(ydayAfter.day).toBe("2026-09-15");
    // Simulates page: pollClock advances → paramsKey changes → refetch
    expect(todayBefore.day).not.toBe(todayAfter.day);
  });
});

describe("Sprint 3D.4C — empty states", () => {
  it("no backend rows → day activity message", () => {
    expect(
      resolveTowerEmptyMessage({ dayNav: "today", backendRowCount: 0, visibleRowCount: 0 }),
    ).toBe("No hay operaciones con actividad hoy");
    expect(
      resolveTowerEmptyMessage({ dayNav: "yesterday", backendRowCount: 0, visibleRowCount: 0 }),
    ).toBe("No hay operaciones con actividad ayer");
  });

  it("backend has rows but filters leave 0 → filter message", () => {
    expect(
      resolveTowerEmptyMessage({ dayNav: "today", backendRowCount: 5, visibleRowCount: 0 }),
    ).toBe("No hay operaciones que coincidan con los filtros actuales.");
  });
});
