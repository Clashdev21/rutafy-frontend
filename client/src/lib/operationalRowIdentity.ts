import type { OperationalControlContainerRow } from "@/api/operational-control";
import type { ContainerLiveState } from "@/lib/operationalTwinUx";

/**
 * Stable row identity for temporal Control Center lists (3D.4B row_identity=journey_id).
 * Falls back to container_id for legacy rows without journey_id.
 */
export function operationalRowIdentity(
  row: Pick<OperationalControlContainerRow, "journey_id" | "container_id"> | null | undefined,
): string {
  const journey = row?.journey_id?.trim();
  if (journey) return journey;
  return String(row?.container_id ?? "").trim();
}

export function liveStateRowIdentity(state: ContainerLiveState): string {
  return operationalRowIdentity(state.row);
}

/** Keep liveStates that match allowed row identities (journey-first). */
export function filterLiveStatesByRowIdentity(
  liveStates: ContainerLiveState[],
  allowedRows: OperationalControlContainerRow[],
): ContainerLiveState[] {
  const allowed = new Set(allowedRows.map((r) => operationalRowIdentity(r)));
  return liveStates.filter((s) => allowed.has(liveStateRowIdentity(s)));
}
