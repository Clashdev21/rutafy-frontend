import { buildRutafyRealtimeWebSocketUrl } from "@/lib/messengerRealtimeWs";
import type { OperationalGeofenceState } from "@/lib/resolveOperationalCopy";
import { useEffect, useMemo, useRef, useState } from "react";

export type UseTransportistaRealtimeParams = {
  enabled: boolean;
  token: string | null;
  activeServiceId: string | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeGeofenceServiceStatus(status: unknown): string {
  return String(status ?? "")
    .trim()
    .toUpperCase();
}

function resolvePersistedGeofenceState(
  state: unknown,
  serviceStatus: unknown,
): OperationalGeofenceState | null {
  const normalizedState = String(state ?? "")
    .trim()
    .toUpperCase();
  const normalizedStatus = normalizeGeofenceServiceStatus(serviceStatus);

  if (normalizedState === "AT_PICKUP" && normalizedStatus === "CLAIMED") {
    return "AT_PICKUP";
  }
  if (normalizedState === "AT_DROPOFF" && normalizedStatus === "STARTED") {
    return "AT_DROPOFF";
  }
  return null;
}

export function useTransportistaRealtime({
  enabled,
  token,
  activeServiceId,
}: UseTransportistaRealtimeParams) {
  const [geofenceByServiceId, setGeofenceByServiceId] = useState<
    Record<string, OperationalGeofenceState>
  >({});
  const [reconnectVersion, setReconnectVersion] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  const activeGeofenceState = useMemo((): OperationalGeofenceState | null => {
    const sid = activeServiceId?.trim();
    if (!sid) return null;
    return geofenceByServiceId[sid] ?? null;
  }, [activeServiceId, geofenceByServiceId]);

  useEffect(() => {
    if (activeServiceId != null && String(activeServiceId).trim() !== "") return;
    setGeofenceByServiceId({});
  }, [activeServiceId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onLogout = () => {
      setGeofenceByServiceId({});
    };
    const onTokenRefreshed = () => {
      setReconnectVersion((v) => v + 1);
    };

    window.addEventListener("auth:logout", onLogout);
    window.addEventListener("auth:token-refreshed", onTokenRefreshed);
    return () => {
      window.removeEventListener("auth:logout", onLogout);
      window.removeEventListener("auth:token-refreshed", onTokenRefreshed);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const shutdown = () => {
      const w = wsRef.current;
      if (w && (w.readyState === WebSocket.OPEN || w.readyState === WebSocket.CONNECTING)) {
        w.close();
      }
      wsRef.current = null;
      setGeofenceByServiceId({});
    };

    if (!enabled) {
      shutdown();
      return;
    }

    const trimmedToken = token?.trim() ?? "";
    if (!trimmedToken) {
      shutdown();
      return;
    }

    const wsUrl = buildRutafyRealtimeWebSocketUrl(trimmedToken);
    if (!wsUrl) {
      shutdown();
      return;
    }

    shutdown();

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn("[transportista-realtime] WebSocket init failed", e);
      }
      return;
    }

    wsRef.current = ws;

    const applyGeofenceUpdated = (payload: Record<string, unknown>) => {
      const serviceId = String(payload.service_id ?? payload.serviceId ?? "").trim();
      if (!serviceId) return;

      const persisted = resolvePersistedGeofenceState(
        payload.state,
        payload.service_status ?? payload.serviceStatus,
      );

      setGeofenceByServiceId((prev) => {
        if (persisted == null) {
          if (!(serviceId in prev)) return prev;
          const next = { ...prev };
          delete next[serviceId];
          return next;
        }
        if (prev[serviceId] === persisted) return prev;
        return { ...prev, [serviceId]: persisted };
      });
    };

    const onMessage = (ev: MessageEvent) => {
      try {
        const raw = typeof ev.data === "string" ? ev.data : "";
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        const candidates: unknown[] = [parsed];
        if (isObject(parsed) && parsed.data != null && typeof parsed.data === "object") {
          candidates.push(parsed.data);
        }

        for (const item of candidates) {
          if (!isObject(item)) continue;
          const o = item;

          const eventType = String(o.type ?? o.event ?? "").trim();

          if (eventType === "geofence.updated") {
            const payload = isObject(o.data) ? o.data : o;
            applyGeofenceUpdated(payload);
            break;
          }

          if (
            !eventType &&
            (o.service_id != null || o.serviceId != null) &&
            o.state != null
          ) {
            applyGeofenceUpdated(o);
            break;
          }
        }
      } catch {
        /* mensaje no JSON o formato inesperado */
      }
    };

    ws.addEventListener("message", onMessage);

    return () => {
      ws.removeEventListener("message", onMessage);
      if (wsRef.current === ws) {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
        wsRef.current = null;
      }
      setGeofenceByServiceId({});
    };
  }, [enabled, token, reconnectVersion]);

  return { activeGeofenceState, geofenceByServiceId };
}
