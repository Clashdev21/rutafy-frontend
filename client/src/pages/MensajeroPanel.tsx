import { useAuth } from "@/_core/hooks/useAuth";
import rutafyLogo from "@/assets/rutafy-logo.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import {
  Package,
  MapPin,
  History,
  User,
  LogOut,
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Phone,
  IdCard,
  Camera,
  Upload,
  Image as ImageIcon,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { toast } from "sonner";
import { http } from "@/api/http";
import {
  acceptServiceOffer,
  getActiveOffersByMessenger,
  patchMessengerAvailability,
} from "@/api/services";

type ServiceStatus =
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

type UiState = "OFFLINE" | "AVAILABLE" | "OFFER" | "ASSIGNED" | "IN_SERVICE";

interface BackendService {
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

interface ServiceEvidence {
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

const RAW_API_BASE =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  typeof import.meta.env.VITE_RUTAFY_API_BASE === "string"
    ? import.meta.env.VITE_RUTAFY_API_BASE.trim()
    : "";

const API_BASE =
  RAW_API_BASE && /^https?:\/\//i.test(RAW_API_BASE)
    ? RAW_API_BASE.replace(/\/+$/, "")
    : "https://api.rutafy.app";

function buildTraceId(prefix: string) {
  return `T-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeErrorMessage(payload: any, fallback: string) {
  if (!payload) return fallback;
  return payload.error || payload.detail || payload.message || fallback;
}

/**
 * Identificador operativo para el backend mensajero.
 * No usar user_id (identidad auth ≠ actor operativo). actor_id primero; id al final.
 */
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

function getServiceCode(service: BackendService): string {
  const raw = String(service.service_id || "")
    .replace(/-/g, "")
    .slice(0, 6)
    .toUpperCase();
  return raw ? `RTF-${raw}` : "RTF-SINCOD";
}

function getOrigin(service: BackendService): string {
  const meta = service.meta || {};
  return (
    service.origin ||
    meta.origin ||
    meta.origin_label ||
    meta.originName ||
    meta.pickup_address ||
    meta.pickupAddress ||
    meta.from ||
    "Origen no definido"
  );
}

function getDestination(service: BackendService): string {
  const meta = service.meta || {};
  return (
    service.destination ||
    meta.destination ||
    meta.destination_label ||
    meta.destinationName ||
    meta.dropoff_address ||
    meta.dropoffAddress ||
    meta.to ||
    "Destino no definido"
  );
}

function getServiceTypeLabel(serviceType: string): string {
  switch (serviceType) {
    case "DOCS_PICKUP":
      return "Documentos";
    case "CUMPLIDOS":
      return "Cumplidos";
    case "DOCS_DELIVERY":
      return "Entrega documental";
    case "MOTO_COURIER":
      return "Mensajería";
    case "MOTO_RIDE":
      return "Traslado";
    default:
      return serviceType || "Servicio";
  }
}

function getStatusLabel(status: ServiceStatus): string {
  switch (status) {
    case "REQUESTED":
      return "Disponible";
    case "CLAIMED":
      return "Reclamado";
    case "STARTED":
      return "En progreso";
    case "CLOSED":
      return "Cerrado";
    case "EXPIRED":
      return "Expirado";
    case "CANCELLED_BY_TRANSPORTER":
      return "Cancelado por transportista";
    case "CANCELLED_BY_MESSENGER":
      return "Cancelado por mensajero";
    case "FAILED_PICKUP":
      return "Falla en recogida";
    case "FAILED_DROPOFF":
      return "Falla en entrega";
    case "NO_SHOW":
      return "No show";
    default:
      return status;
  }
}

function getStatusBadgeClass(status: ServiceStatus): string {
  switch (status) {
    case "REQUESTED":
      return "bg-yellow-100 text-yellow-800";
    case "CLAIMED":
      return "bg-amber-100 text-amber-800";
    case "STARTED":
      return "bg-blue-100 text-blue-800";
    case "CLOSED":
      return "bg-green-100 text-green-800";
    case "EXPIRED":
      return "bg-gray-100 text-gray-700";
    case "CANCELLED_BY_TRANSPORTER":
    case "CANCELLED_BY_MESSENGER":
    case "FAILED_PICKUP":
    case "FAILED_DROPOFF":
    case "NO_SHOW":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/** UUID por formato (hex + guiones), sin validar versión/variante RFC. */
export function isValidUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value.trim()
  );
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function buildAbsoluteUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return `${API_BASE}${fileUrl}`;
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-trace-id": buildTraceId("get"),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(normalizeErrorMessage(payload, "No se pudo consultar el backend"));
  }

  return payload as T;
}

async function apiPost<T>(path: string, body: Record<string, any>): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-trace-id": buildTraceId("post"),
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(normalizeErrorMessage(payload, "No se pudo procesar la acción"));
  }

  return payload as T;
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
  /** Backend real: { ok: true, offer: { offer_id, service_id, status, ... } } */
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

function OfflineView(props: { onToggle: () => void }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 gap-4">
      <p className="text-lg font-semibold text-gray-900">Desconectado</p>
      <p className="text-sm text-gray-500 text-center">Activa para recibir servicios</p>
      <Button type="button" onClick={() => props.onToggle()} className="w-full max-w-sm bg-[#2A9D8F] hover:bg-[#238b7e]">
        Ponerte en línea
      </Button>
    </div>
  );
}

function AvailableView(props: { onToggleOffline: () => void; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-sm flex items-center justify-between gap-3">
        <span
          className="rounded-full border border-[#2A9D8F]/25 bg-[#2A9D8F]/10 px-3 py-1 text-xs font-medium text-[#2A9D8F]"
          aria-label="Estado"
        >
          En línea
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => props.onToggleOffline()}
            className="h-8 rounded-full border-[#2A9D8F]/30 px-3 text-xs text-[#2A9D8F] hover:bg-[#2A9D8F]/10"
          >
            Pasar a offline
          </Button>
          <button
            type="button"
            onClick={() => props.onLogout()}
            className="text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            Salir
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
          <span
            className="absolute inline-flex h-20 w-20 animate-ping rounded-full bg-[#2A9D8F]/25"
            aria-hidden
          />
          <span
            className="relative inline-flex h-16 w-16 animate-pulse rounded-full bg-[#2A9D8F]/20 ring-4 ring-[#2A9D8F]/15"
            aria-hidden
          />
          <span className="absolute h-3 w-3 rounded-full bg-[#2A9D8F]" aria-hidden />
        </div>
        <div className="flex max-w-sm flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-semibold leading-tight text-[#0F172A]">
            Buscando servicios para ti
          </h2>
          <p className="text-sm leading-relaxed text-[#64748B]">
            Te avisaremos en cuanto aparezca una oferta
          </p>
        </div>
      </div>
    </div>
  );
}

function OfferView(props: {
  offer: BackendService;
  onAccept: () => Promise<void> | void;
  isAccepting: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const expiresAtRaw = props.offer.expires_at;
  const expiresAtMs =
    expiresAtRaw != null && String(expiresAtRaw).trim() !== ""
      ? Date.parse(String(expiresAtRaw))
      : NaN;
  const hasValidExpiry = Number.isFinite(expiresAtMs);

  const remainingMs = hasValidExpiry ? Math.max(0, expiresAtMs - now) : 0;

  const offerTimerKey = `${props.offer.service_id}\0${props.offer.expires_at ?? ""}`;
  const totalMsRef = useRef<number | null>(null);
  const offerTimerKeyRef = useRef<string>("");
  if (offerTimerKeyRef.current !== offerTimerKey) {
    offerTimerKeyRef.current = offerTimerKey;
    totalMsRef.current = null;
  }
  if (totalMsRef.current === null) {
    if (!hasValidExpiry) {
      totalMsRef.current = 1;
    } else {
      const createdRaw = props.offer.created_at;
      const createdAtMs =
        createdRaw != null && String(createdRaw).trim() !== ""
          ? Date.parse(String(createdRaw))
          : NaN;
      if (Number.isFinite(createdAtMs) && createdAtMs < expiresAtMs) {
        totalMsRef.current = Math.max(1, expiresAtMs - createdAtMs);
      } else {
        totalMsRef.current = Math.max(1, expiresAtMs - Date.now());
      }
    }
  }
  const totalMs = totalMsRef.current ?? 1;
  const progress = hasValidExpiry ? Math.min(100, Math.max(0, (remainingMs / totalMs) * 100)) : 0;

  if (hasValidExpiry && remainingMs <= 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="px-6 pt-8 pb-4 border-b border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900">Nueva oferta</h2>
        <p className="text-sm text-gray-500 mt-1">Acepta antes de que expire</p>
        {hasValidExpiry ? (
          <>
            <p className="text-sm font-medium text-gray-800 mt-3">
              {`Expira en ${Math.max(0, Math.ceil(remainingMs / 1000))}s`}
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#3A86FF] transition-[width] duration-300 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 mt-3">Sin tiempo de expiración</p>
        )}
      </div>

      <div className="flex-1 px-6 py-6 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Recoger en</p>
          <p className="text-base font-medium text-gray-900 mt-1">
            {props.offer.origin || "Origen no disponible"}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Entregar en</p>
          <p className="text-base font-medium text-gray-900 mt-1">
            {props.offer.destination || "Destino no disponible"}
          </p>
        </div>
      </div>

      <div className="px-6 pb-8 pt-4 border-t border-gray-100 space-y-3">
        <Button
          type="button"
          disabled={props.isAccepting}
          onClick={() => void props.onAccept()}
          className="w-full bg-[#2A9D8F] hover:bg-[#238b7e] text-white disabled:opacity-70"
        >
          {props.isAccepting ? "Aceptando..." : "Aceptar"}
        </Button>
        <button type="button" className="w-full text-sm font-medium text-gray-500">
          Omitir
        </button>
      </div>
    </div>
  );
}

function AssignedView(props: {
  service: BackendService;
  onStart: () => Promise<void> | void;
  isStarting: boolean;
}) {
  return (
    <div className="min-h-screen bg-orange-50 flex flex-col px-6 py-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6">
        <h1 className="text-2xl font-bold text-gray-900">Servicio asignado</h1>

        <div className="space-y-5 rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Recoger en</p>
            <p className="mt-1 text-base font-medium text-gray-900">
              {props.service.origin || "Origen no disponible"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Entregar en</p>
            <p className="mt-1 text-base font-medium text-gray-900">
              {props.service.destination || "Destino no disponible"}
            </p>
          </div>
        </div>

        <Button
          type="button"
          disabled={props.isStarting}
          onClick={() => void props.onStart()}
          className="w-full bg-[#2A9D8F] hover:bg-[#238b7e] text-white disabled:opacity-70"
        >
          {props.isStarting ? "Iniciando..." : "Iniciar servicio"}
        </Button>
      </div>
    </div>
  );
}

function InServiceView(props: {
  service: BackendService;
  setSelectedService: Dispatch<SetStateAction<BackendService | null>>;
  closePin: string;
  setClosePin: Dispatch<SetStateAction<string>>;
  onCloseService: () => void | Promise<void>;
  closingServiceId: string | null;
  onReportIncident: (service: BackendService) => void;
  validationError: string;
  onOpenCloseValidationSafe: (service: BackendService) => void | Promise<void>;
  evidences: ServiceEvidence[];
  onSelectEvidenceFile: (file: File | null) => void;
  onUploadEvidence: (service: BackendService) => void | Promise<void>;
  evidenceFile: File | null;
  evidencePreviewUrl: string | null;
  uploadingEvidenceServiceId: string | null;
}) {
  const evidenceFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    props.setSelectedService(props.service);
  }, [props.service.service_id]);

  const isClosing = props.closingServiceId === props.service.service_id;
  const isPinValid = props.closePin.trim().length === 4;
  const isUploading = props.uploadingEvidenceServiceId === props.service.service_id;

  return (
    <div className="min-h-screen bg-green-50 flex flex-col px-6 py-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6">
        <h1 className="text-2xl font-bold text-gray-900">Servicio en curso</h1>

        <div className="space-y-5 rounded-xl border border-green-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Recoger en</p>
            <p className="mt-1 text-base font-medium text-gray-900">
              {props.service.origin || "Origen no disponible"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Entregar en</p>
            <p className="mt-1 text-base font-medium text-gray-900">
              {props.service.destination || "Destino no disponible"}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-green-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Evidencia</span>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              {props.evidences.length > 0 ? (
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg py-0.5 pl-0.5 pr-1 transition hover:bg-gray-50"
                  onClick={() => void props.onOpenCloseValidationSafe(props.service)}
                  aria-label={`${props.evidences.length} evidencias registradas, actualizar lista`}
                >
                  <img
                    src={props.evidences[0].file_url}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-md border border-gray-200/90 object-cover opacity-90"
                  />
                  <span className="rounded-full bg-[#2A9D8F]/12 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#2A9D8F]">
                    {props.evidences.length}
                  </span>
                </button>
              ) : null}
              <input
                ref={evidenceFileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                tabIndex={-1}
                onChange={(e) => {
                  props.onSelectEvidenceFile(e.target.files?.[0] || null);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={isUploading}
                className="rounded-full border border-[#2A9D8F]/30 bg-[#2A9D8F]/10 p-2.5 text-[#2A9D8F] shadow-sm transition hover:bg-[#2A9D8F]/18 disabled:opacity-50"
                aria-label="Tomar o elegir foto"
                onClick={() => evidenceFileInputRef.current?.click()}
              >
                <Camera className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
          {props.evidencePreviewUrl ? (
            <img
              src={props.evidencePreviewUrl}
              alt="Vista previa"
              className="mt-3 max-h-24 w-full rounded-lg border border-gray-200/80 object-contain"
            />
          ) : null}
          {props.evidenceFile ? (
            <Button
              type="button"
              disabled={isUploading}
              onClick={() => void props.onUploadEvidence(props.service)}
              className="mt-3 w-full bg-[#2A9D8F] hover:bg-[#238b7e] text-white disabled:opacity-70"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Subiendo...
                </>
              ) : (
                "Subir evidencia"
              )}
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="in-service-close-pin">PIN de cierre</Label>
          <Input
            id="in-service-close-pin"
            type="password"
            placeholder="••••"
            value={props.closePin}
            onChange={(e) =>
              props.setClosePin(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            className="font-mono text-lg tracking-wider"
            maxLength={4}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          {!props.validationError ? (
            <p className="text-xs text-gray-500">Ingresa el PIN de cierre de 4 dígitos</p>
          ) : null}
        </div>

        {props.validationError ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" aria-hidden />
            <p className="text-sm text-red-700">{props.validationError}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            disabled={isClosing || !isPinValid}
            onClick={() => void props.onCloseService()}
            className="w-full bg-[#2A9D8F] hover:bg-[#238b7e] text-white disabled:opacity-70"
          >
            {isClosing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Finalizando...
              </>
            ) : (
              "Finalizar servicio"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void props.onReportIncident(props.service)}
            className="w-full text-gray-600"
          >
            Reportar incidente
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MensajeroPanel() {
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

  /**
   * actor_id de sesión: depender del valor primitivo user.actor_id (no solo de la referencia `user`).
   * Mientras loading === true no usamos actor de sesión (actorId queda vacío; la UI muestra "Cargando sesión...").
   */
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
      const data = await apiGet<{ services: BackendService[] }>(
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

  const loadServiceEvidences = useCallback(async (serviceId: string, silent = false) => {
    setLoadingEvidenceServiceId(serviceId);
    try {
      const data = await apiGet<{ evidences: ServiceEvidence[] }>(
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
      // Error auxiliar: no debe romper ni confundir flujo principal (accept/start/close).
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
      await apiPost(`/v1/services/${service.service_id}/start`, {
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
      await apiPost(`/v1/services/${service.service_id}/cancel-by-messenger`, {
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
      await apiPost(`/v1/services/${service.service_id}/report-incident`, {
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
    if (!actorId) {
      toast.error("No hay actor_id disponible para el mensajero");
      return false;
    }

    if (!isValidUuid(actorId)) {
      toast.error("El Mensajero ID debe ser un UUID válido");
      return false;
    }

    if (!evidenceFile) {
      toast.error("Debes seleccionar una foto primero");
      return false;
    }

    setUploadingEvidenceServiceId(service.service_id);

    try {
      const formData = new FormData();
      formData.append("file", evidenceFile);
      formData.append("actor_role", "mensajero");
      formData.append("actor_id", actorId);
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

      await http.post(`/v1/services/${service.service_id}/evidences`, formData);

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
      await apiPost(`/v1/services/${selectedService.service_id}/close`, {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" aria-hidden />
          <p className="text-sm">Cargando sesión...</p>
        </div>
      </div>
    );
  }

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

  const activeService = selectedService && selectedService.status === "STARTED"
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

  if (uiState === "OFFLINE") {
    return <OfflineView onToggle={() => void handleToggleAvailability()} />;
  }
  if (uiState === "AVAILABLE") {
    return (
      <AvailableView
        onToggleOffline={() => void handleToggleAvailability()}
        onLogout={() => void handleLogout()}
      />
    );
  }
  if (uiState === "OFFER" && firstOffer) {
    return (
      <OfferView
        offer={firstOffer}
        onAccept={() => handleAcceptService(firstOffer.service_id, firstOffer)}
        isAccepting={claimingServiceId === firstOffer.service_id}
      />
    );
  }
  if (uiState === "ASSIGNED" && dispatchCurrentService) {
    return (
      <AssignedView
        service={dispatchCurrentService}
        onStart={() => handleStartService(dispatchCurrentService)}
        isStarting={startingServiceId === dispatchCurrentService.service_id}
      />
    );
  }
  if (uiState === "IN_SERVICE" && dispatchCurrentService) {
    return (
      <InServiceView
        service={dispatchCurrentService}
        setSelectedService={setSelectedService}
        closePin={closePin}
        setClosePin={setClosePin}
        onCloseService={handleCloseService}
        closingServiceId={closingServiceId}
        onReportIncident={handleReportIncident}
        validationError={validationError}
        onOpenCloseValidationSafe={loadEvidencesForService}
        evidences={evidencesByService[dispatchCurrentService.service_id] ?? []}
        onSelectEvidenceFile={handleSelectEvidenceFile}
        onUploadEvidence={(s) => void uploadEvidenceForService(s)}
        evidenceFile={evidenceFile}
        evidencePreviewUrl={evidencePreviewUrl}
        uploadingEvidenceServiceId={uploadingEvidenceServiceId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1E3A5F] text-white p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/")} className="p-2 hover:bg-white/10 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <img
                src={rutafyLogo}
                alt="Rutafy"
                className="w-12 h-12 object-contain rounded-lg bg-white/10 p-1"
              />
              <div>
                <h1 className="text-xl font-bold">Panel Mensajero</h1>
                <p className="text-white/70 text-sm">{effectiveMessengerName || "Usuario"}</p>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {!loading && showPrimaryOfferHero && (
          <Card className="mb-6 border-2 border-[#1E3A5F] shadow-lg overflow-hidden rounded-2xl">
            <CardHeader className="bg-[#1E3A5F] text-white py-4 rounded-t-[calc(1rem-2px)]">
              <CardTitle className="text-lg font-semibold tracking-tight">Oferta activa</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {loadingAvailable ? (
                <div className="flex items-center gap-3 text-gray-600">
                  <Loader2 className="h-6 w-6 animate-spin shrink-0 text-[#1E3A5F]" aria-hidden />
                  <span>Buscando servicios...</span>
                </div>
              ) : availableServices.length === 0 ? (
                <p className="text-gray-600 text-center py-6">Buscando servicios...</p>
              ) : (
                (() => {
                  const svc = availableServices[0];
                  const primaryOfferId = offerIdByServiceId[svc.service_id] ?? "";
                  return (
                    <div className="space-y-4">
                      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2">
                        <p className="text-xs text-gray-500">
                          <span className="font-medium text-gray-700">service_id</span>
                          <span className="font-mono block break-all text-[#1E3A5F] mt-0.5">
                            {svc.service_id}
                          </span>
                        </p>
                        {primaryOfferId ? (
                          <p className="text-xs text-gray-500">
                            <span className="font-medium text-gray-700">offer_id</span>
                            <span className="font-mono block break-all text-[#1E3A5F] mt-0.5">
                              {primaryOfferId}
                            </span>
                          </p>
                        ) : null}
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">Tipo:</span> {getServiceTypeLabel(svc.service_type)}
                        </p>
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">Origen:</span> {getOrigin(svc)}
                        </p>
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">Destino:</span> {getDestination(svc)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="lg"
                        className="w-full bg-[#2A9D8F] hover:bg-[#238b7e] text-base font-semibold h-12 rounded-xl"
                        onClick={() => handleAcceptService(svc.service_id, svc)}
                        disabled={
                          claimingServiceId === svc.service_id ||
                          !hasAuthenticatedActor ||
                          !sessionActorId ||
                          !isValidUuid(sessionActorId)
                        }
                      >
                        {claimingServiceId === svc.service_id ? (
                          <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />
                        ) : null}
                        Aceptar servicio
                      </Button>
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
        )}

        {hasAuthenticatedActor && (
          <div className="mb-4">
            <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 text-xs font-medium px-3 py-1">
              Sesión verificada
            </span>
          </div>
        )}

        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    isOnline ? "bg-green-100" : "bg-gray-100"
                  }`}
                >
                  <Package
                    className={`w-8 h-8 ${isOnline ? "text-green-600" : "text-gray-400"}`}
                  />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {isOnline ? "Estás en línea" : "Estás desconectado"}
                  </h2>
                  <p className="text-gray-500">
                    {isOnline
                      ? "Recibiendo ofertas activas del backend real"
                      : "No recibirás ofertas activas"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Mensajero ID: {actorId || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border px-2 py-1 bg-white">
                  <span className="text-xs text-gray-500">Estado</span>
                  <button
                    type="button"
                    onClick={() => void handleToggleAvailability()}
                    disabled={
                      availabilitySyncing ||
                      !actorId ||
                      !isValidUuid(actorId) ||
                      loading
                    }
                    className={`p-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isOnline ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                    }`}
                    aria-label={isOnline ? "Desconectarse" : "Conectarse"}
                  >
                    {availabilitySyncing ? (
                      <Loader2 className="w-8 h-8 animate-spin" aria-hidden />
                    ) : isOnline ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refreshMyServices();
                    if (isOnline) refreshAvailableServices();
                    if (selectedService) loadServiceEvidences(selectedService.service_id);
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refrescar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dispatch V1: SERVICIO ACTIVO o OFERTAS ACTIVAS */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[#1E3A5F]">
              {dispatchCurrentService ? "SERVICIO ACTIVO" : "OFERTAS ACTIVAS"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dispatchCurrentService ? (
              <>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Tipo:</span>{" "}
                    {getServiceTypeLabel(dispatchCurrentService.service_type)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Código:</span>{" "}
                    <span className="font-mono">{getServiceCode(dispatchCurrentService)}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Origen:</span>{" "}
                    {getOrigin(dispatchCurrentService)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Destino:</span>{" "}
                    {getDestination(dispatchCurrentService)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium text-gray-800">Estado:</span>{" "}
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(
                        dispatchCurrentService.status
                      )}`}
                    >
                      {getStatusLabel(dispatchCurrentService.status)}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dispatchCurrentService.status === "CLAIMED" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleStartService(dispatchCurrentService)}
                        disabled={startingServiceId === dispatchCurrentService.service_id}
                        className="bg-[#2A9D8F] hover:bg-[#238b7e]"
                      >
                        {startingServiceId === dispatchCurrentService.service_id ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : null}
                        Iniciar servicio
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleCancelService(dispatchCurrentService)}
                      >
                        Cancelar servicio
                      </Button>
                    </>
                  )}
                  {dispatchCurrentService.status === "STARTED" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedService(dispatchCurrentService);
                          setTimeout(() => {
                            document.getElementById("cierre-operativo")?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }, 100);
                        }}
                        className="bg-amber-500 hover:bg-amber-600"
                      >
                        Finalizar servicio
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleReportIncident(dispatchCurrentService)}
                      >
                        Reportar inconveniente
                      </Button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                {!isOnline ? (
                  <p className="text-sm text-gray-500">
                    Activa &quot;Estás en línea&quot; para ver ofertas activas.
                  </p>
                ) : availableServices.length === 0 && !loadingAvailable ? (
                  <p className="text-sm text-gray-500">Buscando servicios...</p>
                ) : (
                  <div className="space-y-3">
                    {availableServices.map((service) => (
                      <Card
                        key={service.service_id}
                        className="border-0 shadow-sm border-l-4 border-l-[#2A9D8F]"
                      >
                        <CardContent className="p-4">
                          <p className="text-xs text-gray-500 mb-1">
                            {getServiceTypeLabel(service.service_type)}
                          </p>
                          <p className="font-mono text-sm font-semibold text-[#1E3A5F] mb-1">
                            {getServiceCode(service)}
                          </p>
                          <p className="text-sm text-gray-600 mb-3">
                            {getOrigin(service)} → {getDestination(service)}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptService(service.service_id, service)}
                            disabled={
                              claimingServiceId === service.service_id || !isValidUuid(actorId)
                            }
                            className="w-full sm:w-auto bg-[#2A9D8F] hover:bg-[#238b7e]"
                          >
                            {claimingServiceId === service.service_id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : null}
                            Aceptar oferta
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="mb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowFullQueues(!showFullQueues)}
            className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {showFullQueues ? "Ocultar bandeja completa" : "Ver bandeja completa"}
          </Button>
        </div>

        {showFullQueues && (
          <>
        {isOnline && !showPrimaryOfferHero && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#2A9D8F]" />
                Ofertas Activas ({availableServices.length})
              </h3>

              {loadingAvailable && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando ofertas...
                </div>
              )}
            </div>

            {availableServices.length === 0 && !loadingAvailable ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-sm text-gray-500">
                  No hay ofertas activas en este momento.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {availableServices.map((service) => (
                  <Card
                    key={service.service_id}
                    className="border-0 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-medium text-gray-800">
                              {getServiceCode(service)} - {getServiceTypeLabel(service.service_type)}
                            </p>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusBadgeClass(
                                service.status
                              )}`}
                            >
                              {getStatusLabel(service.status)}
                            </span>
                          </div>

                          <p className="text-sm text-gray-500 truncate">
                            {getOrigin(service)} → {getDestination(service)}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleAcceptService(service.service_id, service)}
                          disabled={claimingServiceId === service.service_id || !isValidUuid(actorId)}
                          className="bg-[#2A9D8F] hover:bg-[#238b7e]"
                        >
                          {claimingServiceId === service.service_id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : null}
                          Aceptar oferta
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <Package className="w-5 h-5 text-yellow-600" />
              Reclamados / Pendientes de iniciar ({claimedServices.length})
            </h3>

            {loadingMyServices && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando mis servicios...
              </div>
            )}
          </div>

          {claimedServices.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-sm text-gray-500">
                No tienes servicios reclamados pendientes de iniciar.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {claimedServices.map((service) => (
                <Card key={service.service_id} className="border-0 shadow-sm border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-medium text-gray-800">
                            {getServiceCode(service)} - {getServiceTypeLabel(service.service_type)}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(
                              service.status
                            )}`}
                          >
                            {getStatusLabel(service.status)}
                          </span>
                        </div>

                        <p className="text-sm text-gray-500">
                          {getOrigin(service)} → {getDestination(service)}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleStartService(service)}
                        disabled={startingServiceId === service.service_id}
                        className="bg-yellow-500 hover:bg-yellow-600"
                      >
                        {startingServiceId === service.service_id ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-1" />
                        )}
                        Iniciar servicio
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {activeService && (
          <Card className="mb-6 border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-blue-50 border-b">
              <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                <ShieldCheck className="w-5 h-5" />
                Servicio en curso {getServiceCode(activeService)}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="text-xs text-gray-500 uppercase">Origen</p>
                  <p className="font-medium text-gray-800 text-sm mt-1">{getOrigin(activeService)}</p>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="text-xs text-gray-500 uppercase">Destino</p>
                  <p className="font-medium text-gray-800 text-sm mt-1">{getDestination(activeService)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => openCloseValidation(activeService)}
                  className="bg-[#1E3A5F] hover:bg-[#17304f]"
                >
                  Gestionar evidencia y cierre
                </Button>

                <Button
                  variant="outline"
                  onClick={() => loadServiceEvidences(activeService.service_id)}
                  disabled={loadingEvidenceServiceId === activeService.service_id}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${
                      loadingEvidenceServiceId === activeService.service_id ? "animate-spin" : ""
                    }`}
                  />
                  Ver evidencias
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
          </>
        )}

        {selectedService && (
          <Card id="cierre-operativo" className="mb-6 border-2 border-[#2A9D8F] shadow-lg">
            <CardHeader className="bg-[#2A9D8F]/10">
              <CardTitle className="text-lg flex items-center gap-2 text-[#1E3A5F]">
                <Package className="w-5 h-5" />
                Cierre operativo {getServiceCode(selectedService)}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 border p-4">
                  <p className="text-sm text-gray-600">
                    <strong>Origen:</strong> {getOrigin(selectedService)}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Destino:</strong> {getDestination(selectedService)}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Tipo:</strong> {getServiceTypeLabel(selectedService.service_type)}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Estado:</strong>{" "}
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(
                        selectedService.status
                      )}`}
                    >
                      {getStatusLabel(selectedService.status)}
                    </span>
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    Evidencia fotográfica
                  </p>
                  <p className="text-sm text-blue-800">
                    Es <strong>opcional pero recomendada</strong>. La foto debe tomarse
                    antes del cierre para dejar trazabilidad operativa.
                  </p>

                  <div className="mt-3 text-xs text-blue-700 space-y-1">
                    <p>
                      Evidencias cargadas:{" "}
                      <strong>{selectedServiceEvidences.length}</strong>
                    </p>
                    <p>
                      Retención estándar: <strong>30 días</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Camera className="w-5 h-5 text-[#2A9D8F]" />
                      Adjuntar evidencia
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Toma una foto o selecciona una desde galería antes de finalizar.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRequestLocation}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {locationRequested ? "Actualizar GPS" : "Capturar GPS"}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Label
                    htmlFor="evidence-camera"
                    className="inline-flex items-center justify-center rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white cursor-pointer hover:bg-[#238b7e]"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Tomar foto
                  </Label>

                  <input
                    id="evidence-camera"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleSelectEvidenceFile(e.target.files?.[0] || null)}
                  />

                  <Label
                    htmlFor="evidence-gallery"
                    className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Subir desde galería
                  </Label>

                  <input
                    id="evidence-gallery"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleSelectEvidenceFile(e.target.files?.[0] || null)}
                  />

                  {evidenceFile && (
                    <Button variant="outline" onClick={clearEvidenceDraft}>
                      <X className="w-4 h-4 mr-2" />
                      Limpiar selección
                    </Button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-lg border bg-gray-50 min-h-[220px] flex items-center justify-center overflow-hidden">
                    {evidencePreviewUrl ? (
                      <img
                        src={evidencePreviewUrl}
                        alt="Vista previa evidencia"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-gray-400 px-6">
                        <ImageIcon className="w-10 h-10 mx-auto mb-3" />
                        <p className="text-sm">Aún no has seleccionado una evidencia.</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="evidence-note">Nota opcional</Label>
                      <Input
                        id="evidence-note"
                        placeholder="Ej: documento entregado en ventanilla"
                        value={evidenceNote}
                        onChange={(e) => setEvidenceNote(e.target.value)}
                      />
                    </div>

                    <div className="rounded-lg border bg-white p-3 text-sm text-gray-600 space-y-1">
                      <p>
                        <strong>Archivo:</strong> {evidenceFile?.name || "No seleccionado"}
                      </p>
                      <p>
                        <strong>Tamaño:</strong>{" "}
                        {evidenceFile ? `${(evidenceFile.size / 1024).toFixed(1)} KB` : "-"}
                      </p>
                      <p>
                        <strong>GPS:</strong>{" "}
                        {currentLat !== null && currentLng !== null
                          ? `${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`
                          : "No capturado"}
                      </p>
                    </div>

                    <Button
                      onClick={() => uploadEvidenceForService(selectedService)}
                      disabled={
                        !evidenceFile ||
                        uploadingEvidenceServiceId === selectedService.service_id
                      }
                      className="w-full bg-[#2A9D8F] hover:bg-[#238b7e]"
                    >
                      {uploadingEvidenceServiceId === selectedService.service_id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Subir evidencia
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-semibold text-gray-800">Evidencias registradas</h3>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadServiceEvidences(selectedService.service_id)}
                    disabled={loadingEvidenceServiceId === selectedService.service_id}
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-2 ${
                        loadingEvidenceServiceId === selectedService.service_id ? "animate-spin" : ""
                      }`}
                    />
                    Recargar
                  </Button>
                </div>

                {selectedServiceEvidences.length === 0 ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                    Este servicio aún no tiene evidencia cargada.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedServiceEvidences.map((evidence) => {
                      const evidenceUrl = buildAbsoluteUrl(evidence.file_url);

                      return (
                        <div
                          key={evidence.evidence_id}
                          className="rounded-lg border bg-white p-3 flex flex-col md:flex-row md:items-center gap-4"
                        >
                          <div className="w-full md:w-32 h-24 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                            {evidenceUrl ? (
                              <img
                                src={evidenceUrl}
                                alt="Evidencia"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-gray-400" />
                            )}
                          </div>

                          <div className="flex-1 text-sm text-gray-600 space-y-1">
                            <p>
                              <strong>Tipo:</strong> {evidence.kind}
                            </p>
                            <p>
                              <strong>Fecha:</strong> {formatDateTime(evidence.created_at)}
                            </p>
                            <p>
                              <strong>Retención hasta:</strong>{" "}
                              {formatDateTime(evidence.retention_until)}
                            </p>
                            <p>
                              <strong>Nota:</strong> {evidence.note || "-"}
                            </p>
                            <p>
                              <strong>GPS:</strong>{" "}
                              {evidence.lat !== null && evidence.lng !== null
                                ? `${evidence.lat}, ${evidence.lng}`
                                : "-"}
                            </p>
                          </div>

                          {evidenceUrl && (
                            <a
                              href={evidenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-gray-50"
                            >
                              Ver foto
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedService.status === "STARTED" && (
                <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4 space-y-2">
                  <h3 className="font-semibold text-green-900 text-base">
                    Listo para cerrar
                  </h3>
                  {(selectedService as any).service_code && (
                    <p className="text-sm text-green-800 font-mono">
                      Código: {(selectedService as any).service_code}
                    </p>
                  )}
                  <p className="text-sm text-green-800">
                    Confirma el PIN de cierre para finalizar el servicio.
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-4">
                <div>
                  <h3 className="font-semibold text-green-900">Finalizar servicio</h3>
                  <p className="text-sm text-green-800 mt-1">
                    La evidencia ya fue prevista antes del cierre. Ahora finaliza con el PIN.
                  </p>
                </div>

                <div>
                  <Label htmlFor="close-pin">PIN de cierre</Label>
                  <Input
                    id="close-pin"
                    type="password"
                    placeholder="••••"
                    value={closePin}
                    onChange={(e) => setClosePin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="font-mono text-lg tracking-wider"
                    maxLength={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ingresa únicamente el PIN de cierre de 4 dígitos.
                  </p>
                </div>

                {validationError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-red-700 text-sm">{validationError}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleCloseService}
                    disabled={
                      closePin.length !== 4 ||
                      closingServiceId === selectedService.service_id
                    }
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {closingServiceId === selectedService.service_id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Finalizar servicio
                  </Button>

                  <Button variant="outline" onClick={() => setSelectedService(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {startedServices.length > 1 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Otros en progreso ({startedServices.length - 1})
            </h3>

            <div className="space-y-3">
              {startedServices
                .filter((service) => service.service_id !== activeService?.service_id)
                .map((service) => (
                  <Card key={service.service_id} className="border-0 shadow-sm border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-medium text-gray-800">
                              {getServiceCode(service)} - {getServiceTypeLabel(service.service_type)}
                            </p>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(
                                service.status
                              )}`}
                            >
                              {getStatusLabel(service.status)}
                            </span>
                          </div>

                          <p className="text-sm text-gray-500">
                            {getOrigin(service)} → {getDestination(service)}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => openCloseValidation(service)}
                          className="bg-[#1E3A5F] hover:bg-[#17304f]"
                        >
                          Gestionar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-[#1E3A5F]">
                {claimedServices.length + startedServices.length}
              </p>
              <p className="text-sm text-gray-500">Activos</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-[#1E3A5F]">{completedServices.length}</p>
              <p className="text-sm text-gray-500">Cerrados</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{myServices.length}</p>
              <p className="text-sm text-gray-500">Total</p>
            </CardContent>
          </Card>
        </div>

        {completedServices.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-green-600" />
              Historial cerrados ({completedServices.length})
            </h3>

            <div className="space-y-3">
              {completedServices.slice(0, 5).map((service) => (
                <Card key={service.service_id} className="border-0 shadow-sm border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {getServiceCode(service)} - {getServiceTypeLabel(service.service_type)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {getOrigin(service)} → {getDestination(service)}
                        </p>
                      </div>

                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Cerrado
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {terminalOtherServices.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Incidencias / terminales ({terminalOtherServices.length})
            </h3>

            <div className="space-y-3">
              {terminalOtherServices.slice(0, 5).map((service) => (
                <Card key={service.service_id} className="border-0 shadow-sm border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {getServiceCode(service)} - {getServiceTypeLabel(service.service_type)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {getOrigin(service)} → {getDestination(service)}
                        </p>
                      </div>

                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                          service.status
                        )}`}
                      >
                        {getStatusLabel(service.status)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Perfil operativo del mensajero
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Nombre</span>
                <span className="font-medium">{effectiveMessengerName || "-"}</span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500 flex items-center gap-2">
                  <IdCard className="w-4 h-4" />
                  Documento
                </span>
                <span className="font-medium">{manualDocument || "-"}</span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Cel / WhatsApp
                </span>
                <span className="font-medium">{manualPhone || "-"}</span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{effectiveMessengerEmail}</span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Rol</span>
                <span className="px-2 py-1 bg-[#1E3A5F]/10 text-[#1E3A5F] rounded-full text-sm font-medium">
                  Mensajero
                </span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Actor ID backend</span>
                <span className="font-medium text-right break-all">{actorId || "-"}</span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Fuente del actor</span>
                <span className="font-medium capitalize">{actorSourceLabel}</span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-gray-500">Estado</span>
                <span
                  className={`px-2 py-1 rounded-full text-sm font-medium ${
                    isOnline ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {isOnline ? "En línea" : "Desconectado"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <details className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50/60">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100/80 rounded-xl">
            Detalles técnicos
          </summary>
          <div className="px-4 pb-4 pt-0 border-t border-gray-200 space-y-4">
            <Card className="mt-4 border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1E3A5F]">Estado de sesión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-gray-700">
                  Autenticación:{" "}
                  <span className={hasAuthenticatedActor ? "text-green-700 font-medium" : "text-amber-700 font-medium"}>
                    {hasAuthenticatedActor ? "verificada" : "sin actor de sesión válido"}
                  </span>
                </p>
                <p className="text-gray-700">
                  Fuente actor: <span className="font-medium">{actorSourceLabel}</span>
                </p>
                <p className="font-mono text-xs break-all text-[#1E3A5F]">
                  actor_id sesión: {sessionActorId || "(vacío)"}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-blue-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1E3A5F]">Override manual (desarrollo)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-3 rounded-lg text-sm ${hasAuthenticatedActor ? "bg-amber-50 text-amber-900" : "bg-blue-50 text-blue-900"}`}>
                  {hasAuthenticatedActor
                    ? "Con sesión válida, este override no reemplaza el actor autenticado."
                    : "Sin actor de sesión válido, este override permite operar en modo de prueba."}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="manual-name">Nombre del mensajero</Label>
                    <Input
                      id="manual-name"
                      value={manualMessengerName}
                      onChange={(e) => setManualMessengerName(e.target.value)}
                      placeholder="Nombre de prueba"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manual-actor-id">Mensajero ID (UUID para backend)</Label>
                    <Input
                      id="manual-actor-id"
                      value={manualActorId}
                      onChange={(e) => setManualActorId(e.target.value.trim())}
                      placeholder="UUID del mensajero"
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manual-document">Documento</Label>
                    <Input
                      id="manual-document"
                      value={manualDocument}
                      onChange={(e) => setManualDocument(e.target.value.replace(/\D/g, ""))}
                      placeholder="Documento (opcional)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manual-phone">Celular / WhatsApp</Label>
                    <Input
                      id="manual-phone"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="Celular (opcional)"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </details>
      </div>
    </div>
  );
}