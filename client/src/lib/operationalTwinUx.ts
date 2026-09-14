import type { OperationalControlContainerRow } from "@/api/operational-control";
import type {
  OperationalCdrElapsed,
  OperationalDigitalTwin,
  OperationalInsidePortElapsed,
  OperationalJourneyPhase,
  OperationalStationaryTime,
} from "@/api/operational-digital-twin";
import { operationalEtaAt } from "@/api/operational-digital-twin";
import { resolveEtaDisplay, resolveOperationalStateLabel } from "@/lib/operationalControlDisplay";
import { deriveRiskBand, type RiskBand } from "@/lib/operationalControlUx";
import {
  isAtGatePhase,
  isPortIngressPhase,
  journeyLiveToPhases,
  journeyTrackingModeLabel,
  resolveCorridorLabel,
  resolveEtaSourceKind,
  etaSourceExpiredBadgeLabel,
  resolveNextOperationalStepLabel,
  resolveOperationalEventLabel,
  resolveOperationalPhaseLabel,
  resolveTechnicalGpsStatus,
  type EtaSourceKind,
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
  /** Geographic role for route tab. */
  kind?: "origin" | "corridor" | "destination" | "current_location";
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
  etaSource: EtaSourceKind;
  corridorName: string | null;
  risk: RiskPresentation;
  /** Drawer-only risk (no inventar Retraso; GPS separado). */
  drawerRisk: RiskPresentation;
  activeAlerts: string[];
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
  CDR_YUMBO: "CDR Yumbo",
  SPIA: "SPIA",
  SPIA_GATE: "SPIA Entrada/Salida",
  SPB: "SPB",
  TCBUEN: "Buenaventura",
  VIJES: "Vijes",
  CORDOBA: "Córdoba",
  ZARAGOZA: "Zaragoza",
  CISNEROS: "Cisneros",
  LOBOGUERRERO: "Loboguerrero",
};

const NON_GEOGRAPHIC_ROUTE_CODES = new Set([
  "GPS_LOST",
  "GPS_OFFLINE",
  "TRACKING_STARTED",
  "DISPATCH_CREATED",
  "DISPATCHED",
  "UNKNOWN",
  "COMPLETED",
  "DONE",
  "PENDING",
  "CURRENT",
]);

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

  const upper = raw.toUpperCase().replace(/\s+/g, "_");
  if (NODE_ALIASES[upper]) return NODE_ALIASES[upper];

  if (/^CDR_/i.test(raw)) {
    const place = raw.replace(/^CDR_/i, "").replace(/_/g, " ");
    return place ? `CDR ${titleCase(place)}` : "CDR";
  }

  if (/^BV_/i.test(raw)) return resolveCorridorLabel(raw, null) ?? titleCase(raw.replace(/^BV_/i, ""));
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

/** Tower-compatible risk presentation (unchanged band engine). */
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

/**
 * Drawer risk: do not invent "Retraso"; do not treat timeline GPS_LOST as active alert.
 * Does not rewrite twin.risk.reasons; filters contradictory GPS / NORMAL vs NEGATIVE copy.
 * Row band alone (e.g. GPS OFFLINE → delayed) must not invent a "Retraso" reason.
 */
