import { useAuth } from "@/_core/hooks/useAuth";
import { http } from "@/api/http";
import {
  acceptServiceOffer,
  getActiveOffersByMessenger,
  patchMessengerAvailability,
} from "@/api/services";
import { getToken } from "@/authStorage";
import { buildMessengerRealtimeWebSocketUrl } from "@/lib/messengerRealtimeWs";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export type ServiceStatus =
  | "REQUESTED"
  | "CLAIMED"
  | "STARTED"
  | "CLOSED"
  | "EXPIRED"
  | "CANCELLED_BY_TRANSPORTER"
  | "CANCELLED_BY_MESSENGER"
  | "FAILED_PICKUP"
  | "FAILED_DROPOFF"
  | "NO_SHOW";

export type UiState = "OFFLINE" | "AVAILABLE" | "OFFER" | "ASSIGNED" | "IN_SERVICE";

export interface BackendService {
  service_id: string;
  status: ServiceStatus;
  service_type: string;
  requester_company_id: string;
  mensajero_id: string | null;
  start_code?: string | null;
  close_code?: string | null;
  meta?: Record<string, any> | null;
  origin?: string | null;
  destination?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

type DispatchOfferLike = {
  offer_id?: string;
  id?: string;
  service_id?: string;
  serviceId?: string;
  service?: Partial<BackendService> | null;
  status?: ServiceStatus | string;
  service_type?: string;
  requester_company_id?: string;
  mensajero_id?: string | null;
  origin?: string | null;
  destination?: string | null;
  expires_at?: string | null;
  meta?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
};

export interface ServiceEvidence {
  evidence_id: string;
  service_id: string;
  actor_role: string;
  actor_id: string;
  kind: string;
  file_path: string;
  file_url: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  note: string | null;
  taken_at_client: string | null;
  lat: number | null;
  lng: number | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  retention_until: string;
  is_protected: boolean;
}

function restErrorMessage(error: any, fallback: string): string {
  const d = error?.response?.data;
  if (d && typeof d === "object") {
    const msg = d.error ?? d.detail ?? d.message;
    if (typeof msg === "string" && msg) return msg;
  }
  if (typeof error?.message === "string" && error.message) return error.message;
  return fallback;
}

/** Origen público para URLs absolutas (p. ej. evidencias); alineado con el fallback que antes usaba fetch. */
function getPublicApiOrigin(): string {
  const raw =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env.VITE_RUTAFY_API_BASE === "string"
      ? import.meta.env.VITE_RUTAFY_API_BASE.trim()
      : "";
  if (raw && /^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, "");
  }
  return "https://api.rutafy.app";
}

