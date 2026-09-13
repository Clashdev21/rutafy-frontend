import type { OperationalControlContainerRow } from "@/api/operational-control";
import type {
  OperationalCdrElapsed,
  OperationalDigitalTwin,
  OperationalInsidePortElapsed,
  OperationalJourneyPhase,
  OperationalRouteNode,
  OperationalStationaryTime,
} from "@/api/operational-digital-twin";
import { resolveEtaDisplay, resolveOperationalStateLabel } from "@/lib/operationalControlDisplay";
import { deriveRiskBand, type RiskBand } from "@/lib/operationalControlUx";
import {
  isAtGatePhase,
  isPortIngressPhase,
  journeyLiveToPhases,
  journeyTrackingModeLabel,
  resolveOperationalPhaseLabel,
  resolveTechnicalGpsStatus,
} from "@/lib/operationalTwinContract";

export type RiskPresentation = {
  band: RiskBand;
  emoji: string;
  label: string;
  reasons: string[];
};

export type JourneyPhaseUi = {
  key: string;
  label: string;
  completed: boolean;
  current: boolean;
};

export type RouteNodeUi = {
  id: string;
  name: string;
  isCurrent: boolean;
  isDestination?: boolean;
};

export type ContainerLiveState = {
  container_id: string;
  container_label: string;
  row: OperationalControlContainerRow;
  twin: OperationalDigitalTwin | null;
  progressPercent: number;
  /** Microestado operacional (current_phase_label). */
  phaseLabel: string;
  /** Código micro (current_phase), p.ej. AT_GATE. */
  operationalPhaseCode: string | null;
  /** Lifecycle macro del Journey (journey_current_state). Nunca colapsar con phase. */
  journeyState: string | null;
  journeyCurrentLeg: number | null;
  journeyCorridorCode: string | null;
  journeyTrackingMode: string | null;
  journeyTrackingModeLabel: string | null;
  /** @deprecated alias de phaseLabel para compat; no usar como macro. */
  stateLabel: string;
  locationLabel: string;
  currentNodeName: string;
  nextNodeName: string;
  minutesToNext: string | null;
  etaHero: string;
  etaSubLabel: string;
  etaExpired: boolean;
  etaSource: "ia" | "gps" | "programacion";
  corridorName: string | null;
  risk: RiskPresentation;
  journeyPhases: JourneyPhaseUi[];
  routeNodes: RouteNodeUi[];
  timeline: Array<{ at?: string | null; title: string; detail?: string | null }>;
  technicalGpsStatus: string | null;
  insidePortElapsed: OperationalInsidePortElapsed | null;
  cdrElapsed: OperationalCdrElapsed | null;
  stationaryTime: OperationalStationaryTime | null;
  heartbeatKey: string;
};

const DEFAULT_JOURNEY_PHASES = [
  { key: "scheduled", label: "Programado" },
  { key: "port", label: "Puerto" },
  { key: "module", label: "Módulo" },
  { key: "transit", label: "Tránsito" },
  { key: "cdr", label: "CDR" },
] as const;

const NODE_ALIASES: Record<string, string> = {
  BV_YUMBO: "Yumbo",
  CDR_YUMBO: "CDR Yumbo",
  SPIA: "SPIA",
  SPB: "SPB",
  TCBUEN: "Buenaventura",
  VIJES: "Vijes",
  CORDOBA: "Córdoba",
  ZARAGOZA: "Zaragoza",
  CISNEROS: "Cisneros",
  LOBOGUERRERO: "Loboguerrero",
};

