import type {
  OperationalControlContainerDetail,
  OperationalControlContainerRow,
  OperationalControlMapData,
} from "@/api/operational-control";

export type PortDisplay = {
  code: string;
  city: string | null;
};

export type EtaDisplay = {
  timeLabel: string;
  subLabel: string;
  isExpired: boolean;
  isWeakFallback: boolean;
};

const OPERATIONAL_STATE_LABELS: Record<string, string> = {
  PENDING_GPS: "Esperando GPS",
  ESPERANDO_GPS: "Esperando GPS",
  WAITING_GPS: "Esperando GPS",
  ACTIVE: "En ruta",
  EN_RUTA: "En ruta",
  CARGADO: "Cargado",
  DECLARATION: "Declarado",
  DECLARADO: "Declarado",
  PROGRAMADO: "Programado",
  ESPERANDO_MOVIMIENTO: "Esperando movimiento",
  WAITING_MOVEMENT: "Esperando movimiento",
  EN_PUERTO: "En puerto",
  FINALIZADO: "Finalizado",
  COMPLETED: "Completado",
  ALERTA: "Alerta",
  MONITORING: "En monitoreo",
  MATCHING: "En matching",
};

function normalizeKey(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function titleCaseWords(value: string): string {
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function humanizeOperationalStateValue(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  if (/PROGRAMADO\s+PARA\s+RETIRO/i.test(raw)) return "Programado retiro";

  const key = normalizeKey(raw);
  if (OPERATIONAL_STATE_LABELS[key]) return OPERATIONAL_STATE_LABELS[key];

  if (key.includes("PENDING") && key.includes("GPS")) return "Esperando GPS";
  if (key === "ACTIVE") return "En ruta";

  if (raw.length > 48 && /PROGRAMADO/i.test(raw)) return "Programado retiro";

  if (/^[A-Z0-9_]+$/.test(raw)) return titleCaseWords(raw);
  return raw;
}

type StateSource = Pick<
  OperationalControlContainerRow,
  | "operational_state"
  | "monitoring_status"
  | "status_raw"
  | "operational_phase"
  | "rutafy_status"
  | "phase"
>;

export function resolveOperationalStateLabel(row: StateSource): string {
  const candidates = [
    row.operational_state,
    row.monitoring_status,
    row.status_raw,
    row.operational_phase,
    row.rutafy_status,
    row.phase,
  ];
  for (const c of candidates) {
    const label = humanizeOperationalStateValue(c);
    if (label) return label;
  }
  return "Sin estado";
}

function mapPointCode(
  point?: { code?: string | null; label?: string | null } | null,
): string | null {
  if (!point) return null;
  return point.code?.trim() || point.label?.trim() || null;
}

function mapPointCity(point?: { city?: string | null; label?: string | null } | null): string | null {
  if (!point) return null;
  return point.city?.trim() || null;
}

type PortSource = Pick<
  OperationalControlContainerRow,
  | "confirmed_port_code"
  | "declared_port_code"
  | "declared_port"
  | "confirmed_port_city"
  | "declared_port_city"
>;

export function resolvePortDisplay(row: PortSource, map?: OperationalControlMapData | null): PortDisplay {
  const code =
    row.confirmed_port_code?.trim() ||
    row.declared_port_code?.trim() ||
    row.declared_port?.trim() ||
    mapPointCode(map?.confirmed_port) ||
    mapPointCode(map?.declared_port) ||
    null;

  const city =
    row.confirmed_port_city?.trim() ||
    row.declared_port_city?.trim() ||
    mapPointCity(map?.confirmed_port) ||
    mapPointCity(map?.declared_port) ||
    null;

  return { code: code || "Sin puerto", city };
}

type DestinationSource = Pick<
  OperationalControlContainerRow,
  "destination_code" | "declared_destination_code" | "destination" | "destination_city"
>;

export function formatDestinationLabel(code?: string | null, city?: string | null): string {
  const raw = code?.trim();
  if (!raw) return city?.trim() || "Sin destino";

  if (/^CDR_/i.test(raw)) {
    const place = raw.replace(/^CDR_/i, "").replace(/_/g, " ").trim();
    const formatted = place ? titleCaseWords(place) : "";
    return formatted ? `CDR ${formatted}` : "CDR";
  }

  const formatted = raw.includes("_") ? titleCaseWords(raw) : raw;
  const c = city?.trim();
  return c && !formatted.toLowerCase().includes(c.toLowerCase())
    ? `${formatted} · ${c}`
    : formatted;
}

export function resolveDestinationLabel(
  row: DestinationSource,
  map?: OperationalControlMapData | null,
): string {
  const code =
    row.destination_code?.trim() ||
    row.declared_destination_code?.trim() ||
    row.destination?.trim() ||
    mapPointCode(map?.destination) ||
    null;

  const city = row.destination_city?.trim() || mapPointCity(map?.destination) || null;
  return formatDestinationLabel(code, city);
}

type EtaSource = Pick<
  OperationalControlContainerRow,
  "eta" | "window_end_at" | "scheduled_at"
>;

export function resolveEtaDisplay(
  row: EtaSource,
  options?: { detailEta?: string | null; now?: number },
): EtaDisplay {
  const now = options?.now ?? Date.now();
  const detailEta = options?.detailEta?.trim();

  let iso = detailEta || row.eta?.trim() || row.window_end_at?.trim() || null;
  let isWeakFallback = false;

  if (!iso && row.scheduled_at?.trim()) {
    iso = row.scheduled_at.trim();
    isWeakFallback = true;
  }

  if (!iso) {
    return { timeLabel: "Sin ETA", subLabel: "", isExpired: false, isWeakFallback: false };
  }

  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return {
      timeLabel: iso,
      subLabel: isWeakFallback ? "programado" : "estimado",
      isExpired: false,
      isWeakFallback,
    };
  }

  const isExpired = ms < now;
  const timeLabel = new Date(ms).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });

  let subLabel: string;
  if (isExpired) {
    subLabel = isWeakFallback ? "Retrasado" : "ETA vencido";
  } else {
    subLabel = isWeakFallback ? "programado" : "estimado";
  }

  return { timeLabel, subLabel, isExpired, isWeakFallback };
}

export function formatScheduledLabel(iso?: string | null): string {
  return formatTimeLabel(iso, "Sin programación");
}

export function formatTimeLabel(iso?: string | null, emptyLabel = "Sin hora"): string {
  if (iso == null || String(iso).trim() === "") return emptyLabel;
  const ms = Date.parse(String(iso));
  if (!Number.isFinite(ms)) return String(iso);
  return new Date(ms).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function resolveDetailOperationalState(detail: OperationalControlContainerDetail): string {
  return resolveOperationalStateLabel({
    operational_state: null,
    monitoring_status: null,
    status_raw: null,
    operational_phase: detail.phase,
    rutafy_status: detail.rutafy_status,
    phase: detail.phase,
  });
}

export function resolveDetailEtaDisplay(detail: OperationalControlContainerDetail): EtaDisplay {
  const detailEta =
    detail.current_monitoring?.eta?.trim() || detail.observed_truth.eta_at?.trim() || null;
  return resolveEtaDisplay(
    {
      eta: detailEta,
      window_end_at: null,
      scheduled_at: detail.declared_truth.scheduled_time,
    },
    { detailEta },
  );
}