function buildTraceId(prefix: string) {
  return `T-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function jsonGet<T>(path: string): Promise<T> {
  try {
    const { data } = await http.get<T>(path, {
      headers: { "x-trace-id": buildTraceId("get") },
    });
    return data as T;
  } catch (err: unknown) {
    throw new Error(restErrorMessage(err, "No se pudo consultar el backend"));
  }
}

async function jsonPost<T>(path: string, body: Record<string, any>): Promise<T> {
  try {
    const { data } = await http.post<T>(path, body, {
      headers: { "x-trace-id": buildTraceId("post") },
    });
    return data as T;
  } catch (err: unknown) {
    throw new Error(restErrorMessage(err, "No se pudo procesar la acción"));
  }
}

function getActorId(user: any): string {
  return String(
    user?.actor_id ||
      user?.userId ||
      user?.profile?.id ||
      user?.profileId ||
      user?.uuid ||
      user?.id ||
      ""
  ).trim();
}

/** UUID por formato (hex + guiones), sin validar versión/variante RFC. */
export function isValidUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value.trim()
  );
}

export function buildAbsoluteUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return `${getPublicApiOrigin()}${fileUrl}`;
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

function extractOffersArray(payload: any): DispatchOfferLike[] {
  if (Array.isArray(payload)) return payload as DispatchOfferLike[];
  if (isObject(payload) && Array.isArray(payload.offers)) return payload.offers as DispatchOfferLike[];
  if (isObject(payload) && isObject(payload.data) && Array.isArray(payload.data.offers)) {
    return payload.data.offers as DispatchOfferLike[];
  }
  if (isObject(payload) && Array.isArray(payload.data)) return payload.data as DispatchOfferLike[];
  if (
    isObject(payload) &&
    payload.offer != null &&
    typeof payload.offer === "object" &&
    !Array.isArray(payload.offer)
  ) {
    return [payload.offer as DispatchOfferLike];
  }
  return [];
}

function mapOfferToBackendService(offer: DispatchOfferLike): BackendService | null {
  const nested = isObject(offer.service) ? (offer.service as Partial<BackendService>) : null;
  const serviceId = String(
    nested?.service_id ?? offer.service_id ?? offer.serviceId ?? ""
  ).trim();

  if (!serviceId) return null;

  const status = String(nested?.status ?? offer.status ?? "REQUESTED").toUpperCase() as ServiceStatus;

  return {
    service_id: serviceId,
    status,
    service_type: String(nested?.service_type ?? offer.service_type ?? ""),
    requester_company_id: String(
      nested?.requester_company_id ?? offer.requester_company_id ?? ""
    ),
    mensajero_id: (nested?.mensajero_id ?? offer.mensajero_id ?? null) as string | null,
    start_code: nested?.start_code ?? null,
    close_code: nested?.close_code ?? null,
    meta: (nested?.meta ?? offer.meta ?? null) as Record<string, any> | null,
    origin: (nested?.origin ?? offer.origin ?? null) as string | null,
    destination: (nested?.destination ?? offer.destination ?? null) as string | null,
    expires_at: (nested?.expires_at ?? offer.expires_at ?? null) as string | null,
    created_at: nested?.created_at ?? offer.created_at,
    updated_at: nested?.updated_at ?? offer.updated_at,
  };
}

export function useMessengerOperationalState() {
  const { user, logout, loading } = useAuth();
  const [, setLocation] = useLocation();

  const [isOnline, setIsOnline] = useState(false);
  const [availabilitySyncing, setAvailabilitySyncing] = useState(false);
  const [selectedService, setSelectedService] = useState<BackendService | null>(null);
  const [closePin, setClosePin] = useState("");
  const [validationError, setValidationError] = useState("");

  const [myServices, setMyServices] = useState<BackendService[]>([]);
  const [availableServices, setAvailableServices] = useState<BackendService[]>([]);
  const [offerIdByServiceId, setOfferIdByServiceId] = useState<Record<string, string>>({});

  const [loadingMyServices, setLoadingMyServices] = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [claimingServiceId, setClaimingServiceId] = useState<string | null>(null);
  const [startingServiceId, setStartingServiceId] = useState<string | null>(null);
  const [closingServiceId, setClosingServiceId] = useState<string | null>(null);

  const [manualActorId, setManualActorId] = useState("");
  const [manualMessengerName, setManualMessengerName] = useState("");
  const [manualDocument, setManualDocument] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  const [evidencesByService, setEvidencesByService] = useState<Record<string, ServiceEvidence[]>>(
    {}
  );
  const [loadingEvidenceServiceId, setLoadingEvidenceServiceId] = useState<string | null>(null);
  const [uploadingEvidenceServiceId, setUploadingEvidenceServiceId] = useState<string | null>(null);

  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState<string | null>(null);
  const [evidenceNote, setEvidenceNote] = useState("");
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [showFullQueues, setShowFullQueues] = useState(false);

  const sessionActorIdRaw =
    user?.actor_id != null ? String(user.actor_id).trim() : "";
  const sessionActorId = loading ? "" : sessionActorIdRaw;

  const hasAuthenticatedActor = Boolean(
    sessionActorId.length > 0 && isValidUuid(sessionActorId)
  );

  const authActorId = getActorId(user);

  const actorId = loading
    ? ""
    : hasAuthenticatedActor
      ? sessionActorId
      : manualActorId.trim();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[MensajeroPanel] USER", user, {
        loading,
        sessionActorIdRaw,
        sessionActorId,
        hasAuthenticatedActor,
        actorId,
      });
    }
  }, [
    user,
    loading,
    sessionActorIdRaw,
    sessionActorId,
    hasAuthenticatedActor,
    actorId,
  ]);

  const actorSourceLabel = hasAuthenticatedActor
    ? "sesión (actor_id)"
    : authActorId && isValidUuid(authActorId)
      ? "sesión (derivado)"
      : "manual";

  const effectiveMessengerName = user?.name || manualMessengerName;
  const effectiveMessengerEmail = user?.email || "-";

  const refreshMyServices = useCallback(async (): Promise<BackendService[] | undefined> => {
    if (!actorId || !isValidUuid(actorId)) return undefined;

    setLoadingMyServices(true);
    try {
      const data = await jsonGet<{ services: BackendService[] }>(
        `/v1/services/my?actor_role=mensajero&actor_id=${encodeURIComponent(actorId)}`
      );
      const list = Array.isArray(data?.services) ? data.services : [];
      setMyServices(list);
      return list;
    } catch (error: any) {
      toast.error(error.message || "No se pudieron cargar mis servicios");
      return undefined;
    } finally {
      setLoadingMyServices(false);
    }
  }, [actorId]);

  const refreshAvailableServices = useCallback(async () => {
    if (!isOnline) {
      setAvailableServices([]);
      setOfferIdByServiceId({});
      return;
    }

    if (!actorId || !isValidUuid(actorId)) {
      setAvailableServices([]);
      setOfferIdByServiceId({});
      return;
    }

    setLoadingAvailable(true);
    try {
      const raw = await getActiveOffersByMessenger(actorId);
      const offers = extractOffersArray(raw);

      const nextOfferMap: Record<string, string> = {};
      const mappedServices: BackendService[] = [];

      for (const offer of offers) {
        const mapped = mapOfferToBackendService(offer);
        if (!mapped) continue;

        const offerId = String(offer.offer_id ?? offer.id ?? "").trim();
        if (offerId) {
          nextOfferMap[mapped.service_id] = offerId;
        }

        mappedServices.push(mapped);
      }

      setOfferIdByServiceId(nextOfferMap);
      setAvailableServices(mappedServices);
    } catch (error: any) {
      toast.error(restErrorMessage(error, "No se pudieron cargar las ofertas activas"));
    } finally {
      setLoadingAvailable(false);
    }
  }, [isOnline, actorId]);

  const refreshAvailableServicesRef = useRef(refreshAvailableServices);
  refreshAvailableServicesRef.current = refreshAvailableServices;

  const loadServiceEvidences = useCallback(async (serviceId: string, silent = false) => {
    setLoadingEvidenceServiceId(serviceId);
    try {
      const data = await jsonGet<{ evidences: ServiceEvidence[] }>(
        `/v1/services/${serviceId}/evidences`
      );

      setEvidencesByService((prev) => ({
        ...prev,
        [serviceId]: Array.isArray(data?.evidences) ? data.evidences : [],
      }));
    } catch (error: any) {
      if (!silent) {
        toast.error(error.message || "No se pudieron cargar las evidencias");
      }
      console.error("[MensajeroPanel] Evidences load error", { serviceId, error });
    } finally {
      setLoadingEvidenceServiceId(null);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (actorId && isValidUuid(actorId)) {
      refreshMyServices();
    }
  }, [loading, actorId, refreshMyServices]);

  useEffect(() => {
    if (loading) return;
    if (isOnline) {
      refreshAvailableServices();
    } else {
      setAvailableServices([]);
      setOfferIdByServiceId({});
    }
  }, [loading, isOnline, refreshAvailableServices]);

  useEffect(() => {
    const targetServiceId = selectedService?.service_id;
    if (targetServiceId) {
      loadServiceEvidences(targetServiceId, true);
    }
  }, [selectedService?.service_id, loadServiceEvidences]);

  useEffect(() => {
    if (loading) return;
    if (!isOnline) return;
    if (!actorId || !isValidUuid(actorId)) return;

    const timer = window.setInterval(() => {
      refreshMyServices();
      refreshAvailableServices();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [loading, isOnline, actorId, refreshMyServices, refreshAvailableServices]);

  const wsOfferDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loading) return;
    if (!isOnline) return;
    if (!actorId || !isValidUuid(actorId)) return;

    const token = getToken();
    if (!token) return;

    const wsUrl = buildMessengerRealtimeWebSocketUrl(token);
    if (!wsUrl) return;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn("[messenger-realtime] WebSocket init failed", e);
      }
      return;
    }

    const scheduleOffersRefreshFromRealtime = () => {
      if (wsOfferDebounceRef.current != null) {
        clearTimeout(wsOfferDebounceRef.current);
      }
      wsOfferDebounceRef.current = setTimeout(() => {
        wsOfferDebounceRef.current = null;
        void refreshAvailableServicesRef.current();
      }, 200);
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
          const o = item as Record<string, unknown>;
          const eventType = o.type ?? o.event;
          if (eventType !== "offer.created") continue;

          const target =
            o.messenger_id ??
            o.messengerId ??
            (isObject(o.payload)
              ? (o.payload as Record<string, unknown>).messenger_id
              : undefined) ??
            (isObject(o.payload) ? (o.payload as Record<string, unknown>).messengerId : undefined);

          if (
            target != null &&
            String(target).trim() !== "" &&
            String(target).trim() !== String(actorId).trim()
          ) {
            continue;
          }

          scheduleOffersRefreshFromRealtime();
          break;
        }
      } catch {
        /* mensaje no JSON o formato inesperado */
      }
    };

    ws.addEventListener("message", onMessage);

    return () => {
      if (wsOfferDebounceRef.current != null) {
        clearTimeout(wsOfferDebounceRef.current);
        wsOfferDebounceRef.current = null;
      }
      ws.removeEventListener("message", onMessage);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [loading, isOnline, actorId]);

  useEffect(() => {
    return () => {
      if (evidencePreviewUrl) {
        URL.revokeObjectURL(evidencePreviewUrl);
      }
    };
  }, [evidencePreviewUrl]);

  const handleToggleAvailability = useCallback(async () => {
    if (!actorId || !isValidUuid(actorId)) {
      toast.error("No hay Mensajero ID válido para actualizar disponibilidad");
      return;
    }

    const nextOnline = !isOnline;
    const availability_status = nextOnline ? "AVAILABLE" : "OFFLINE";

    setAvailabilitySyncing(true);
    try {
      await patchMessengerAvailability(actorId, availability_status);
      setIsOnline(nextOnline);
      toast.success(
        nextOnline
          ? "Disponible para ofertas"
          : "Desconectado: no recibirás ofertas nuevas",
      );
    } catch (error: any) {
      toast.error(restErrorMessage(error, "No se pudo actualizar la disponibilidad"));
    } finally {
      setAvailabilitySyncing(false);
    }
  }, [actorId, isOnline]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleAcceptService = async (
    serviceId: string,
    serviceForOptimistic?: BackendService
  ) => {
    if (!actorId) {
      toast.error("No hay actor_id disponible para el mensajero");
      return;
    }

    const messengerIdForAccept =
      hasAuthenticatedActor && sessionActorId && isValidUuid(sessionActorId)
        ? sessionActorId
        : actorId;

    if (!messengerIdForAccept || !isValidUuid(messengerIdForAccept)) {
      toast.error("El Mensajero ID debe ser un UUID válido");
      return;
    }

    const offerId = offerIdByServiceId[serviceId];
    if (!offerId) {
      toast.error("No se encontró offer_id para este servicio");
      return;
    }

    setClaimingServiceId(serviceId);

    try {
      await acceptServiceOffer(offerId, messengerIdForAccept);

      toast.success("Servicio aceptado");
      if (serviceForOptimistic) {
        setMyServices((prev) =>
          prev.some((s) => s.service_id === serviceForOptimistic.service_id)
            ? prev
            : [...prev, { ...serviceForOptimistic, status: "CLAIMED" as ServiceStatus }]
        );
        setAvailableServices((prev) =>
          prev.filter((s) => s.service_id !== serviceForOptimistic.service_id)
        );
        setOfferIdByServiceId((prev) => {
          const next = { ...prev };
          delete next[serviceForOptimistic.service_id];
          return next;
        });
      }
      await Promise.all([refreshMyServices(), refreshAvailableServices()]);
    } catch (error: any) {
      const msg = restErrorMessage(error, "");
      if (msg === "mensajero_active_limit_reached") {
        toast.error("Ya tienes 6 servicios activos. Debes cerrar uno antes de reclamar otro.");
      } else {
        toast.error(msg || "No se pudo aceptar la oferta");
      }
    } finally {
      setClaimingServiceId(null);
    }
  };

  const handleOmitCurrentOffer = useCallback(() => {
    setAvailableServices((prev) => {
      if (prev.length === 0) return prev;
      const omittedId = prev[0].service_id;
      setOfferIdByServiceId((m) => {
        const next = { ...m };
        delete next[omittedId];
        return next;
      });
      return prev.filter((s) => s.service_id !== omittedId);
    });
  }, []);

  const handleStartService = async (service: BackendService) => {
    if (!actorId) {
      toast.error("No hay actor_id disponible para el mensajero");
      return;
    }

    if (!isValidUuid(actorId)) {
      toast.error("El Mensajero ID debe ser un UUID válido");
      return;
    }

    setStartingServiceId(service.service_id);

    try {
      await jsonPost(`/v1/services/${service.service_id}/start`, {
        actor_role: "mensajero",
        actor_id: actorId,
      });

      toast.success("Servicio iniciado correctamente");
      const list = await refreshMyServices();
      const updated = list?.find((s) => s.service_id === service.service_id);
      setSelectedService(
        updated ?? { ...service, status: "STARTED" as ServiceStatus }
      );
    } catch (error: any) {
      toast.error(error.message || "No se pudo iniciar el servicio");
    } finally {
      setStartingServiceId(null);
    }
  };

  const handleCancelService = async (service: BackendService) => {
    if (!actorId) return;

    const reason = window.prompt("Motivo de cancelación:");
    if (!reason) return;

    try {
      await jsonPost(`/v1/services/${service.service_id}/cancel-by-messenger`, {
        actor_role: "mensajero",
        actor_id: actorId,
        reason,
      });

      await refreshMyServices();
      await refreshAvailableServices();
    } catch (e: any) {
      alert(restErrorMessage(e, "No se pudo cancelar el servicio"));
    }
  };

  const handleReportIncident = async (service: BackendService) => {
    if (!actorId) return;

    const reason = window.prompt("Describe el inconveniente:");
    if (!reason) return;

    try {
      await jsonPost(`/v1/services/${service.service_id}/report-incident`, {
        actor_role: "mensajero",
        actor_id: actorId,
        reason,
      });

      await refreshMyServices();
    } catch (e: any) {
      alert(restErrorMessage(e, "No se pudo reportar el inconveniente"));
    }
  };

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Este dispositivo no soporta geolocalización");
      return;
    }

    setLocationRequested(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLat(position.coords.latitude);
        setCurrentLng(position.coords.longitude);
        toast.success("Ubicación capturada");
      },
      () => {
        toast.error("No fue posible obtener la ubicación");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const clearEvidenceDraft = () => {
    if (evidencePreviewUrl) {
      URL.revokeObjectURL(evidencePreviewUrl);
    }
    setEvidenceFile(null);
    setEvidencePreviewUrl(null);
    setEvidenceNote("");
  };

  const handleSelectEvidenceFile = (file: File | null) => {
    if (evidencePreviewUrl) {
      URL.revokeObjectURL(evidencePreviewUrl);
    }

    setEvidenceFile(file);

    if (file) {
      setEvidencePreviewUrl(URL.createObjectURL(file));
    } else {
      setEvidencePreviewUrl(null);
    }
  };

  const uploadEvidenceForService = async (service: BackendService) => {
    const actorIdForEvidence =
      user?.actor_id != null ? String(user.actor_id).trim() : "";

    if (!actorIdForEvidence) {
      toast.error("No hay actor_id en la sesión para subir evidencias");
      return false;
    }

    if (!isValidUuid(actorIdForEvidence)) {
      toast.error("El actor_id de la sesión no es un UUID válido");
      return false;
    }

    if (!evidenceFile) {
      toast.error("Debes seleccionar una foto primero");
      return false;
    }

    setUploadingEvidenceServiceId(service.service_id);

    try {
      const formData = new FormData();
      formData.append("actor_role", "mensajero");
      formData.append("actor_id", actorIdForEvidence);
      formData.append("kind", "ENTREGA_DOCUMENTO");

      if (evidenceNote.trim()) {
        formData.append("note", evidenceNote.trim());
      }

      formData.append("taken_at_client", new Date().toISOString());

      if (currentLat !== null) {
        formData.append("lat", String(currentLat));
      }

      if (currentLng !== null) {
        formData.append("lng", String(currentLng));
      }

      formData.append("file", evidenceFile);

      await http.post(`/v1/services/${service.service_id}/evidences`, formData, {
        headers: {
          "Content-Type": undefined,
          "x-trace-id": buildTraceId("evidence"),
        },
      });

      toast.success("Evidencia subida correctamente");
      clearEvidenceDraft();
      await loadServiceEvidences(service.service_id);
      return true;
    } catch (error: any) {
      toast.error(restErrorMessage(error, "No se pudo subir la evidencia"));
      return false;
    } finally {
      setUploadingEvidenceServiceId(null);
    }
  };

  const openCloseValidation = async (service: BackendService) => {
    setSelectedService(service);
    setClosePin("");
    setValidationError("");
    await loadServiceEvidences(service.service_id, true);
  };

  const loadEvidencesForService = async (service: BackendService) => {
    setSelectedService(service);
    await loadServiceEvidences(service.service_id, true);
  };

  const handleCloseService = async () => {
    if (!selectedService) return;

    if (!actorId) {
      setValidationError("No hay actor_id disponible para el mensajero");
      return;
    }

    if (!isValidUuid(actorId)) {
      setValidationError("El Mensajero ID debe ser un UUID válido");
      return;
    }

    const evidences = evidencesByService[selectedService.service_id] || [];
    if (evidences.length === 0) {
      const confirmed = window.confirm(
        "Este servicio no tiene evidencia fotográfica cargada. La evidencia es opcional pero recomendada. ¿Deseas cerrar el servicio sin evidencia?"
      );

      if (!confirmed) {
        return;
      }
    }

    setValidationError("");
    setClosingServiceId(selectedService.service_id);

    try {
      await jsonPost(`/v1/services/${selectedService.service_id}/close`, {
        actor_role: "mensajero",
        actor_id: actorId,
        messenger_id: actorId,
        close_pin: closePin.trim(),
      });

      toast.success("Servicio cerrado correctamente");
      setClosePin("");
      setSelectedService(null);
      clearEvidenceDraft();
      await Promise.all([refreshMyServices(), refreshAvailableServices()]);
    } catch (error: any) {
      if (error.message === "invalid_close_pin") {
        setValidationError("PIN incorrecto.");
      } else {
        setValidationError(error.message || "No se pudo cerrar el servicio");
      }
    } finally {
      setClosingServiceId(null);
    }
  };

  const claimedServices = myServices.filter((s) => s.status === "CLAIMED");
  const startedServices = myServices.filter((s) => s.status === "STARTED");
  const completedServices = myServices.filter((s) => s.status === "CLOSED");
  const terminalOtherServices = myServices.filter((s) =>
    [
      "EXPIRED",
      "CANCELLED_BY_TRANSPORTER",
      "CANCELLED_BY_MESSENGER",
      "FAILED_PICKUP",
      "FAILED_DROPOFF",
      "NO_SHOW",
    ].includes(s.status)
  );

  const activeService =
    selectedService && selectedService.status === "STARTED"
      ? selectedService
      : startedServices.length > 0
        ? startedServices[0]
        : null;

  const selectedServiceEvidences = selectedService
    ? evidencesByService[selectedService.service_id] || []
    : [];

  const dispatchCurrentService = activeService ?? claimedServices[0] ?? null;
  const firstOffer = availableServices[0] ?? null;

  let uiState: UiState;
  if (!isOnline) {
    uiState = "OFFLINE";
  } else if (dispatchCurrentService?.status === "STARTED") {
    uiState = "IN_SERVICE";
  } else if (dispatchCurrentService?.status === "CLAIMED") {
    uiState = "ASSIGNED";
  } else if (firstOffer) {
    uiState = "OFFER";
  } else {
    uiState = "AVAILABLE";
  }

  const showPrimaryOfferHero = isOnline && !dispatchCurrentService;

  return {
    user,
    logout,
    loading,
    setLocation,

    isOnline,
    availabilitySyncing,
    selectedService,
    setSelectedService,
    closePin,
    setClosePin,
    validationError,

    myServices,
    availableServices,
    offerIdByServiceId,

    loadingMyServices,
    loadingAvailable,
    claimingServiceId,
    startingServiceId,
    closingServiceId,

    manualActorId,
    setManualActorId,
    manualMessengerName,
    setManualMessengerName,
    manualDocument,
    setManualDocument,
    manualPhone,
    setManualPhone,

    evidencesByService,
    loadingEvidenceServiceId,
    uploadingEvidenceServiceId,

    evidenceFile,
    evidencePreviewUrl,
    evidenceNote,
    setEvidenceNote,
    currentLat,
    currentLng,
    locationRequested,
    showFullQueues,
    setShowFullQueues,

    sessionActorId,
    sessionActorIdRaw,
    hasAuthenticatedActor,
    authActorId,
    actorId,
    actorSourceLabel,
    effectiveMessengerName,
    effectiveMessengerEmail,

    claimedServices,
    startedServices,
    completedServices,
    terminalOtherServices,
    activeService,
    selectedServiceEvidences,
    dispatchCurrentService,
    firstOffer,
    uiState,
    showPrimaryOfferHero,

    refreshMyServices,
    refreshAvailableServices,
    loadServiceEvidences,
    handleToggleAvailability,
    handleLogout,
    handleAcceptService,
    handleOmitCurrentOffer,
    handleStartService,
    handleCancelService,
    handleReportIncident,
    handleRequestLocation,
    clearEvidenceDraft,
    handleSelectEvidenceFile,
    uploadEvidenceForService,
    openCloseValidation,
    loadEvidencesForService,
    handleCloseService,
  };
}