export function resolveDrawerRiskPresentation(
  row: OperationalControlContainerRow,
  twin?: OperationalDigitalTwin | null,
): { risk: RiskPresentation; activeAlerts: string[] } {
  const band = deriveRiskBand(row);
  const technical = resolveTechnicalGpsStatus(twin)?.toUpperCase() ?? "";
  const twinReasons = twin?.risk?.reasons ?? [];
  const rawAlerts = [...(twin?.alerts ?? []), ...(row.alerts ?? [])];

  const activeAlerts: string[] = [];
  const operationalAlerts: string[] = [];
  for (const a of rawAlerts) {
    const lower = a.toLowerCase();
    const code = a.trim().toUpperCase().replace(/\s+/g, "_");
    // Historical event codes alone are not active alerts
    if (code === "GPS_LOST" || code === "UNKNOWN") continue;
    if (/gps|offline|señal/.test(lower)) {
      if (technical === "OFFLINE" || technical === "STALE") {
        const label = "Señal GPS perdida";
        if (!activeAlerts.includes(label)) activeAlerts.push(label);
      }
      continue;
    }
    const human = resolveOperationalEventLabel(a);
    if (!activeAlerts.includes(human)) activeAlerts.push(human);
    if (!operationalAlerts.includes(human)) operationalAlerts.push(human);
  }

  type ReasonKind = "negative" | "normal" | "skip";
  const classify = (r: string): { kind: ReasonKind; display: string } => {
    const lower = r.toLowerCase().trim();
    if (!lower) return { kind: "skip", display: "" };
    // GPS belongs in GPS / alerts blocks — never risk reasons in drawer
    if (/gps|offline|señal/.test(lower)) return { kind: "skip", display: "" };
    if (
      /operaci[oó]n en curso normal|sin retrasos|operaci[oó]n normal|todo normal|sin alerta|sin novedad/.test(
        lower,
      )
    ) {
      return { kind: "normal", display: r.trim() };
    }
    if (/eta|vencid/.test(lower)) return { kind: "negative", display: "ETA vencido" };
    if (/delay|retraso/.test(lower)) return { kind: "negative", display: "Retraso" };
    if (/congest|tr[aá]fico|traffic/.test(lower)) {
      return { kind: "negative", display: "Congestión" };
    }
    if (/riesgo|critical|cr[ií]tico|alto/.test(lower)) {
      return { kind: "negative", display: r.trim() };
    }
    // Unknown operational reason — treat as negative signal for conflict resolution
    return { kind: "negative", display: r.trim() };
  };

  const negatives: string[] = [];
  const normals: string[] = [];
  for (const r of twinReasons) {
    const { kind, display } = classify(r);
    if (kind === "skip" || !display) continue;
    if (kind === "normal") {
      if (!normals.includes(display)) normals.push(display);
    } else if (!negatives.includes(display)) {
      negatives.push(display);
    }
  }

  // If NEGATIVE + NORMAL coexist, keep only NEGATIVE (do not mutate payload).
  const reasons = negatives.length > 0 ? negatives : normals;

  // Operational risk title: GPS alerts and row band alone must NOT elevate.
  let label = "Normal";
  let emoji = "🟢";
  if (band === "critical" || negatives.some((r) => /cr[ií]tico|critical|riesgo/i.test(r))) {
    label = "Riesgo";
    emoji = "🔴";
  } else if (negatives.length > 0 || operationalAlerts.length > 0) {
    label = "Atención";
    emoji = "🟡";
  } else if (normals.length > 0) {
    label = "Normal";
    emoji = "🟢";
  }
  // band delayed/upcoming from GPS OFFLINE alone → stay Normal (GPS shown separately)

  return {
    risk: { band, emoji, label, reasons },
    activeAlerts,
  };
}