function titleCase(value: string): string {
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function humanizeNodeName(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return "Sin ubicación";

  const upper = raw.toUpperCase();
  if (NODE_ALIASES[upper]) return NODE_ALIASES[upper];

  if (/^CDR_/i.test(raw)) {
    const place = raw.replace(/^CDR_/i, "").replace(/_/g, " ");
    return place ? `CDR ${titleCase(place)}` : "CDR";
  }

  if (/^BV_/i.test(raw)) return titleCase(raw.replace(/^BV_/i, ""));
  if (/^INGRESANDO\s+A/i.test(raw)) return titleCase(raw);
  if (/^[A-Z0-9_]+$/.test(raw)) return titleCase(raw);
  return raw;
}

export function formatEtaHero(iso?: string | null): string {
  if (!iso?.trim()) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatMinutesToNext(value?: number | string | null): string | null {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n < 1) return "menos de 1 min";
  return `${Math.round(n)} min`;
}

export function minutesUntil(iso?: string | null, now = Date.now()): string | null {
  if (!iso?.trim()) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const diff = Math.round((ms - now) / 60_000);
  if (diff <= 0) return null;
  return formatMinutesToNext(diff);
}

export function resolveRiskPresentation(
  row: OperationalControlContainerRow,
  twin?: OperationalDigitalTwin | null,
): RiskPresentation {
  const band = deriveRiskBand(row);
  const reasons: string[] = [];

  const twinReasons = twin?.risk?.reasons ?? [];
  const alerts = [...(twin?.alerts ?? []), ...(row.alerts ?? []), ...twinReasons];

  for (const a of alerts) {
    const lower = a.toLowerCase();
    if (/gps|offline|señal/.test(lower) && !reasons.includes("GPS perdido")) {
      reasons.push("GPS perdido");
    } else if (/eta|vencid/.test(lower) && !reasons.includes("ETA vencido")) {
      reasons.push("ETA vencido");
    } else if (/delay|retraso/.test(lower) && !reasons.includes("Retraso")) {
      reasons.push("Retraso");
    } else if (/congest|tráfico|traffic/.test(lower) && !reasons.includes("Congestión")) {
      reasons.push("Congestión");
    }
  }

  if (band === "critical" || band === "delayed") {
    if (reasons.length === 0) reasons.push("Retraso");
  }

  if (band === "critical") {
    return { band, emoji: "🔴", label: "Riesgo", reasons };
  }
  if (band === "delayed" || band === "upcoming" || reasons.length > 0) {
    return { band, emoji: "🟡", label: "Atención", reasons };
  }
  return { band, emoji: "🟢", label: "Normal", reasons };
}

function derivePhaseLabel(twin: OperationalDigitalTwin | null, row: OperationalControlContainerRow): string {
  if (twin?.current_phase || twin?.current_phase_label) {
    return resolveOperationalPhaseLabel(twin.current_phase, twin.current_phase_label).toUpperCase();
  }
  return resolveOperationalStateLabel(row).toUpperCase();
}

function deriveJourneyPhases(
  percent: number,
  twin: OperationalDigitalTwin | null,
  phases?: OperationalJourneyPhase[],
): JourneyPhaseUi[] {
  const fromLive = journeyLiveToPhases(twin?.journey_live);
  if (fromLive.length > 0) {
    return fromLive.map((p) => ({
      key: p.key,
      label: p.label,
      completed: Boolean(p.completed),
      current: Boolean(p.current),
    }));
  }

  if (phases && phases.length > 0) {
    return phases.map((p) => ({
      key: p.key,
      label: p.label,
      completed: Boolean(p.completed),
      current: Boolean(p.current),
    }));
  }

  const p = Math.min(100, Math.max(0, percent));
  const thresholds = [0, 20, 40, 60, 80, 100];
  return DEFAULT_JOURNEY_PHASES.map((phase, index) => {
    const start = thresholds[index];
    const end = thresholds[index + 1];
    const completed = p >= end;
    const current = p >= start && p < end;
    return { ...phase, completed, current };
  });
}

function deriveRouteNodes(
  twin: OperationalDigitalTwin | null,
  row: OperationalControlContainerRow,
): RouteNodeUi[] {
  const nodes: RouteNodeUi[] = [];
  const currentCode =
    twin?.current_node_label ||
    twin?.observed_truth.current_node_code ||
    twin?.journey_progress?.current_step;

  const pushNode = (name: string, isCurrent = false, isDestination = false) => {
    const id = `${name}-${nodes.length}`;
    if (nodes.some((n) => n.name === name)) return;
    nodes.push({ id, name: humanizeNodeName(name), isCurrent, isDestination });
  };

  if (twin?.route_nodes?.length) {
    for (const n of twin.route_nodes) {
      const name = n.label || n.name || n.code || "";
      pushNode(name, Boolean(n.is_current), Boolean(n.is_destination));
    }
    return nodes;
  }

  const port = twin?.declared_truth.port_code || row.declared_port_code || row.declared_port;
  const dest =
    twin?.declared_truth.destination_code || row.destination_code || row.destination;

  if (port) pushNode(port);
  if (twin?.map.polyline?.length) {
    for (const pt of twin.map.polyline) {
      if (pt.label) pushNode(pt.label);
    }
  }
  if (twin?.timeline?.length) {
    for (const ev of twin.timeline) {
      if (ev.title) pushNode(ev.title);
    }
  }
  if (currentCode) {
    const human = humanizeNodeName(currentCode);
    const idx = nodes.findIndex((n) => n.name === human);
    if (idx >= 0) nodes[idx].isCurrent = true;
    else pushNode(currentCode, true);
  }
  if (dest) pushNode(dest, false, true);

  if (nodes.length === 0) {
    pushNode(port || "Puerto");
    pushNode(currentCode || "En ruta", true);
    pushNode(dest || "CDR", false, true);
  }

  return nodes;
}

export function buildContainerLiveState(
  row: OperationalControlContainerRow,
  twin: OperationalDigitalTwin | null,
): ContainerLiveState {
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(twin?.journey_progress?.percent ?? deriveProgressFromRow(row))),
  );

  const currentNodeName = humanizeNodeName(
    twin?.current_location?.name ||
      twin?.current_node_label ||
      twin?.observed_truth.current_node_code ||
      twin?.current_location?.node_code ||
      twin?.journey_progress?.current_step ||
      row.declared_port,
  );

  const nextNodeName = humanizeNodeName(
    twin?.next_node_label ||
      twin?.next_expected_step?.label ||
      twin?.journey_progress?.next_step ||
      twin?.inferred_truth.next_expected_event ||
      row.destination,
  );

  const etaIso =
    twin?.eta ||
    twin?.inferred_truth.expected_arrival_cdr ||
    row.eta ||
    row.window_end_at ||
    row.scheduled_at;

  const etaDisplay = resolveEtaDisplay(
    { eta: etaIso, window_end_at: row.window_end_at, scheduled_at: row.scheduled_at },
    { detailEta: twin?.eta },
  );

  const technicalGps = resolveTechnicalGpsStatus(twin);
  const etaSource: ContainerLiveState["etaSource"] = twin?.eta
    ? "ia"
    : technicalGps?.toUpperCase() === "ONLINE" || row.gps_status?.toUpperCase() === "ONLINE"
      ? "gps"
      : "programacion";

  const minutesToNext =
    formatMinutesToNext(twin?.minutes_to_next) ||
    minutesUntil(twin?.next_expected_step?.eta ?? twin?.eta) ||
    minutesUntil(etaIso);

  const phaseLabel = derivePhaseLabel(twin, row);
  const operationalPhaseCode = twin?.current_phase?.trim() || null;
  const journeyState = twin?.journey_current_state?.trim() || null;
  const journeyTrackingMode = twin?.journey_tracking_mode
    ? String(twin.journey_tracking_mode).trim()
    : null;

  const heartbeatKey = [
    progressPercent,
    phaseLabel,
    journeyState,
    currentNodeName,
    nextNodeName,
    etaHeroFromDisplay(etaDisplay.timeLabel, etaIso),
    twin?.gps_last_seen_at ?? row.gps_last_seen_at,
  ].join("|");

  return {
    container_id: row.container_id,
    container_label: row.container_label?.trim() || row.container_id,
    row,
    twin,
    progressPercent,
    phaseLabel,
    operationalPhaseCode,
    journeyState,
    journeyCurrentLeg:
      twin?.journey_current_leg != null && Number.isFinite(twin.journey_current_leg)
        ? twin.journey_current_leg
        : null,
    journeyCorridorCode: twin?.journey_corridor_code?.trim() || null,
    journeyTrackingMode,
    journeyTrackingModeLabel: journeyTrackingModeLabel(journeyTrackingMode),
    stateLabel: phaseLabel,
    locationLabel: `${currentNodeName} → ${nextNodeName}`,
    currentNodeName,
    nextNodeName,
    minutesToNext,
    etaHero: etaHeroFromDisplay(etaDisplay.timeLabel, etaIso),
    etaSubLabel: etaDisplay.subLabel || (etaSource === "ia" ? "estimado" : ""),
    etaExpired: etaDisplay.isExpired,
    etaSource,
    corridorName: twin?.corridor_name ?? twin?.journey_corridor_code ?? null,
    risk: resolveRiskPresentation(row, twin),
    journeyPhases: deriveJourneyPhases(progressPercent, twin, twin?.journey_phases),
    routeNodes: deriveRouteNodes(twin, row),
    timeline: twin?.timeline?.length
      ? twin.timeline.map((e) => ({ at: e.at, title: e.title, detail: e.detail }))
      : [],
    technicalGpsStatus: technicalGps,
    insidePortElapsed: twin?.inside_port_elapsed ?? null,
    cdrElapsed: twin?.cdr_elapsed ?? null,
    stationaryTime: twin?.stationary_time ?? null,
    heartbeatKey,
  };
}

