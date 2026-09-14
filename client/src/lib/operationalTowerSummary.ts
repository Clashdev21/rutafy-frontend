import type { OperationalControlContainerRow } from "@/api/operational-control";
import type { OperationalDigitalTwin } from "@/api/operational-digital-twin";
import { isPortIngressPhase, normalizeOperationalPhaseCode } from "@/lib/operationalTwinContract";
import {
  resolveDrawerRiskPresentation,
  type ContainerLiveState,
} from "@/lib/operationalTwinUx";

export type TowerSummaryMetrics = {
  totalOperations: number;
  visibleOperations: number;
  inPort: number;
  inRoute: number;
  atCdr: number;
  attention: number;
};

export function formatTowerOperationsHeadline(
  visibleOperations: number,
  totalOperations: number,
): string {
  if (visibleOperations === totalOperations) {
    return `${totalOperations} operaciones`;
  }
  return `${visibleOperations} de ${totalOperations} operaciones`;
}

/** Modern port ingress codes + explicit inside_port. */
export function isSummaryInPort(state: ContainerLiveState): boolean {
  if (isPortIngressPhase(state.operationalPhaseCode)) return true;
  if (state.twin?.observed_truth.inside_port === true) return true;
  return false;
}

/** Explicit CDR arrival/presence only — never destination name alone. */
export function isSummaryAtCdr(state: ContainerLiveState): boolean {
  const phase = normalizeOperationalPhaseCode(state.operationalPhaseCode);
  if (phase === "AT_CDR" || phase === "CDR") return true;

  const cdr = state.cdrElapsed;
  if (cdr) {
    const status = String(cdr.status ?? "")
      .trim()
      .toLowerCase();
    if (status === "arrived" || status === "at_cdr" || status === "in_cdr" || status === "present") {
      return true;
    }
    if (cdr.arrived_at?.trim()) return true;
  }

  for (const p of state.journeyPhases) {
    const key = normalizeOperationalPhaseCode(p.key);
    if ((key === "AT_CDR" || key === "CDR") && p.current) return true;
  }

  const progressStep = normalizeOperationalPhaseCode(
    state.twin?.journey_progress?.current_step ?? null,
  );
  if (progressStep === "AT_CDR" || progressStep === "CDR") return true;

  return false;
}

/**
 * Conservative en-ruta: only clear transit / exit-port signals.
 * Never count port or CDR; never invent from destination labels.
 */
export function isSummaryInRoute(state: ContainerLiveState): boolean {
  if (isSummaryInPort(state) || isSummaryAtCdr(state)) return false;

  const phase = normalizeOperationalPhaseCode(state.operationalPhaseCode);
  if (
    phase === "IN_TRANSIT" ||
    phase === "ON_ROUTE" ||
    phase === "EXIT_PORT" ||
    phase === "LEFT_PORT"
  ) {
    return true;
  }

  for (const p of state.journeyPhases) {
    const key = normalizeOperationalPhaseCode(p.key);
    if ((key === "IN_TRANSIT" || key === "TRANSIT") && p.current) return true;
  }

  return false;
}

/**
 * Aligns with drawer 3C.5G.2 via structured `requiresOperationalAttention`
 * (negatives / operational alerts / critical) — not UI copy.
 * GPS OFFLINE/STALE alone does not elevate.
 */
export function needsOperationalAttention(
  row: OperationalControlContainerRow,
  twin?: OperationalDigitalTwin | null,
): boolean {
  return resolveDrawerRiskPresentation(row, twin).requiresOperationalAttention;
}

export function needsOperationalAttentionFromState(state: ContainerLiveState): boolean {
  return needsOperationalAttention(state.row, state.twin);
}

export function computeTowerSummaryMetrics(
  totalStates: ContainerLiveState[],
  visibleStates: ContainerLiveState[],
): TowerSummaryMetrics {
  let inPort = 0;
  let inRoute = 0;
  let atCdr = 0;
  let attention = 0;

  for (const s of visibleStates) {
    if (isSummaryInPort(s)) inPort += 1;
    else if (isSummaryAtCdr(s)) atCdr += 1;
    else if (isSummaryInRoute(s)) inRoute += 1;

    if (needsOperationalAttentionFromState(s)) attention += 1;
  }

  return {
    totalOperations: totalStates.length,
    visibleOperations: visibleStates.length,
    inPort,
    inRoute,
    atCdr,
    attention,
  };
}