function derivePhaseLabel(twin: OperationalDigitalTwin | null, row: OperationalControlContainerRow): string {
  if (twin?.current_phase || twin?.current_phase_label) {
    return resolveOperationalPhaseLabel(twin.current_phase, twin.current_phase_label);
  }
  return resolveOperationalStateLabel(row);
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

function isNonGeographicRouteToken(value: string): boolean {
  const code = value.trim().toUpperCase().replace(/\s+/g, "_");
  if (NON_GEOGRAPHIC_ROUTE_CODES.has(code)) return true;
  if (/GPS|TRACKING|DISPATCH|UNKNOWN|SEÑAL|SENAL/.test(code)) return true;
  return false;
}

/** Geographic route only — never timeline titles. Exported for tests. */
export function deriveRouteNodes(
  twin: OperationalDigitalTwin | null,
  row: OperationalControlContainerRow,
): RouteNodeUi[] {
  const nodes: RouteNodeUi[] = [];

  const pushNode = (
    name: string,
    opts?: { isCurrent?: boolean; isDestination?: boolean; kind?: RouteNodeUi["kind"] },
  ) => {
    const trimmed = name?.trim();
    if (!trimmed) return;
    if (isNonGeographicRouteToken(trimmed)) return;
    const display = humanizeNodeName(trimmed);
    if (nodes.some((n) => n.name === display)) return;
    nodes.push({
      id: `${display}-${nodes.length}`,
      name: display,
      isCurrent: Boolean(opts?.isCurrent),
      isDestination: Boolean(opts?.isDestination),
      kind: opts?.kind,
    });
  };

  if (twin?.route_nodes?.length) {
    for (const n of twin.route_nodes) {
      const name = n.label || n.name || n.code || "";
      if (isNonGeographicRouteToken(name)) continue;
      pushNode(name, {
        isCurrent: Boolean(n.is_current),
        isDestination: Boolean(n.is_destination),
        kind: n.is_destination ? "destination" : undefined,
      });
    }
    if (nodes.length > 0) return nodes;
  }

  const port = twin?.declared_truth.port_code || row.declared_port_code || row.declared_port;
  const dest =
    twin?.declared_truth.destination_code ||
    row.destination_code ||
    row.destination ||
    twin?.map.destination?.label ||
    twin?.map.destination?.code;
  const corridor =
    resolveCorridorLabel(twin?.journey_corridor_code, twin?.corridor_name) ||
    twin?.journey_corridor_code ||
    null;

  if (port) pushNode(String(port), { kind: "origin" });
  if (corridor) pushNode(corridor, { kind: "corridor" });
  if (dest) pushNode(String(dest), { isDestination: true, kind: "destination" });

  // Mark current only when observed location matches an existing geographic node.
  // Do not insert current_location as a new route stop (keeps declared origin intact).
  const observedLabel =
    twin?.current_location?.name?.trim() ||
    humanizeNodeName(twin?.current_location?.node_code) ||
    humanizeNodeName(twin?.observed_truth.current_node_code);
  if (observedLabel && observedLabel !== "Sin ubicación") {
    const idx = nodes.findIndex((n) => n.name === observedLabel);
    if (idx >= 0) nodes[idx].isCurrent = true;
  }

  if (nodes.length === 0) {
    if (port) pushNode(String(port), { kind: "origin" });
    if (dest) pushNode(String(dest), { isDestination: true, kind: "destination" });
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

  const nextNodeName = resolveNextOperationalStepLabel({
    currentPhase: twin?.current_phase,
    nextNodeLabel: twin?.next_node_label,
    nextExpectedStepKey: twin?.next_expected_step?.key,
    nextExpectedStepLabel: twin?.next_expected_step?.label,
    journeyNextStep: twin?.journey_progress?.next_step,
    inferredNextEvent: twin?.inferred_truth.next_expected_event,
    destinationFallback: row.destination,
  });

  const twinEtaAt = operationalEtaAt(twin?.eta);
  const inferredArrival = twin?.inferred_truth.expected_arrival_cdr?.trim() || null;
  const fromInferredOnly = !twinEtaAt && Boolean(inferredArrival);

  const etaIso =
    twinEtaAt ||
    inferredArrival ||
    row.eta?.trim() ||
    row.window_end_at?.trim() ||
    row.scheduled_at?.trim() ||
    null;

  const etaExpiredFromTwin = twin?.eta?.is_expired === true;
  const etaDisplay = resolveEtaDisplay(
    { eta: etaIso, window_end_at: row.window_end_at, scheduled_at: row.scheduled_at },
    { detailEta: etaIso },
  );
  const etaExpired = etaExpiredFromTwin || etaDisplay.isExpired;

  const technicalGps = resolveTechnicalGpsStatus(twin);
  const etaSource = resolveEtaSourceKind({
    eta: twin?.eta ?? null,
    windowEndAt: row.window_end_at,
    scheduledAt: twin?.declared_truth.scheduled_at ?? row.scheduled_at,
    usedIso: etaIso,
    technicalGpsOnline: technicalGps?.toUpperCase() === "ONLINE",
    fromInferredOnly,
  });

  const minutesToNext =
    formatMinutesToNext(twin?.minutes_to_next) ||
    minutesUntil(twin?.next_expected_step?.eta ?? twinEtaAt) ||
    minutesUntil(etaIso);

  const phaseLabel = derivePhaseLabel(twin, row);
  const operationalPhaseCode = twin?.current_phase?.trim() || null;
  const journeyState = twin?.journey_current_state?.trim() || null;
  const journeyTrackingMode = twin?.journey_tracking_mode
    ? String(twin.journey_tracking_mode).trim()
    : null;

  const drawer = resolveDrawerRiskPresentation(row, twin);
  const corridorName =
    resolveCorridorLabel(twin?.journey_corridor_code, twin?.corridor_name) ??
    twin?.corridor_name ??
    null;

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
    etaSubLabel: etaExpired
      ? etaSourceExpiredBadgeLabel(etaSource)
      : etaDisplay.subLabel || "",
    etaExpired,
    etaSource,
    corridorName,
    risk: resolveRiskPresentation(row, twin),
    drawerRisk: drawer.risk,
    activeAlerts: drawer.activeAlerts,
    journeyPhases: deriveJourneyPhases(progressPercent, twin, twin?.journey_phases),
    routeNodes: deriveRouteNodes(twin, row),
    timeline: twin?.timeline?.length
      ? twin.timeline.map((e) => ({
          at: e.at,
          // Historical events must not inherit current_location geography.
          title: resolveOperationalEventLabel(e.title, {
            nodeCode: null,
            nodeName: null,
          }),
          detail: e.detail,
        }))
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
    const iso = operationalEtaAt(s.twin?.eta) || s.row.eta;
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