function etaHeroFromDisplay(timeLabel: string, iso?: string | null): string {
  if (timeLabel === "Sin ETA") return "—";
  if (iso) return formatEtaHero(iso);
  return timeLabel;
}

function deriveProgressFromRow(row: OperationalControlContainerRow): number {
  const band = deriveRiskBand(row);
  if (band === "completed") return 100;
  const status = String(row.rutafy_status ?? row.operational_state ?? "").toUpperCase();
  if (status.includes("FINAL")) return 100;
  if (status.includes("RUTA") || status.includes("ACTIVE")) return 72;
  if (status.includes("PUERTO")) return 48;
  if (status.includes("GPS")) return 24;
  return 12;
}

export function mergeLiveStatesForAnimation(
  prev: ContainerLiveState[],
  next: ContainerLiveState[],
): ContainerLiveState[] {
  const prevMap = new Map(prev.map((s) => [s.container_id, s]));
  return next.map((item) => {
    const old = prevMap.get(item.container_id);
    if (!old) return item;
    if (old.heartbeatKey === item.heartbeatKey) return old;
    return item;
  });
}

export function computeTowerKpis(states: ContainerLiveState[], activeCount: number) {
  let inPort = 0;
  let inTransit = 0;
  let atRisk = 0;
  const etaMinutes: number[] = [];
  const now = Date.now();

  for (const s of states) {
    const phase = s.phaseLabel;
    if (
      isAtGatePhase(s.operationalPhaseCode) ||
      isPortIngressPhase(s.operationalPhaseCode) ||
      /PUERTO|PORT|SPIA|SPB|TCBUEN|INGRESO/i.test(phase) ||
      s.twin?.observed_truth.inside_port
    ) {
      inPort += 1;
    } else if (/TRÁNSITO|TRANSITO|RUTA|VIJES|CORREDOR/i.test(phase)) {
      inTransit += 1;
    }
    if (s.risk.band === "critical" || s.risk.band === "delayed" || s.risk.reasons.length > 0) {
      atRisk += 1;
    }
    const iso = s.twin?.eta || s.row.eta;
    if (iso) {
      const ms = Date.parse(iso);
      if (Number.isFinite(ms) && ms > now) {
        etaMinutes.push((ms - now) / 60_000);
      }
    }
  }

  const avgEta =
    etaMinutes.length > 0
      ? `${Math.round(etaMinutes.reduce((a, b) => a + b, 0) / etaMinutes.length)} min`
      : "—";

  return {
    active: activeCount,
    inPort,
    inTransit,
    atRisk,
    avgEta,
  };
}

export function isInPortState(s: ContainerLiveState): boolean {
  return (
    isAtGatePhase(s.operationalPhaseCode) ||
    isPortIngressPhase(s.operationalPhaseCode) ||
    /PUERTO|PORT|SPIA|SPB|INGRESO/i.test(s.phaseLabel) ||
    Boolean(s.twin?.observed_truth.inside_port)
  );
}

export function isInTransitState(s: ContainerLiveState): boolean {
  return /TRÁNSITO|TRANSITO|RUTA|VIJES|CORREDOR|CDR/i.test(s.phaseLabel);
}
