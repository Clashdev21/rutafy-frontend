import { useAuth } from "@/_core/hooks/useAuth";
import { http } from "@/api/http";
import {
  acceptServiceOffer,
  getActiveOffersByMessenger,
  patchMessengerAvailability,
  postMessengerHeartbeat,
} from "@/api/services";
import type { OpsServiceLocation } from "@/api/admin-ops-service";
import { getToken } from "@/authStorage";
import {
  formatLabelWithSubLocation,
  formatOperationalLocation,
  locationFromUnknown,
  parseRouteLocation,
  pickRouteSubLocation,
} from "@/lib/formatOperationalLocation";
import {
  normalizeOperationalParticipant,
  type OperationalParticipant,
} from "@/lib/operationalParticipant";
import { buildMessengerRealtimeWebSocketUrl } from "@/lib/messengerRealtimeWs";
import type { OperationalGeofenceState } from "@/lib/resolveOperationalCopy";
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
  origin?: string | OpsServiceLocation | null;
  destination?: string | OpsServiceLocation | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
  requester?: OperationalParticipant | null;
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
  origin?: string | OpsServiceLocation | null;
  destination?: string | OpsServiceLocation | null;
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

export function formatEvidenceFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function validateEvidenceFileForUpload(file: File): string | null {
  if (file.size <= 0) {
    return "El archivo está vacío. Vuelve a tomar o elegir la foto.";
  }
  const type = String(file.type ?? "").trim().toLowerCase();
  if (!type.startsWith("image/")) {
    return "Solo se permiten imágenes. Elige un archivo de imagen válido.";
  }
  return null;
}

function evidenceUploadErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: { error?: string; detail?: string; message?: string } };
    code?: string;
    message?: string;
  };
  const d = err?.response?.data;
  if (d && typeof d === "object") {
    const msg = d.error ?? d.detail ?? d.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  const code = err?.code ?? "";
  const message = typeof err?.message === "string" ? err.message : "";
  if (code === "ECONNABORTED" || /timeout/i.test(message)) {
    return "La subida tardó demasiado. Intenta nuevamente o usa una foto más pequeña.";
  }
  if (code === "ERR_NETWORK" || message === "Network Error") {
    return "No se pudo completar la subida. Verifica tu conexión o intenta con una foto más pequeña.";
  }
  return restErrorMessage(error, fallback);
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

const MESSENGER_HEARTBEAT_INTERVAL_MS = 30_000;
const LOCATION_FRESH_TTL_MS = 90_000;

const GPS_BOOTSTRAP_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15000,
};

export type OperationalLocationStatus =
  | "unknown"
  | "fresh"
  | "stale"
  | "denied"
  | "unavailable";

export type GeolocationPermissionState = "granted" | "denied" | "prompt";

export function isLocationFresh(
  lastFixAt: number | null,
  now = Date.now(),
): boolean {
  if (lastFixAt == null) return false;
  return now - lastFixAt <= LOCATION_FRESH_TTL_MS;
}

function resolveGeolocationErrorStatus(
  error: GeolocationPositionError,
): OperationalLocationStatus {
  if (error.code === error.PERMISSION_DENIED) return "denied";
  return "unavailable";
}

function resolveHeartbeatAvailability(
  isOnline: boolean,
  uiState: UiState,
): "AVAILABLE" | "OFFLINE" | undefined {
  if (!isOnline) return "OFFLINE";
  if (uiState === "ASSIGNED" || uiState === "IN_SERVICE") return undefined;
  if (uiState === "AVAILABLE") return "AVAILABLE";
  return undefined;
}

async function readBatteryLevel(): Promise<number | null> {
  try {
    if (typeof navigator === "undefined") return null;
    const getBattery = (
      navigator as Navigator & {
        getBattery?: () => Promise<{ level?: number }>;
      }
    ).getBattery;
    if (typeof getBattery !== "function") return null;
    const battery = await getBattery.call(navigator);
    const level = battery?.level;
    if (typeof level !== "number" || !Number.isFinite(level)) return null;
    if (level > 1) return level;
    return level * 100;
  } catch {
    return null;
  }
}

export function buildAbsoluteUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return `${getPublicApiOrigin()}${fileUrl}`;
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

