import { describe, expect, it } from "vitest";
import type { OperationalControlContainerRow } from "@/api/operational-control";
import { operationalRowIdentity } from "@/lib/operationalRowIdentity";
import {
  buildLocationColumnLines,
  buildOperationColumnLines,
  buildScheduleColumnLines,
  buildStateColumnLines,
  formatContainerEquipment,
  formatScheduledAtBogota,
  humanizeLocationSource,
} from "@/lib/operationalTowerTablePresentation";
import {
  formatLastGpsAge,
  formatReportAge,
  resolveReportObservedAt,
} from "@/lib/operationalUpdateDisplay";

function row(overrides: Partial<OperationalControlContainerRow> = {}): OperationalControlContainerRow {
  return {
    container_id: "TSTU7654321",
    alerts: [],
    ...overrides,
  } as OperationalControlContainerRow;
}

describe("Sprint 3D.4C.1B — tower table presentation", () => {
  it("1: container equipment from raw", () => {
    expect(
      formatContainerEquipment({ quantity: 1, size_ft: 40, type: null, iso_code: null, raw: "1X40" }),
    ).toBe("1X40");
    expect(formatContainerEquipment({ quantity: null, size_ft: null, raw: null })).toBeNull();
  });

  it("2: operation reference + plate + driver", () => {
    const lines = buildOperationColumnLines(
      row({
        operation_reference: "IMP-5625",
        plate: "SRL052",
        driver_name: "Luis H. Bejarano",
      }),
    );
    expect(lines.reference).toBe("IMP-5625");
    expect(lines.plate).toBe("SRL052");
    expect(lines.driver).toBe("Luis H. Bejarano");
  });

  it("3: fallback without operation_reference", () => {
    const lines = buildOperationColumnLines(row({ plate: null, driver_name: null }));
    expect(lines.reference).toBeNull();
    expect(lines.plate).toBe("Sin placa");
    expect(lines.driver).toBe("Sin conductor");
  });

  it("4: estado shows operational + journey separately", () => {
    const lines = buildStateColumnLines(
      row({
        operational_state: "EN RUTA",
        journey_current_state: "DELIVERY_IN_PROCESS",
        journey_id: "j-1",
        operational_phase: "ACTIVE",
      }),
    );
    expect(lines.primary).toMatch(/ruta/i);
    expect(lines.secondary).toBe("DELIVERY_IN_PROCESS");
    expect(lines.tertiary).toBe("ACTIVE");
  });

  it("5: EN RUTA + DELIVERY_IN_PROCESS presented separately", () => {
    const lines = buildStateColumnLines(
      row({
        operational_state: "EN RUTA",
        journey_current_state: "DELIVERY_IN_PROCESS",
        journey_id: "j-1",
      }),
    );
    expect(lines.primary).toMatch(/ruta/i);
    expect(lines.secondary).toBe("DELIVERY_IN_PROCESS");
  });

  it("5b: frontend does not hide FINALIZADO even if journey looks open", () => {
    const lines = buildStateColumnLines(
      row({
        journey_id: "j-open",
        journey_current_state: "DELIVERY_IN_PROCESS",
        journey_completed_at: null,
        operational_state: "FINALIZADO",
      }),
    );
    expect(lines.primary).toMatch(/finalizado/i);
    expect(lines.secondary).toBe("DELIVERY_IN_PROCESS");
  });

  it("6: location label + source", () => {
    expect(humanizeLocationSource("monitoring_email")).toBe("Monitoreo");
    expect(humanizeLocationSource("tracking_points")).toBe("GPS");
    const lines = buildLocationColumnLines(
      row({
        current_location: {
          code: "CDR_YUMBO",
          label: "CDR Yumbo",
          source: "monitoring_email",
          observed_at: "2026-09-16T10:00:00.000Z",
        },
      }),
      Date.parse("2026-09-16T12:00:00.000Z"),
    );
    expect(lines.label).toBe("CDR Yumbo");
    expect(lines.source).toBe("Monitoreo");
    expect(lines.age).toMatch(/Hace/);
  });

  it("7–8: programación Bogotá + sin programación", () => {
    const scheduled = formatScheduledAtBogota("2026-09-14T21:00:00.000Z"); // 16:00 Bogotá
    expect(scheduled).toMatch(/14/);
    expect(scheduled).toMatch(/16:00/);
    const withStatus = buildScheduleColumnLines(
      row({ scheduled_at: "2026-09-14T21:00:00.000Z", schedule_status: "RETRASADO" }),
    );
    expect(withStatus.status).toBe("RETRASADO");
    expect(buildScheduleColumnLines(row({ scheduled_at: null })).when).toBe("Sin programación");
  });

  it("9: reporte/GPS still separated", () => {
    expect(resolveReportObservedAt({ observed_at: "2026-09-16T12:00:00.000Z" })).toBeTruthy();
    expect(formatReportAge(null)).toBe("Sin reporte");
    expect(formatLastGpsAge(null)).toBe("Sin GPS");
  });

  it("10: two journeys same container — distinct identities", () => {
    const a = row({ container_id: "ABC", journey_id: "j-1" });
    const b = row({ container_id: "ABC", journey_id: "j-2" });
    expect(operationalRowIdentity(a)).toBe("j-1");
    expect(operationalRowIdentity(b)).toBe("j-2");
    expect(operationalRowIdentity(a)).not.toBe(operationalRowIdentity(b));
  });

  it("11: mobile essentials present via helpers", () => {
    const r = row({
      operation_reference: "IMP-1",
      plate: "ABC123",
      driver_name: "Ana",
      operational_state: "EN RUTA",
      journey_current_state: "IN_TRANSIT",
      journey_id: "j-m",
      current_location: { label: "SPIA", source: "tracking_points" },
      scheduled_at: "2026-09-14T21:00:00.000Z",
      schedule_status: "A TIEMPO",
      container_equipment: { raw: "1X40" },
    });
    expect(formatContainerEquipment(r.container_equipment)).toBe("1X40");
    expect(buildOperationColumnLines(r).reference).toBe("IMP-1");
    expect(buildStateColumnLines(r).primary).toBeTruthy();
    expect(buildLocationColumnLines(r).label).toBe("SPIA");
    expect(buildScheduleColumnLines(r).when).not.toBe("Sin programación");
  });
});
