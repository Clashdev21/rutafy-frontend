import { useMemo } from "react";

export type OperationalPhase =
  | "IDLE"
  | "SEARCHING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

/** Servicio mínimo: solo se usa `status` para derivar la fase. */
export type TransportistaServiceLike = {
  status?: string | null;
};

export type UseTransportistaOperationalStateResult<T extends TransportistaServiceLike> = {
  operationalPhase: OperationalPhase;
  activeService: T | null;
  isIdle: boolean;
  isSearching: boolean;
  isAssigned: boolean;
  isInProgress: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
};

const SEARCHING_STATUSES = new Set<string>([
  "REQUESTED",
  "OFFERED",
  "PENDING",
  "SEARCHING",
]);

const CANCELLED_STATUSES = new Set<string>([
  "CANCELLED_BY_SYSTEM",
  "CANCELLED_BY_TRANSPORTISTA",
  "CANCELLED_BY_MESSENGER",
  "EXPIRED",
  "FAILED",
  "FAILED_PICKUP",
  "FAILED_DROPOFF",
  "NO_SHOW",
]);

function normalizeStatus(status: unknown): string {
  return String(status ?? "")
    .trim()
    .toUpperCase();
}

function resolveOperationalPhase<T extends TransportistaServiceLike>(
  activeService: T | null
): OperationalPhase {
  if (activeService == null) return "IDLE";

  const s = normalizeStatus(activeService.status);

  if (CANCELLED_STATUSES.has(s)) return "CANCELLED";
  if (s === "CLOSED") return "COMPLETED";
  if (s === "STARTED") return "IN_PROGRESS";
  if (s === "CLAIMED") return "ASSIGNED";
  if (SEARCHING_STATUSES.has(s)) return "SEARCHING";

  // Estado no contemplado explícitamente: se trata como búsqueda / pre-asignación operativa.
  return "SEARCHING";
}

/**
 * Deriva una fase operativa tipo ride-hailing a partir del servicio activo
 * que ya calcula el panel (p. ej. prioridad STARTED → CLAIMED → OFFERED → REQUESTED).
 *
 * `myServices` se incluye en la firma para estabilidad de API y dependencias;
 * la fase se resuelve únicamente desde `activeService` según reglas de producto.
 */
export function useTransportistaOperationalState<T extends TransportistaServiceLike>(
  myServices: readonly T[],
  activeService: T | null
): UseTransportistaOperationalStateResult<T> {
  return useMemo(() => {
    const operationalPhase = resolveOperationalPhase(activeService);

    return {
      operationalPhase,
      activeService,
      isIdle: operationalPhase === "IDLE",
      isSearching: operationalPhase === "SEARCHING",
      isAssigned: operationalPhase === "ASSIGNED",
      isInProgress: operationalPhase === "IN_PROGRESS",
      isCompleted: operationalPhase === "COMPLETED",
      isCancelled: operationalPhase === "CANCELLED",
    };
  }, [myServices, activeService]);
}