/** Claves alineadas con `getOrigin` en MensajeroPanel (origen legible). */
const OFFER_ORIGIN_TEXT_KEYS = [
  "origin",
  "origin_node_name",
  "origin_label",
  "originName",
  "pickup_address",
  "pickupAddress",
  "from",
] as const;

/** Claves alineadas con `getDestination` en MensajeroPanel. */
const OFFER_DESTINATION_TEXT_KEYS = [
  "destination",
  "destination_node_name",
  "destination_label",
  "destinationName",
  "dropoff_address",
  "dropoffAddress",
  "to",
] as const;

function pickFirstNonEmptyStringFromObject(
  obj: Record<string, any> | null | undefined,
  keys: readonly string[]
): string | null {
  if (!isObject(obj)) return null;
  for (const key of keys) {
    const raw = obj[key];
    if (raw == null) continue;
    const s = typeof raw === "string" ? raw.trim() : String(raw).trim();
    if (s) return s;
  }
  return null;
}

/** `offer.meta` como base; `service.meta` sobrescribe (capa más específica). */
function mergeOfferMetas(
  offer: DispatchOfferLike,
  nested: Partial<BackendService> | null
): Record<string, any> | null {
  const root = isObject(offer.meta) ? (offer.meta as Record<string, any>) : {};
  const inner = nested && isObject(nested.meta) ? (nested.meta as Record<string, any>) : {};
  if (!Object.keys(root).length && !Object.keys(inner).length) return null;
  return { ...root, ...inner };
}

function resolveRouteEndpoint(
  nestedRec: Record<string, any> | null,
  offerRec: Record<string, any>,
  metaObj: Record<string, any> | null,
  textKeys: readonly string[],
  which: "origin" | "destination",
): string | null {
  const primaryRaw = nestedRec?.[which] ?? offerRec[which];
  const fromObj = locationFromUnknown(primaryRaw);
  if (fromObj) {
    const formatted = formatOperationalLocation(fromObj);
    if (formatted !== "—") return formatted;
  }

  const label =
    pickFirstNonEmptyStringFromObject(nestedRec, textKeys) ??
    pickFirstNonEmptyStringFromObject(offerRec, textKeys) ??
    pickFirstNonEmptyStringFromObject(metaObj, textKeys) ??
    (typeof primaryRaw === "string" ? primaryRaw.trim() || null : null);

  const sub = pickRouteSubLocation(metaObj, which);
  const combined = formatLabelWithSubLocation(label, sub, "");
  return combined || null;
}

function resolveOfferRouteField(
  offer: DispatchOfferLike,
  nested: Partial<BackendService> | null,
  mergedMeta: Record<string, any> | null,
  textKeys: readonly string[],
  which: "origin" | "destination",
): string | OpsServiceLocation | null {
  const nestedRec = nested as Record<string, any> | null;
  const offerRec = offer as Record<string, any>;
  const primaryRaw = nestedRec?.[which] ?? offerRec[which];
  const parsed = parseRouteLocation(primaryRaw);
  if (parsed) return parsed;

  const text = resolveRouteEndpoint(
    nestedRec,
    offerRec,
    mergedMeta && Object.keys(mergedMeta).length ? mergedMeta : null,
    textKeys,
    which,
  );
  return text || null;
}

function resolveServiceRequester(
  offer: DispatchOfferLike,
  nested: Partial<BackendService> | null,
): OperationalParticipant | null {
  const nestedRec = nested as Record<string, unknown> | null;
  const offerRec = offer as Record<string, unknown>;
  const serviceRec =
    offer.service && typeof offer.service === "object"
      ? (offer.service as Record<string, unknown>)
      : null;

  return (
    normalizeOperationalParticipant(nestedRec?.requester) ??
    normalizeOperationalParticipant(offerRec.requester) ??
    normalizeOperationalParticipant(serviceRec?.requester) ??
    null
  );
}

function enrichBackendService(service: BackendService): BackendService {
  const rec = service as unknown as Record<string, unknown>;
  const requester =
    service.requester ?? normalizeOperationalParticipant(rec.requester) ?? null;
  return requester ? { ...service, requester } : service;
}

