import type { OperationalControlContainerRow } from "@/api/operational-control";
import { formatGpsAge, RUTAFY_STATUS_LABELS } from "@/lib/operationalControlConstants";
import { OPERATIONAL_TIMEZONE } from "@/lib/operationalDay";
import { resolveJourneyStateLabel } from "@/lib/operationalTwinContract";

function normalizeKey(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

export function formatContainerEquipment(
  equipment?: OperationalControlContainerRow["container_equipment"],
): string | null {
  if (!equipment) return null;
  const raw = equipment.raw?.trim();
  if (raw) return raw;
  const qty = equipment.quantity;
  const size = equipment.size_ft;
  if (qty != null && size != null) return `${qty}X${size}`;
  if (size != null) return `${size}ft`;
  return null;
}

export function resolveAuthoritativePlate(row: OperationalControlContainerRow): string | null {
  return (
    row.plates?.current?.trim() ||
    row.plate?.trim() ||
    row.plates?.assigned?.trim() ||
    null
  );
}

export function buildOperationColumnLines(row: OperationalControlContainerRow): {
  reference: string | null;
  plate: string;
  driver: string;
} {
  return {
    reference: row.operation_reference?.trim() || null,
    plate: resolveAuthoritativePlate(row) || "Sin placa",
    driver: row.driver_name?.trim() || "Sin conductor",
  };
}

function humanizeOperationalState(raw?: string | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const key = normalizeKey(trimmed);
  if (RUTAFY_STATUS_LABELS[key]) return RUTAFY_STATUS_LABELS[key];
  // Keep spaced Spanish labels as-is (e.g. "EN RUTA")
  return trimmed;
}

/**
 * Dense estado lines: present backend truth only.
 * primary = operational_state; secondary = journey_current_state when distinct;
 * tertiary = leg or operational_phase when not duplicate.
 * Does not correct or hide contradictory backend values.
 */
export function buildStateColumnLines(row: OperationalControlContainerRow): {
  primary: string | null;
  secondary: string | null;
  tertiary: string | null;
} {
  const operational = humanizeOperationalState(row.operational_state);

  const journeyCode = row.journey_current_state?.trim() || null;
  const journeyLabel = journeyCode ? resolveJourneyStateLabel(journeyCode) : null;

  let secondary: string | null = null;
  if (journeyCode) {
    const opKey = normalizeKey(row.operational_state);
    const jKey = normalizeKey(journeyCode);
    if (opKey && opKey === jKey) {
      secondary = null;
    } else if (
      journeyLabel &&
      operational &&
      journeyLabel.toLowerCase() === operational.toLowerCase()
    ) {
      secondary = journeyCode;
    } else {
      secondary = journeyCode;
    }
  }

  let tertiary: string | null = null;
  if (row.journey_current_leg != null && Number.isFinite(row.journey_current_leg)) {
    tertiary = `Tramo ${row.journey_current_leg}`;
  } else if (row.operational_phase?.trim()) {
    const phase = row.operational_phase.trim();
    const phaseKey = normalizeKey(phase);
    if (
      phaseKey !== normalizeKey(operational) &&
      phaseKey !== normalizeKey(journeyCode)
    ) {
      tertiary = phase;
    }
  }

  return { primary: operational, secondary, tertiary };
}

export function humanizeLocationSource(source?: string | null): string | null {
  if (!source?.trim()) return null;
  const key = normalizeKey(source);
  if (key === "MONITORING_EMAIL" || key === "MONITORING") return "Monitoreo";
  if (key === "TRACKING_POINTS" || key === "TRACKING" || key === "GPS") return "GPS";
  if (key === "JOURNEY_EVENT" || key === "EVENT" || key.includes("EVENT")) return "Evento";
  if (key === "DISPATCH_DECLARATION" || key === "DECLARATION") return "Declaración";
  return null;
}

export function buildLocationColumnLines(
  row: OperationalControlContainerRow,
  now = Date.now(),
): {
  label: string;
  source: string | null;
  age: string | null;
} {
  const loc = row.current_location;
  const label = loc?.label?.trim() || loc?.code?.trim() || "Sin ubicación";
  const source = humanizeLocationSource(loc?.source);
  const age = loc?.observed_at ? formatGpsAge(loc.observed_at, now) : null;
  return { label, source, age };
}

export function formatScheduledAtBogota(
  iso?: string | null,
  timeZone: string = OPERATIONAL_TIMEZONE,
): string | null {
  if (!iso?.trim()) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  const day = new Intl.DateTimeFormat("es-CO", {
    timeZone,
    day: "numeric",
    month: "short",
  }).format(d);
  const time = new Intl.DateTimeFormat("es-CO", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${day} · ${time}`;
}

export function buildScheduleColumnLines(row: OperationalControlContainerRow): {
  when: string;
  status: string | null;
} {
  const when = formatScheduledAtBogota(row.scheduled_at);
  const status = row.schedule_status?.trim() || null;
  if (!when) {
    return {
      when: "Sin programación",
      status: status && status !== "SIN_PROGRAMACION" ? status : null,
    };
  }
  return { when, status };
}