function mapOfferToBackendService(offer: DispatchOfferLike): BackendService | null {
  const nested = isObject(offer.service) ? (offer.service as Partial<BackendService>) : null;
  const serviceId = String(
    nested?.service_id ?? offer.service_id ?? offer.serviceId ?? ""
  ).trim();

  if (!serviceId) return null;

  const status = String(nested?.status ?? offer.status ?? "REQUESTED").toUpperCase() as ServiceStatus;

  const mergedMeta = mergeOfferMetas(offer, nested);
  const origin = resolveOfferRouteField(
    offer,
    nested,
    mergedMeta,
    OFFER_ORIGIN_TEXT_KEYS,
    "origin",
  );
  const destination = resolveOfferRouteField(
    offer,
    nested,
    mergedMeta,
    OFFER_DESTINATION_TEXT_KEYS,
    "destination",
  );
  const requester = resolveServiceRequester(offer, nested);

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
    meta: mergedMeta,
    origin,
    destination,
    expires_at: (nested?.expires_at ?? offer.expires_at ?? null) as string | null,
    created_at: nested?.created_at ?? offer.created_at,
    updated_at: nested?.updated_at ?? offer.updated_at,
    requester,
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
  const [cancellingServiceId, setCancellingServiceId] = useState<string | null>(null);
  const [reportingIncidentServiceId, setReportingIncidentServiceId] = useState<string | null>(
    null
  );

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
  const [locationStatus, setLocationStatus] =
    useState<OperationalLocationStatus>("unknown");
  const [locationPermissionState, setLocationPermissionState] =
    useState<GeolocationPermissionState | null>(null);
  const [gpsBootstrapReady, setGpsBootstrapReady] = useState(false);
  const [locationRequested, setLocationRequested] = useState(false);
  const [showFullQueues, setShowFullQueues] = useState(false);
  const [realtimeReconnectVersion, setRealtimeReconnectVersion] = useState(0);
  const [geofenceByServiceId, setGeofenceByServiceId] = useState<
    Record<string, OperationalGeofenceState>
  >({});

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

  const messengerRealtimeAccessKey = getToken() ?? "";

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
      const list = Array.isArray(data?.services)
        ? data.services.map((s) => enrichBackendService(s))
        : [];
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

  const refreshMyServicesRef = useRef(refreshMyServices);
  refreshMyServicesRef.current = refreshMyServices;

  const lastWakeRecoveryAtRef = useRef(0);

  const heartbeatTimerRef = useRef<number | null>(null);
  const lastHeartbeatLatRef = useRef<number | null>(null);
  const lastHeartbeatLngRef = useRef<number | null>(null);
  const lastLocationFixAtRef = useRef<number | null>(null);
  const uiStateRef = useRef<UiState>("OFFLINE");
  const locationWatchIdRef = useRef<number | null>(null);
  const gpsBootstrapCancelRef = useRef<(() => void) | null>(null);

  const applyOperationalLocationFix = useCallback((lat: number, lng: number) => {
    lastHeartbeatLatRef.current = lat;
    lastHeartbeatLngRef.current = lng;
    lastLocationFixAtRef.current = Date.now();
    setCurrentLat(lat);
    setCurrentLng(lng);
    setLocationStatus("fresh");
  }, []);

  const clearOperationalGps = useCallback(() => {
    lastHeartbeatLatRef.current = null;
    lastHeartbeatLngRef.current = null;
    lastLocationFixAtRef.current = null;
    setCurrentLat(null);
    setCurrentLng(null);
  }, []);

  const syncGeolocationPermissionState = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) {
      return null;
    }

    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      const state = result.state as GeolocationPermissionState;
      setLocationPermissionState(state);

      result.onchange = () => {
        setLocationPermissionState(result.state as GeolocationPermissionState);
      };

      return state;
    } catch {
      return null;
    }
  }, []);

  const runGpsBootstrap = useCallback(() => {
    gpsBootstrapCancelRef.current?.();
    gpsBootstrapCancelRef.current = null;

    if (typeof window === "undefined" || !navigator.geolocation) {
      clearOperationalGps();
      setLocationStatus("unavailable");
      setGpsBootstrapReady(true);
      return () => {};
    }

    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };
    gpsBootstrapCancelRef.current = cancel;

    setLocationStatus("unknown");
    setGpsBootstrapReady(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        applyOperationalLocationFix(
          position.coords.latitude,
          position.coords.longitude,
        );
        setGpsBootstrapReady(true);
        void syncGeolocationPermissionState();
      },
      (error) => {
        if (cancelled) return;
        console.warn("[messenger-location-bootstrap]", error);
        clearOperationalGps();
        setLocationStatus(resolveGeolocationErrorStatus(error));
        setGpsBootstrapReady(true);
        void syncGeolocationPermissionState();
      },
      GPS_BOOTSTRAP_OPTIONS,
    );

    return cancel;
  }, [applyOperationalLocationFix, clearOperationalGps, syncGeolocationPermissionState]);

  const requestLocationPermission = useCallback(async () => {
    if (typeof window === "undefined") return;

    await syncGeolocationPermissionState();
    runGpsBootstrap();
  }, [runGpsBootstrap, syncGeolocationPermissionState]);

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

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const runWakeRecovery = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastWakeRecoveryAtRef.current < 1500) return;
      lastWakeRecoveryAtRef.current = now;

      if (loading) return;
      if (!actorId || !isValidUuid(actorId)) return;

      void refreshMyServicesRef.current();
      if (isOnline) {
        void refreshAvailableServicesRef.current();
        setRealtimeReconnectVersion((v) => v + 1);
      }
    };

    document.addEventListener("visibilitychange", runWakeRecovery);
    window.addEventListener("pageshow", runWakeRecovery);
    return () => {
      document.removeEventListener("visibilitychange", runWakeRecovery);
      window.removeEventListener("pageshow", runWakeRecovery);
    };
  }, [loading, actorId, isOnline]);

  useEffect(() => {
    if (locationStatus !== "fresh" || !isOnline) return;

    const fixAt = lastLocationFixAtRef.current;
    if (fixAt == null) return;

    const remaining = LOCATION_FRESH_TTL_MS - (Date.now() - fixAt);
    if (remaining <= 0) {
      setLocationStatus("stale");
      return;
    }

    const timer = window.setTimeout(() => {
      setLocationStatus("stale");
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [locationStatus, isOnline, currentLat, currentLng]);

  useEffect(() => {
    const clearLocationWatch = () => {
      if (
        locationWatchIdRef.current != null &&
        typeof navigator !== "undefined" &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
      }
      locationWatchIdRef.current = null;
    };

    if (typeof window === "undefined") {
      return () => {
        clearLocationWatch();
      };
    }

    if (
      loading ||
      !user ||
      user.appRole !== "MENSAJERO" ||
      !isOnline ||
      !gpsBootstrapReady ||
      !actorId ||
      !isValidUuid(actorId)
    ) {
      clearLocationWatch();
      if (!isOnline) {
        clearOperationalGps();
        setLocationStatus("unknown");
        setGpsBootstrapReady(false);
      }
      return () => {
        clearLocationWatch();
      };
    }

    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return () => {
        clearLocationWatch();
      };
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000,
    };

    const onSuccess = (position: GeolocationPosition) => {
      applyOperationalLocationFix(
        position.coords.latitude,
        position.coords.longitude,
      );
    };

    const onError = (error: GeolocationPositionError) => {
      console.warn("[messenger-location]", error);
      clearOperationalGps();
      setLocationStatus(resolveGeolocationErrorStatus(error));
    };

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      geoOptions,
    );

    return () => {
      clearLocationWatch();
    };
  }, [
    loading,
    isOnline,
    gpsBootstrapReady,
    actorId,
    user,
    applyOperationalLocationFix,
    clearOperationalGps,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (
      loading ||
      !user ||
      user.appRole !== "MENSAJERO" ||
      !isOnline ||
      !actorId ||
      !isValidUuid(actorId)
    ) {
      gpsBootstrapCancelRef.current?.();
      gpsBootstrapCancelRef.current = null;
      setGpsBootstrapReady(false);
      return;
    }

    void syncGeolocationPermissionState();
    const cancel = runGpsBootstrap();

    return () => {
      cancel();
      if (gpsBootstrapCancelRef.current === cancel) {
        gpsBootstrapCancelRef.current = null;
      }
    };
  }, [
    loading,
    isOnline,
    actorId,
    user,
    runGpsBootstrap,
    syncGeolocationPermissionState,
  ]);

  useEffect(() => {
    if (!isOnline) return;
    if (locationStatus !== "denied" && locationStatus !== "unavailable") return;
    void syncGeolocationPermissionState();
  }, [isOnline, locationStatus, syncGeolocationPermissionState]);

  useEffect(() => {
    const clearHeartbeatTimer = () => {
      if (heartbeatTimerRef.current != null) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };

    if (typeof window === "undefined") {
      return () => {
        clearHeartbeatTimer();
      };
    }

    if (
      loading ||
      !user ||
      user.appRole !== "MENSAJERO" ||
      !isOnline ||
      !gpsBootstrapReady ||
      !actorId ||
      !isValidUuid(actorId)
    ) {
      clearHeartbeatTimer();
      return () => {
        clearHeartbeatTimer();
      };
    }

    const token = getToken();
    if (!token) {
      clearHeartbeatTimer();
      return () => {
        clearHeartbeatTimer();
      };
    }

    const sendHeartbeat = async () => {
      try {
        const battery_level = await readBatteryLevel();
        const availability_status = resolveHeartbeatAvailability(
          isOnline,
          uiStateRef.current,
        );
        const payload: Parameters<typeof postMessengerHeartbeat>[0] = {};

        if (availability_status !== undefined) {
          payload.availability_status = availability_status;
        }

        if (isLocationFresh(lastLocationFixAtRef.current)) {
          const lat = lastHeartbeatLatRef.current;
          const lng = lastHeartbeatLngRef.current;
          if (
            lat != null &&
            lng != null &&
            Number.isFinite(lat) &&
            Number.isFinite(lng)
          ) {
            payload.lat = lat;
            payload.lng = lng;
          }
        } else if (lastLocationFixAtRef.current != null) {
          setLocationStatus("stale");
        }

        if (battery_level != null) {
          payload.battery_level = battery_level;
        }

        await postMessengerHeartbeat(payload);
      } catch (err: unknown) {
        console.warn("[messenger-heartbeat]", err);
      }
    };

    void sendHeartbeat();
    heartbeatTimerRef.current = window.setInterval(() => {
      void sendHeartbeat();
    }, MESSENGER_HEARTBEAT_INTERVAL_MS);

    return () => {
      clearHeartbeatTimer();
    };
  }, [loading, isOnline, gpsBootstrapReady, actorId, user]);

  const wsOfferDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onTokenRefreshed = () => {
      setRealtimeReconnectVersion((v) => v + 1);
    };

    const onAuthLogout = () => {
      const w = wsRef.current;
      if (w && (w.readyState === WebSocket.OPEN || w.readyState === WebSocket.CONNECTING)) {
        w.close();
      }
      wsRef.current = null;
      lastTokenRef.current = null;
      if (wsOfferDebounceRef.current != null) {
        clearTimeout(wsOfferDebounceRef.current);
        wsOfferDebounceRef.current = null;
      }
      setGeofenceByServiceId({});
    };

    window.addEventListener("auth:token-refreshed", onTokenRefreshed);
    window.addEventListener("auth:logout", onAuthLogout);
    return () => {
      window.removeEventListener("auth:token-refreshed", onTokenRefreshed);
      window.removeEventListener("auth:logout", onAuthLogout);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loading) return;

    const shutdownRealtimeSocket = () => {
      const w = wsRef.current;
      if (w && (w.readyState === WebSocket.OPEN || w.readyState === WebSocket.CONNECTING)) {
        w.close();
      }
      wsRef.current = null;
      lastTokenRef.current = null;
      if (wsOfferDebounceRef.current != null) {
        clearTimeout(wsOfferDebounceRef.current);
        wsOfferDebounceRef.current = null;
      }
      setGeofenceByServiceId({});
    };

    if (!isOnline || !actorId || !isValidUuid(actorId)) {
      shutdownRealtimeSocket();
      return;
    }

    shutdownRealtimeSocket();

    const token = getToken();
    if (!token) {
      return;
    }

    const wsUrl = buildMessengerRealtimeWebSocketUrl(token);
    if (!wsUrl) {
      return;
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn("[messenger-realtime] WebSocket init failed", e);
      }
      return;
    }

    wsRef.current = ws;
    lastTokenRef.current = token;

    const scheduleOffersRefreshFromRealtime = () => {
      if (wsOfferDebounceRef.current != null) {
        clearTimeout(wsOfferDebounceRef.current);
      }
      wsOfferDebounceRef.current = setTimeout(() => {
        wsOfferDebounceRef.current = null;
        void refreshAvailableServicesRef.current();
      }, 200);
    };

    const extractCancelledServiceId = (o: Record<string, unknown>): string | null => {
      const rootType = o.type ?? o.event;
      if (rootType === "service.cancelled") {
        const sid = String(o.service_id ?? o.serviceId ?? "").trim();
        if (sid) return sid;
      }
      if (isObject(o.data)) {
        const d = o.data as Record<string, unknown>;
        if ((d.type ?? d.event) === "service.cancelled") {
          const sid = String(d.service_id ?? d.serviceId ?? "").trim();
          if (sid) return sid;
        }
      }
      return null;
    };

    const clearGeofenceForService = (serviceId: string) => {
      const sid = String(serviceId ?? "").trim();
      if (!sid) return;
      setGeofenceByServiceId((prev) => {
        if (!(sid in prev)) return prev;
        const next = { ...prev };
        delete next[sid];
        return next;
      });
    };

    const applyGeofenceUpdated = (payload: Record<string, unknown>) => {
      const messengerId = String(
        payload.messenger_id ?? payload.messengerId ?? "",
      ).trim();
      if (
        messengerId !== "" &&
        messengerId !== String(actorId).trim()
      ) {
        return;
      }

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

    const applyServiceCancelled = (serviceId: string) => {
      if (!serviceId) return;
      clearGeofenceForService(serviceId);
      setAvailableServices((prev) => prev.filter((s) => s.service_id !== serviceId));
      setOfferIdByServiceId((prev) => {
        if (!(serviceId in prev)) return prev;
        const next = { ...prev };
        delete next[serviceId];
        return next;
      });
      scheduleOffersRefreshFromRealtime();
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

          const cancelledId = extractCancelledServiceId(o);
          if (cancelledId) {
            applyServiceCancelled(cancelledId);
            break;
          }

          const eventType = String(o.type ?? o.event ?? "").trim();

          if (eventType === "geofence.updated") {
            const payload = isObject(o.data)
              ? (o.data as Record<string, unknown>)
              : o;
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
      if (wsRef.current === ws) {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
        wsRef.current = null;
      }
      if (lastTokenRef.current === token) {
        lastTokenRef.current = null;
      }
    };
  }, [loading, isOnline, actorId, messengerRealtimeAccessKey, realtimeReconnectVersion]);

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
    setLocation("/login", { replace: true });
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
    if (cancellingServiceId === service.service_id) return;

    setCancellingServiceId(service.service_id);

    const reason = window.prompt("Motivo de cancelación:");
    if (!reason) {
      setCancellingServiceId(null);
      return;
    }

    try {
      await jsonPost(`/v1/services/${service.service_id}/cancel-by-messenger`, {
        actor_role: "mensajero",
        actor_id: actorId,
        reason,
      });

      setGeofenceByServiceId((prev) => {
        if (!(service.service_id in prev)) return prev;
        const next = { ...prev };
        delete next[service.service_id];
        return next;
      });
      await refreshMyServices();
      await refreshAvailableServices();
    } catch (e: any) {
      setCancellingServiceId(null);
      alert(restErrorMessage(e, "No se pudo cancelar el servicio"));
    }
  };

  const handleReportIncident = async (service: BackendService) => {
    if (!actorId) return;
    if (reportingIncidentServiceId === service.service_id) return;

    setReportingIncidentServiceId(service.service_id);

    const reason = window.prompt("Describe el inconveniente:");
    if (!reason) {
      setReportingIncidentServiceId(null);
      return;
    }

    try {
      await jsonPost(`/v1/services/${service.service_id}/report-incident`, {
        actor_role: "mensajero",
        actor_id: actorId,
        reason,
      });

      await refreshMyServices();
    } catch (e: any) {
      setReportingIncidentServiceId(null);
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
    console.info("[evidence-upload] file", {
      name: evidenceFile?.name,
      type: evidenceFile?.type,
      size: evidenceFile?.size,
      lastModified: evidenceFile?.lastModified,
    });

    console.info("[evidence-upload] api", import.meta.env.VITE_RUTAFY_API_BASE);

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

    const fileValidationError = validateEvidenceFileForUpload(evidenceFile);
    if (fileValidationError) {
      toast.error(fileValidationError);
      return false;
    }

    const traceId = buildTraceId("evidence");
    const uploadStartedAt = Date.now();

    if (import.meta.env.DEV) {
      console.info("[evidence-upload] start", {
        traceId,
        serviceId: service.service_id,
        name: evidenceFile.name,
        type: evidenceFile.type,
        size: evidenceFile.size,
      });
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

      formData.append("file", evidenceFile, evidenceFile.name || "evidence.jpg");

      console.info("[evidence-upload] formData-ready");

      await http.post(`/v1/services/${service.service_id}/evidences`, formData, {
        timeout: 120_000,
        headers: {
          "x-trace-id": traceId,
        },
      });

      if (import.meta.env.DEV) {
        console.info("[evidence-upload] success", {
          traceId,
          serviceId: service.service_id,
          ms: Date.now() - uploadStartedAt,
        });
      }

      toast.success("Evidencia subida correctamente");
      clearEvidenceDraft();
      await loadServiceEvidences(service.service_id);
      return true;
    } catch (error: unknown) {
      const err = error as {
        code?: string;
        message?: string;
        response?: { data?: unknown };
      };
      console.error("[evidence-upload] error", {
        code: err?.code,
        message: err?.message,
        response: err?.response?.data,
      });
      toast.error(evidenceUploadErrorMessage(error, "No se pudo subir la evidencia"));
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
    if (closingServiceId === selectedService.service_id) return;

    if (!actorId) {
      setValidationError("No hay actor_id disponible para el mensajero");
      return;
    }

    if (!isValidUuid(actorId)) {
      setValidationError("El Mensajero ID debe ser un UUID válido");
      return;
    }

    const closingServiceIdValue = selectedService.service_id;
    setClosingServiceId(closingServiceIdValue);

    const evidences = evidencesByService[selectedService.service_id] || [];
    if (evidences.length === 0) {
      const confirmed = window.confirm(
        "Este servicio no tiene evidencia fotográfica cargada. La evidencia es opcional pero recomendada. ¿Deseas cerrar el servicio sin evidencia?"
      );

      if (!confirmed) {
        setClosingServiceId(null);
        return;
      }
    }

    setValidationError("");

    try {
      await jsonPost(`/v1/services/${closingServiceIdValue}/close`, {
        actor_role: "mensajero",
        actor_id: actorId,
        messenger_id: actorId,
        close_pin: closePin.trim(),
      });

      toast.success("Servicio cerrado correctamente");
      setClosePin("");
      setSelectedService(null);
      clearEvidenceDraft();
      setGeofenceByServiceId((prev) => {
        if (!(closingServiceIdValue in prev)) return prev;
        const next = { ...prev };
        delete next[closingServiceIdValue];
        return next;
      });
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
  const activeGeofenceState = dispatchCurrentService?.service_id
    ? geofenceByServiceId[dispatchCurrentService.service_id] ?? null
    : null;
  const firstOffer = availableServices[0] ?? null;

  const hasActiveClaimedOrStartedService =
    dispatchCurrentService?.status === "CLAIMED" ||
    dispatchCurrentService?.status === "STARTED";
  const effectiveIsOnline = isOnline || hasActiveClaimedOrStartedService;

  let uiState: UiState;
  if (!effectiveIsOnline) {
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

  uiStateRef.current = uiState;

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
    cancellingServiceId,
    reportingIncidentServiceId,

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
    locationStatus,
    locationPermissionState,
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
    activeGeofenceState,
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
    requestLocationPermission,
    clearEvidenceDraft,
    handleSelectEvidenceFile,
    uploadEvidenceForService,
    openCloseValidation,
    loadEvidencesForService,
    handleCloseService,
  };
}
