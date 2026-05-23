import { useAuth } from "@/_core/hooks/useAuth";
import { http } from "@/api/http";
import { cancelServiceByTransportista, createService } from "@/api/services";
import { useTransportistaOperationalState } from "@/hooks/useTransportistaOperationalState";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OperationalParticipantCard } from "@/components/OperationalParticipantCard";
import { formatServiceRouteEndpoint } from "@/lib/formatOperationalLocation";
import {
  normalizeOperationalParticipant,
  type OperationalParticipant,
} from "@/lib/operationalParticipant";
import type { RequesterProfile } from "@/authUser";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "wouter";
import {
  FileDoc,
  Package as PhosphorPackage,
  ClipboardText,
  Motorcycle,
  MapPinLine,
  NavigationArrow,
  CrosshairSimple,
} from "@phosphor-icons/react";
import {
  Truck,
  History,
  User,
  LogOut,
  ArrowLeft,
  Building2,
  MapPin,
  Copy,
  Check,
  KeyRound,
  MapPinned,
  RefreshCw,
  ChevronRight,
  Home,
  MessageSquarePlus,
  Loader2,
  Ban,
} from "lucide-react";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type ServiceMode = "EMPRESA" | "LIBRE";
type UiServiceType = "DOCS" | "PACKAGE" | "COMPLIANCE" | "TRANSPORT";
type LocationMode = "NODE" | "FREE";
type RequestFlow = "NOW" | "SCHEDULED";
type ExpandedPanel = "NOW" | "SCHEDULED" | null;
type TransportistaTab = "home" | "activity" | "account";

type CreatedServiceInfo = {
  id: string;
  serviceCode: string;
  closePin: string;
};

type LocalServiceItem = {
  id: string;
  status: string;
  origin: string;
  destination: string;
  createdAt: string;
  serviceCode: string;
  closePin: string;
  serviceMode: ServiceMode;
  requestMode: RequestFlow;
  scheduledFor?: string | null;
  serviceType?: string;
  fare_amount?: number | string | null;
  fare_currency?: string | null;
  vehicle_plate?: string | null;
  operational_instructions?: string | null;
  estimated_route_distance_km?: number | null;
  estimated_route_duration_minutes?: number | null;
  eta_pickup_at?: string | null;
  eta_delivery_at?: string | null;
  sla_pickup_deadline_at?: string | null;
  sla_delivery_deadline_at?: string | null;
  assigned_messenger?: OperationalParticipant | null;
};

type BackendCreateServiceResponse = Record<string, unknown>;

type NodeItemMetadata = {
  search_aliases?: string[];
  aliases?: string[];
  subnodes?: Array<{ label?: string; name?: string }>;
  [key: string]: unknown;
};

type NodeItem = {
  node_id: string;
  code: string;
  name: string;
  category: string;
  zone: string | null;
  lat: number;
  lng: number;
  address_text: string | null;
  is_active: boolean;
  marketplace_enabled?: boolean;
  metadata?: NodeItemMetadata;
};

type NodesListResponse = {
  trace_id?: string;
  nodes?: NodeItem[];
  error?: string;
};

type BackendServiceRow = {
  service_id?: string;
  id?: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
  origin?: string | Record<string, unknown> | null;
  destination?: string | Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
  serviceCode?: string;
  service_code?: string;
  closePin?: string;
  close_pin?: string;
  requester_company_id?: string;
  request_mode?: string;
  scheduled_for?: string | null;
  service_type?: string;
  fare_amount?: number | string | null;
  fare_currency?: string | null;
  vehicle_plate?: string | null;
  vehiclePlate?: string | null;
  operational_instructions?: string | null;
  estimated_route_distance_km?: number | null;
  estimated_route_duration_minutes?: number | null;
  eta_pickup_at?: string | null;
  eta_delivery_at?: string | null;
  sla_pickup_deadline_at?: string | null;
  sla_delivery_deadline_at?: string | null;
  assigned_messenger?: unknown;
};

type BackendServicesListResponse = {
  trace_id?: string;
  services?: BackendServiceRow[];
  error?: string;
};

/** Respuesta de GET /v1/services/:id/evidences (campos usados en UI). */
type ServiceEvidenceItem = {
  evidence_id: string;
  kind: string;
  file_url: string;
  mime_type: string | null;
  note: string | null;
  created_at: string;
};

const RAW_EVIDENCE_API_BASE =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  typeof import.meta.env.VITE_RUTAFY_API_BASE === "string"
    ? import.meta.env.VITE_RUTAFY_API_BASE.trim()
    : "";

const EVIDENCE_ASSETS_BASE =
  RAW_EVIDENCE_API_BASE && /^https?:\/\//i.test(RAW_EVIDENCE_API_BASE)
    ? RAW_EVIDENCE_API_BASE.replace(/\/+$/, "")
    : "https://api.rutafy.app";

function buildEvidenceAbsoluteUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return `${EVIDENCE_ASSETS_BASE}${fileUrl}`;
}

const DEFAULT_REQUESTER_COMPANY_ID = "1e62b8f8-b4ec-4d9a-9d8b-0015bf97d01a";

const statusLabels: Record<string, string> = {
  REQUESTED: "Solicitado",
  OFFERED: "Buscando",
  CLAIMED: "Tomado",
  STARTED: "En curso",
  CLOSED: "Cerrado",
  EXPIRED: "Expirado",
  CANCELLED_BY_TRANSPORTER: "Cancelado por transportista",
  CANCELLED_BY_MESSENGER: "Cancelado por mensajero",
  FAILED_PICKUP: "Falló recogida",
  FAILED_DROPOFF: "Falló entrega",
  NO_SHOW: "No show",
};

const statusColors: Record<string, string> = {
  REQUESTED: "bg-yellow-100 text-yellow-700",
  OFFERED: "bg-amber-100 text-amber-700",
  CLAIMED: "bg-blue-100 text-blue-700",
  STARTED: "bg-indigo-100 text-indigo-700",
  CLOSED: "bg-green-100 text-green-700",
  EXPIRED: "bg-gray-100 text-gray-700",
  CANCELLED_BY_TRANSPORTER: "bg-red-100 text-red-700",
  CANCELLED_BY_MESSENGER: "bg-red-100 text-red-700",
  FAILED_PICKUP: "bg-orange-100 text-orange-700",
  FAILED_DROPOFF: "bg-orange-100 text-orange-700",
  NO_SHOW: "bg-zinc-100 text-zinc-700",
};

const progressSteps: Array<{ key: string; label: string }> = [
  { key: "REQUESTED", label: "Solicitado" },
  { key: "OFFERED", label: "Buscando" },
  { key: "CLAIMED", label: "Asignado" },
  { key: "STARTED", label: "En ruta" },
  { key: "CLOSED", label: "Finalizado" },
];

/** Estados en los que el transportista puede cancelar antes de que un mensajero tome el servicio. */
const TRANSPORTISTA_CANCELABLE_STATUSES = new Set([
  "REQUESTED",
  "PENDING",
  "SEARCHING",
  "OFFERED",
]);

function isTransportistaCancelableServiceStatus(status: string): boolean {
  return TRANSPORTISTA_CANCELABLE_STATUSES.has(String(status || "").toUpperCase());
}

function getProgressStepIndex(status: string): number {
  const idx = progressSteps.findIndex(
    (step) => step.key.toUpperCase() === status.toUpperCase(),
  );
  if (idx < 0) return 0;
  if (idx >= progressSteps.length) return progressSteps.length - 1;
  return idx;
}

function mapUiTypeToBackendType(serviceType: UiServiceType): string {
  // Por ahora todo se envía como DOCS al backend,
  // independientemente del tipo seleccionado en la UI.
  if (serviceType === "DOCS") return "DOCS";
  return "DOCS";
}

/** PIN de cierre real: exactamente 4 dígitos (solo `closePin` / `close_pin` del API). */
const CLOSE_PIN_REGEX = /^\d{4}$/;

function extractValidClosePinDigits(value: unknown): string | null {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (raw === "N/D" || raw === "----" || upper === "N/A" || upper === "NULL" || upper === "UNDEFINED") {
    return null;
  }
  return CLOSE_PIN_REGEX.test(raw) ? raw : null;
}

/** Persistencia local del PIN de cierre (GET no devuelve pin; solo hash en backend). */
const TRANSPORTISTA_CLOSE_PINS_LS_KEY = "rutafy.transportista.closePins.v1";

function readPersistedTransportistaClosePins(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TRANSPORTISTA_CLOSE_PINS_LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function writePersistedTransportistaClosePins(map: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRANSPORTISTA_CLOSE_PINS_LS_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / modo privado */
  }
}

function shouldClearPersistedTransportistaClosePin(status: string): boolean {
  const s = status.toUpperCase();
  if (s === "CLOSED" || s === "EXPIRED" || s === "NO_SHOW") return true;
  if (s.startsWith("CANCELLED")) return true;
  if (s === "FAILED_PICKUP" || s === "FAILED_DROPOFF") return true;
  return false;
}

function removePersistedTransportistaClosePin(serviceId: string): void {
  const id = String(serviceId).trim();
  if (!id || id === "sin-id") return;
  const map = readPersistedTransportistaClosePins();
  if (!(id in map)) return;
  delete map[id];
  writePersistedTransportistaClosePins(map);
}

/** Guarda solo si `pin` cumple /^\d{4}$/ (tras extract). */
function persistTransportistaClosePinIfValid(serviceId: string, pin: unknown): void {
  const id = String(serviceId).trim();
  if (!id || id === "sin-id") return;
  const valid = extractValidClosePinDigits(pin);
  if (!valid) return;
  const map = readPersistedTransportistaClosePins();
  map[id] = valid;
  writePersistedTransportistaClosePins(map);
}

function readPersistedTransportistaClosePinForService(serviceId: string): string | null {
  const id = String(serviceId).trim();
  if (!id || id === "sin-id") return null;
  const raw = readPersistedTransportistaClosePins()[id];
  return extractValidClosePinDigits(raw);
}

function normalizeCreateResponse(
  data: BackendCreateServiceResponse,
): CreatedServiceInfo {
  const id = String(data.id ?? data.service_id ?? data.serviceId ?? data.uuid ?? "sin-id");

  const serviceCode = String(data.serviceCode ?? data.service_code ?? data.code ?? id);

  const d = data as Record<string, unknown>;
  const closePinRaw = d.closePin ?? d.close_pin;
  const closePin = extractValidClosePinDigits(closePinRaw) ?? "N/D";

  return {
    id,
    serviceCode,
    closePin,
  };
}

function normalizeBackendServiceToLocal(
  service: BackendServiceRow,
): LocalServiceItem {
  const id = String(service.service_id ?? service.id ?? "sin-id");
  const status = String(service.status ?? "REQUESTED").toUpperCase();
  const createdAt = String(
    service.created_at ?? service.createdAt ?? new Date().toISOString(),
  );
  const origin = formatServiceRouteEndpoint(
    service.origin,
    service.meta ?? undefined,
    "origin",
    "Origen no definido",
  );
  const destination = formatServiceRouteEndpoint(
    service.destination,
    service.meta ?? undefined,
    "destination",
    "Destino no definido",
  );

  const closePinFromApi = extractValidClosePinDigits(service.closePin ?? service.close_pin ?? null);

  let closePinNormalized: string;
  if (shouldClearPersistedTransportistaClosePin(status)) {
    if (id !== "sin-id") {
      removePersistedTransportistaClosePin(id);
    }
    closePinNormalized = closePinFromApi ?? "N/D";
  } else {
    closePinNormalized =
      closePinFromApi ?? readPersistedTransportistaClosePinForService(id) ?? "N/D";
  }

  return {
    id,
    status,
    origin,
    destination,
    createdAt,
    serviceCode: String(
      service.serviceCode ??
        service.service_code ??
        `RTF-${id.slice(0, 6).toUpperCase()}`,
    ),
    closePin: closePinNormalized,
    serviceMode: "LIBRE",
    requestMode:
      String(service.request_mode ?? "NOW").toUpperCase() === "SCHEDULED"
        ? "SCHEDULED"
        : "NOW",
    scheduledFor: service.scheduled_for ?? null,
    serviceType: service.service_type ? String(service.service_type) : undefined,
    fare_amount: service.fare_amount ?? null,
    fare_currency: service.fare_currency ?? null,
    vehicle_plate:
      service.vehicle_plate != null && String(service.vehicle_plate).trim() !== ""
        ? String(service.vehicle_plate)
        : service.vehiclePlate != null && String(service.vehiclePlate).trim() !== ""
          ? String(service.vehiclePlate)
          : null,
    operational_instructions:
      service.operational_instructions != null &&
      String(service.operational_instructions).trim() !== ""
        ? String(service.operational_instructions)
        : null,
    estimated_route_distance_km: service.estimated_route_distance_km ?? null,
    estimated_route_duration_minutes: service.estimated_route_duration_minutes ?? null,
    eta_pickup_at: service.eta_pickup_at ?? null,
    eta_delivery_at: service.eta_delivery_at ?? null,
    sla_pickup_deadline_at: service.sla_pickup_deadline_at ?? null,
    sla_delivery_deadline_at: service.sla_delivery_deadline_at ?? null,
    assigned_messenger: normalizeOperationalParticipant(service.assigned_messenger),
  };
}

function formatMinutesUntil(iso?: string | null): string | null {
  if (iso == null || String(iso).trim() === "") return null;
  const targetMs = Date.parse(String(iso));
  if (!Number.isFinite(targetMs)) return null;
  const minutes = (targetMs - Date.now()) / 60_000;
  if (minutes <= 0) return null;
  if (minutes < 1) return "menos de 1 min";
  return `${Math.ceil(minutes)} min`;
}

function isSlaDeadlineBreached(deadlineIso?: string | null): boolean {
  if (deadlineIso == null || String(deadlineIso).trim() === "") return false;
  const deadlineMs = Date.parse(String(deadlineIso));
  if (!Number.isFinite(deadlineMs)) return false;
  return Date.now() > deadlineMs;
}

function formatOptionalFare(
  fareAmount?: number | string | null,
  fareCurrency?: string | null,
): string | null {
  if (fareAmount === undefined || fareAmount === null || fareAmount === "") return null;
  const n = typeof fareAmount === "number" ? fareAmount : Number(fareAmount);
  if (Number.isNaN(n)) return null;
  const cur = fareCurrency?.trim();
  if (cur) {
    return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${cur}`;
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function ServiceOperationalPreview({
  service,
  variant = "onColor",
}: {
  service: LocalServiceItem;
  variant?: "onColor" | "onCard";
}) {
  const fare = formatOptionalFare(service.fare_amount, service.fare_currency);
  const plate = service.vehicle_plate?.trim();
  const instructions = service.operational_instructions?.trim();
  const onColor = variant === "onColor";

  return (
    <div
      className={
        onColor
          ? "rounded-xl border border-white/10 bg-white/10 p-3 space-y-2 text-white/95 text-sm"
          : "rounded-xl border border-slate-200 bg-slate-50/90 p-3 space-y-2 text-sm text-slate-800"
      }
    >
      <p
        className={
          onColor
            ? "text-[11px] uppercase tracking-wider text-white/70 font-semibold"
            : "text-[11px] uppercase tracking-wider text-slate-500 font-semibold"
        }
      >
        Detalle operativo
      </p>
      <div className="grid gap-2 text-xs sm:text-sm">
        <div className="flex justify-between gap-2">
          <span className={onColor ? "text-white/70 shrink-0" : "text-slate-500 shrink-0"}>
            Tarifa
          </span>
          <span className={`font-medium text-right ${onColor ? "" : "text-slate-900"}`}>
            {fare ?? "—"}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className={onColor ? "text-white/70 shrink-0" : "text-slate-500 shrink-0"}>
            Placa
          </span>
          <span className={`font-mono text-right ${onColor ? "" : "text-slate-900"}`}>
            {plate || "—"}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className={onColor ? "text-white/70" : "text-slate-500"}>Instrucciones</span>
          <span
            className={
              onColor
                ? "text-white/95 rounded-md bg-black/10 p-2 whitespace-pre-wrap text-xs"
                : "text-slate-800 rounded-md bg-white border border-slate-100 p-2 whitespace-pre-wrap text-xs"
            }
          >
            {instructions || "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function toInputDateTimeLocal(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const hours = `${d.getHours()}`.padStart(2, "0");
  const minutes = `${d.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeComparableText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const RUTAFY_NODES_RECENT_LS_KEY = "rutafy.nodes.recent.v1";
const MAX_RECENT_NODES = 10;
const MAX_NODE_SUGGESTIONS = 12;

function loadRecentNodeIdsFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(RUTAFY_NODES_RECENT_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string" && x.trim() !== "")
      .slice(0, MAX_RECENT_NODES);
  } catch {
    return [];
  }
}

function persistRecentNodeIds(ids: readonly string[]): void {
  try {
    localStorage.setItem(RUTAFY_NODES_RECENT_LS_KEY, JSON.stringify([...ids].slice(0, MAX_RECENT_NODES)));
  } catch {
    /* ignore quota / private mode */
  }
}

function getRawSearchableAliasStrings(node: NodeItem): string[] {
  const m = node.metadata;
  if (!m || typeof m !== "object" || Array.isArray(m)) return [];
  const out: string[] = [];
  const pushArr = (arr: unknown) => {
    if (!Array.isArray(arr)) return;
    for (const x of arr) {
      if (typeof x === "string" && x.trim() !== "") out.push(x);
    }
  };
  pushArr(m.search_aliases);
  pushArr(m.aliases);
  const subs = m.subnodes;
  if (Array.isArray(subs)) {
    for (const s of subs) {
      if (s && typeof s === "object" && !Array.isArray(s)) {
        const o = s as { label?: unknown; name?: unknown };
        if (typeof o.label === "string" && o.label.trim() !== "") out.push(o.label);
        if (typeof o.name === "string" && o.name.trim() !== "") out.push(o.name);
      }
    }
  }
  return out;
}

/** Texto normalizado concatenado para coincidencia parcial general (prioridad más baja). */
function buildNodeSearchHaystack(node: NodeItem): string {
  const parts = [
    node.name,
    node.code,
    node.category,
    node.zone ?? "",
    node.address_text ?? "",
    ...getRawSearchableAliasStrings(node),
  ];
  return normalizeComparableText(parts.join(" "));
}

/**
 * Ranking: mayor score = mejor.
 * 5000 name prefix, 4000 code prefix, 3500 alias prefix, 3000 alias contains,
 * 2000 zone/category/address, 1000 cualquier substring en haystack.
 */
function scoreNodeForQuery(node: NodeItem, q: string): number {
  if (!q) return 0;
  const name = normalizeComparableText(node.name);
  const code = normalizeComparableText(node.code || "");
  if (name.startsWith(q)) return 5000;
  if (code.startsWith(q)) return 4000;
  for (const raw of getRawSearchableAliasStrings(node)) {
    const a = normalizeComparableText(raw);
    if (!a) continue;
    if (a.startsWith(q)) return 3500;
  }
  for (const raw of getRawSearchableAliasStrings(node)) {
    const a = normalizeComparableText(raw);
    if (a.includes(q)) return 3000;
  }
  const z = normalizeComparableText(node.zone || "");
  const cat = normalizeComparableText(node.category || "");
  const addr = normalizeComparableText(node.address_text || "");
  if (z.includes(q) || cat.includes(q) || addr.includes(q)) return 2000;
  if (buildNodeSearchHaystack(node).includes(q)) return 1000;
  return 0;
}

function pickNodeSuggestions(
  nodes: readonly NodeItem[],
  queryRaw: string,
  recentIds: readonly string[],
  limit: number,
): NodeItem[] {
  const q = normalizeComparableText(queryRaw);
  if (!q) {
    const byId = new Map(nodes.map((n) => [n.node_id, n] as const));
    const out: NodeItem[] = [];
    const seen = new Set<string>();
    for (const id of recentIds) {
      const n = byId.get(id);
      if (n && !seen.has(n.node_id)) {
        out.push(n);
        seen.add(n.node_id);
      }
    }
    for (const n of [...nodes].sort((a, b) => a.name.localeCompare(b.name, "es"))) {
      if (!seen.has(n.node_id)) {
        out.push(n);
        seen.add(n.node_id);
      }
      if (out.length >= limit) break;
    }
    return out.slice(0, limit);
  }
  const scored = nodes
    .map((n) => ({ n, s: scoreNodeForQuery(n, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.n.name.localeCompare(b.n.name, "es"));
  return scored.slice(0, limit).map((x) => x.n);
}

type NodeQuickPickerProps = {
  idPrefix: string;
  label: string;
  nodes: NodeItem[];
  value: string;
  onValueChange: (nodeId: string) => void;
  recentNodeIds: readonly string[];
  onRegisterRecent: (nodeId: string) => void;
  disabled?: boolean;
};

function NodeQuickPicker({
  idPrefix,
  label,
  nodes,
  value,
  onValueChange,
  recentNodeIds,
  onRegisterRecent,
  disabled,
}: NodeQuickPickerProps) {
  const [query, setQuery] = useState("");

  const suggestions = useMemo(
    () => pickNodeSuggestions(nodes, query, recentNodeIds, MAX_NODE_SUGGESTIONS),
    [nodes, query, recentNodeIds],
  );

  const selected = useMemo(
    () => (value ? nodes.find((n) => n.node_id === value) ?? null : null),
    [nodes, value],
  );

  const inputId = `${idPrefix}-search`;

  return (
    <div className="space-y-2">
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}
      <Input
        id={inputId}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        disabled={disabled}
        className="rounded-xl h-11 text-base"
        placeholder="Escribe 2 o 3 letras para buscar un nodo…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {selected ? (
        <div className="rounded-xl border border-[#2A9D8F]/30 bg-[#2A9D8F]/5 p-3 text-sm text-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2A9D8F]/90 mb-1">
            Nodo seleccionado
          </p>
          <p className="font-medium text-slate-900">{selected.name}</p>
          <p className="text-xs text-slate-600 mt-0.5">
            {(selected.zone || "Sin zona") + " · " + (selected.category || "").replace(/_/g, " ")}
          </p>
          {selected.code ? (
            <p className="text-xs font-mono text-slate-600 mt-1">Código: {selected.code}</p>
          ) : null}
          {selected.address_text ? (
            <p className="text-xs text-slate-600 mt-1">{selected.address_text}</p>
          ) : null}
        </div>
      ) : null}

      {nodes.length === 0 ? (
        <p className="text-sm text-slate-500">
          {disabled ? "Cargando nodos…" : "No hay nodos activos disponibles."}
        </p>
      ) : (
        <ul
          className="space-y-2 max-h-[min(55vh,380px)] overflow-y-auto pr-0.5 -mr-0.5"
          aria-label="Sugerencias de nodos"
        >
          {suggestions.map((node) => {
            const zoneText = node.zone || "Sin zona";
            const categoryText = (node.category || "").replace(/_/g, " ");
            const isSelected = node.node_id === value;
            return (
              <li key={node.node_id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onRegisterRecent(node.node_id);
                    onValueChange(node.node_id);
                    setQuery("");
                  }}
                  className={[
                    "w-full text-left rounded-xl border px-3 py-3 transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A9D8F]/40 focus-visible:ring-offset-1",
                    isSelected
                      ? "border-[#2A9D8F] bg-[#2A9D8F]/10 ring-1 ring-[#2A9D8F]/25"
                      : "border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100/80",
                    disabled ? "opacity-50 pointer-events-none" : "",
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold text-slate-900 leading-snug">{node.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {zoneText} · {categoryText}
                  </p>
                  {node.code ? (
                    <p className="text-xs font-mono text-slate-600 mt-1">Código: {node.code}</p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function postTransportistaDebugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  // #region agent log
  fetch("http://127.0.0.1:7395/ingest/ab1c0a5e-cbfc-4d3e-a959-ae19e797e481", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "bbfa1f",
    },
    body: JSON.stringify({
      sessionId: "bbfa1f",
      runId: "post-fix-1",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function getNodeDisplayLabel(node: NodeItem): string {
  const extras = [node.zone, node.category].filter(Boolean).join(" · ");
  return extras ? `${node.name} (${extras})` : node.name;
}

function getRequestModeLabel(mode: RequestFlow) {
  return mode === "SCHEDULED" ? "Programado" : "Inmediato";
}

const serviceTypeLabels: Record<string, string> = {
  DOCS: "Documentos",
  PACKAGE: "Paquete",
  COMPLIANCE: "Cumplido",
  TRANSPORT: "Transporte",
};

function getServiceTypeLabel(serviceType?: string | null): string {
  if (!serviceType) return "Documentos";
  const key = String(serviceType).toUpperCase();
  return serviceTypeLabels[key] ?? serviceType;
}

/** PIN de cierre listo para mostrar; `null` si no hay `closePin` válido de 4 dígitos. */
function getUsableClosePin(service: LocalServiceItem): string | null {
  return extractValidClosePinDigits(service.closePin);
}

/** Vista operativa mientras el dispatch busca mensajero (fase SEARCHING). */
function SearchingServiceView({
  activeService,
  onCancel,
  isCancelling,
  canCancel,
}: {
  activeService: LocalServiceItem;
  onCancel: () => void | Promise<void>;
  isCancelling: boolean;
  canCancel: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner"
          aria-hidden
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-55" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/85">
            Solicitud enviada
          </p>
          <h2 className="text-lg font-bold leading-snug text-white sm:text-xl">
            Buscando mensajero...
          </h2>
          <p className="text-sm leading-relaxed text-white/90">
            Estamos notificando a los mensajeros disponibles.
          </p>
          <p
            className="flex items-start gap-2 text-xs leading-relaxed text-white/80"
            role="status"
          >
            <span
              className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-200 animate-pulse"
              aria-hidden
            />
            <span>El sistema sigue activo buscando.</span>
          </p>
          <p className="text-xs leading-relaxed text-white/80">
            Si nadie acepta, seguiremos buscando hasta que la solicitud venza o sea cancelada.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/95 backdrop-blur-sm">
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
              Recoger en
            </p>
            <p className="mt-0.5 font-medium text-white">{activeService.origin}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
              Entregar en
            </p>
            <p className="mt-0.5 font-medium text-white">{activeService.destination}</p>
          </div>
          <div className="border-t border-white/10 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
              Tipo de servicio
            </p>
            <p className="mt-0.5 text-sm font-medium text-white">
              {getServiceTypeLabel(activeService.serviceType)}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/65">
              Código de seguimiento
            </p>
            <p className="mt-1 font-mono text-sm text-white/90">{activeService.serviceCode}</p>
          </div>
          {getUsableClosePin(activeService) ? (
            <div className="rounded-xl border border-white/20 bg-black/15 px-3 py-3 sm:px-4">
              <p className="text-sm font-semibold text-white">PIN de cierre</p>
              <p
                className="mt-2 text-center font-mono text-2xl font-bold tracking-[0.2em] text-white sm:text-3xl"
                translate="no"
              >
                {getUsableClosePin(activeService)}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/85">
                Entrégalo al mensajero solo cuando el servicio haya sido completado.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {canCancel ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full rounded-xl border border-white/25 bg-white/15 text-white hover:bg-white/25"
          disabled={isCancelling}
          onClick={() => void onCancel()}
        >
          {isCancelling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Cancelando solicitud…
            </>
          ) : (
            "Cancelar solicitud"
          )}
        </Button>
      ) : null}
    </div>
  );
}

function AssignedServiceView({
  activeService,
  closePin,
  onCancel,
  canCancel,
  isCancelling,
}: {
  activeService: LocalServiceItem;
  closePin: string | null;
  onCancel: () => void | Promise<void>;
  canCancel: boolean;
  isCancelling: boolean;
}) {
  const pickupSlaBreached = isSlaDeadlineBreached(activeService.sla_pickup_deadline_at);
  const pickupEtaLabel =
    !pickupSlaBreached && activeService.eta_pickup_at != null
      ? formatMinutesUntil(activeService.eta_pickup_at)
      : null;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/85">
          Mensajero asignado
        </p>
        <h2 className="text-lg font-bold leading-snug text-white sm:text-xl">
          Tu solicitud fue aceptada
        </h2>
        <p className="text-sm leading-relaxed text-white/90">
          El mensajero se dirige al punto de recogida.
        </p>
        {pickupSlaBreached ? (
          <p
            role="alert"
            className="rounded-xl border border-amber-200/50 bg-amber-500/25 px-3 py-2 text-sm font-semibold text-amber-50"
          >
            Recogida retrasada
          </p>
        ) : pickupEtaLabel ? (
          <p className="text-sm font-medium text-white/95">
            Mensajero llega aprox. en {pickupEtaLabel}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/95 backdrop-blur-sm space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Recoger en
          </p>
          <p className="mt-0.5 font-medium text-white">{activeService.origin}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Entregar en
          </p>
          <p className="mt-0.5 font-medium text-white">{activeService.destination}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Tipo de servicio
          </p>
          <p className="mt-0.5 font-medium text-white">
            {getServiceTypeLabel(activeService.serviceType)}
          </p>
        </div>
      </div>

      <OperationalParticipantCard
        title="Mensajero asignado"
        participant={activeService.assigned_messenger}
        variant="onColor"
      />

      {closePin ? (
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 space-y-2">
          <p className="text-sm font-semibold text-white">PIN de cierre</p>
          <p
            className="text-center font-mono text-2xl font-bold tracking-[0.2em] text-white sm:text-3xl"
            translate="no"
          >
            {closePin}
          </p>
          <p className="text-xs leading-relaxed text-white/85">
            Entrégalo al mensajero solo cuando el servicio haya sido completado.
          </p>
        </div>
      ) : null}

      {canCancel ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full rounded-xl border border-white/25 bg-white/15 text-white hover:bg-white/25"
          disabled={isCancelling}
          onClick={() => void onCancel()}
        >
          {isCancelling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Cancelando solicitud…
            </>
          ) : (
            "Cancelar solicitud"
          )}
        </Button>
      ) : null}
    </div>
  );
}

function InProgressServiceView({
  activeService,
  closePin,
}: {
  activeService: LocalServiceItem;
  closePin: string | null;
}) {
  const deliverySlaBreached = isSlaDeadlineBreached(activeService.sla_delivery_deadline_at);
  const deliveryEtaLabel =
    !deliverySlaBreached && activeService.eta_delivery_at != null
      ? formatMinutesUntil(activeService.eta_delivery_at)
      : null;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/85">
          Servicio en curso
        </p>
        <h2 className="text-lg font-bold leading-snug text-white sm:text-xl">
          El mensajero está realizando la entrega
        </h2>
        {deliverySlaBreached ? (
          <p
            role="alert"
            className="rounded-xl border border-amber-200/50 bg-amber-500/25 px-3 py-2 text-sm font-semibold text-amber-50"
          >
            Entrega retrasada
          </p>
        ) : deliveryEtaLabel ? (
          <p className="text-sm font-medium text-white/95">
            Entrega estimada en {deliveryEtaLabel}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/95 backdrop-blur-sm space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Recoger en
          </p>
          <p className="mt-0.5 font-medium text-white">{activeService.origin}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Entregar en
          </p>
          <p className="mt-0.5 font-medium text-white">{activeService.destination}</p>
        </div>
      </div>

      <OperationalParticipantCard
        title="Mensajero asignado"
        participant={activeService.assigned_messenger}
        variant="onColor"
      />

      {closePin ? (
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 space-y-2">
          <p className="text-sm font-semibold text-white">PIN de cierre</p>
          <p
            className="text-center font-mono text-3xl font-bold tracking-[0.2em] text-white"
            translate="no"
          >
            {closePin}
          </p>
          <p className="text-xs leading-relaxed text-white/85">
            Comparte el PIN solo cuando el servicio haya finalizado.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function CompletedServiceView({
  activeService,
  onNewService,
}: {
  activeService: LocalServiceItem;
  onNewService: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/85">
          Servicio finalizado
        </p>
        <h2 className="text-lg font-bold leading-snug text-white sm:text-xl">
          Tu servicio fue completado exitosamente
        </h2>
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/95 backdrop-blur-sm space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Recoger en
          </p>
          <p className="mt-0.5 font-medium text-white">{activeService.origin}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Entregar en
          </p>
          <p className="mt-0.5 font-medium text-white">{activeService.destination}</p>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full rounded-xl border border-white/25 bg-white/15 text-white hover:bg-white/25"
        onClick={onNewService}
      >
        Solicitar otro servicio
      </Button>
    </div>
  );
}

function CancelledServiceView({
  activeService,
  onRetry,
}: {
  activeService: LocalServiceItem;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/85">
          Servicio cancelado
        </p>
        <h2 className="text-lg font-bold leading-snug text-white sm:text-xl">
          El servicio fue cancelado
        </h2>
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/95 backdrop-blur-sm space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Recoger en
          </p>
          <p className="mt-0.5 font-medium text-white">{activeService.origin}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Entregar en
          </p>
          <p className="mt-0.5 font-medium text-white">{activeService.destination}</p>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full rounded-xl border border-white/25 bg-white/15 text-white hover:bg-white/25"
        onClick={onRetry}
      >
        Solicitar nuevamente
      </Button>
    </div>
  );
}

const statusBorderColors: Record<string, string> = {
  REQUESTED: "border-l-yellow-500",
  OFFERED: "border-l-amber-500",
  CLAIMED: "border-l-blue-500",
  STARTED: "border-l-indigo-500",
  CLOSED: "border-l-green-500",
  EXPIRED: "border-l-slate-400",
  CANCELLED_BY_TRANSPORTER: "border-l-red-400",
  CANCELLED_BY_MESSENGER: "border-l-red-400",
  FAILED_PICKUP: "border-l-orange-400",
  FAILED_DROPOFF: "border-l-orange-400",
  NO_SHOW: "border-l-zinc-400",
};

type TransportistaHomeViewProps = {
  activeService: LocalServiceItem | null;
  isIdle: boolean;
  isSearching: boolean;
  isAssigned: boolean;
  isInProgress: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  expandedPanel: ExpandedPanel;
  setExpandedPanel: (value: ExpandedPanel) => void;
  setDismissedTerminalServiceId: (value: string | null) => void;
  onCancelService: (service: LocalServiceItem) => void | Promise<void>;
  cancellingServiceId: string | null;
  serviceMode: ServiceMode;
  setServiceMode: (value: ServiceMode) => void;
  serviceType: UiServiceType;
  setServiceType: (value: UiServiceType) => void;
  companyId: string;
  setCompanyId: (value: string) => void;
  companies: Array<{ id: number; name: string }>;
  originMode: LocationMode;
  setOriginMode: (value: LocationMode) => void;
  destinationMode: LocationMode;
  setDestinationMode: (value: LocationMode) => void;
  originNodeId: string;
  setOriginNodeId: (value: string) => void;
  destinationNodeId: string;
  setDestinationNodeId: (value: string) => void;
  origin: string;
  setOrigin: (value: string) => void;
  destination: string;
  setDestination: (value: string) => void;
  nodeReference: string;
  setNodeReference: (value: string) => void;
  activeNodes: NodeItem[];
  isLoadingNodes: boolean;
  recentNodeIds: readonly string[];
  onRegisterRecentNode: (nodeId: string) => void;
  scheduledAt: string;
  setScheduledAt: (value: string) => void;
  onCreateServiceNow: () => void | Promise<void>;
  onCreateServiceScheduled: () => void | Promise<void>;
  isCreatingNow: boolean;
  isCreatingScheduled: boolean;
  manualAddressModal: "origin" | "destination" | null;
  manualAddressDraft: string;
  setManualAddressDraft: (value: string) => void;
  openManualAddressModal: (which: "origin" | "destination") => void;
  closeManualAddressModal: () => void;
  confirmManualAddressModal: () => void;
};

function TransportistaHomeView(props: TransportistaHomeViewProps) {
  const {
    activeService,
    isIdle,
    isSearching,
    isAssigned,
    isInProgress,
    isCompleted,
    isCancelled,
    expandedPanel,
    setExpandedPanel,
    setDismissedTerminalServiceId,
    onCancelService,
    cancellingServiceId,
    serviceMode,
    setServiceMode,
    serviceType,
    setServiceType,
    companyId,
    setCompanyId,
    companies,
    originMode,
    setOriginMode,
    destinationMode,
    setDestinationMode,
    originNodeId,
    setOriginNodeId,
    destinationNodeId,
    setDestinationNodeId,
    origin,
    setOrigin,
    destination,
    setDestination,
    nodeReference,
    setNodeReference,
    activeNodes,
    recentNodeIds,
    onRegisterRecentNode,
    isLoadingNodes,
    scheduledAt,
    setScheduledAt,
    onCreateServiceNow,
    onCreateServiceScheduled,
    isCreatingNow,
    isCreatingScheduled,
    manualAddressModal,
    manualAddressDraft,
    setManualAddressDraft,
    openManualAddressModal,
    closeManualAddressModal,
    confirmManualAddressModal,
  } = props;

  useEffect(() => {
    // #region agent log
    postTransportistaDebugLog("H5", "TransportistaHomeView:mount", "home-view-mounted", {
      activeServiceId: activeService?.id ?? null,
      runId: "post-fix-hoist-home",
    });
    // #endregion
    return () => {
      // #region agent log
      postTransportistaDebugLog("H5", "TransportistaHomeView:mount", "home-view-unmounted", {
        runId: "post-fix-hoist-home",
      });
      // #endregion
    };
  }, []);

  const activeClosePin = activeService ? getUsableClosePin(activeService) : null;
  const isOperationalIdle = isIdle || !activeService;
  const isCreatingServiceDraft = expandedPanel !== null;
  const handleReturnToIdle = () => {
    if (activeService?.id) {
      setDismissedTerminalServiceId(activeService.id);
    }
    closeManualAddressModal();
    setExpandedPanel("NOW");
  };

  return (
    <div className="space-y-5">
      <Card className="border-0 shadow-sm bg-gradient-to-r from-[#2A9D8F] to-[#238b7e] text-white overflow-hidden">
        <CardContent className="p-4">
          {isSearching && activeService ? (
            <SearchingServiceView
              activeService={activeService}
              onCancel={() => void onCancelService(activeService)}
              isCancelling={cancellingServiceId === activeService.id}
              canCancel={isTransportistaCancelableServiceStatus(activeService.status)}
            />
          ) : isAssigned && activeService ? (
            <AssignedServiceView
              activeService={activeService}
              closePin={activeClosePin}
              onCancel={() => void onCancelService(activeService)}
              canCancel={isTransportistaCancelableServiceStatus(activeService.status)}
              isCancelling={cancellingServiceId === activeService.id}
            />
          ) : isInProgress && activeService ? (
            <InProgressServiceView activeService={activeService} closePin={activeClosePin} />
          ) : isCompleted && activeService ? (
            <CompletedServiceView activeService={activeService} onNewService={handleReturnToIdle} />
          ) : isCancelled && activeService ? (
            <CancelledServiceView activeService={activeService} onRetry={handleReturnToIdle} />
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/85">
                Listo para operar
              </p>
              <h2 className="text-lg font-bold leading-snug text-white sm:text-xl">
                Sin servicio activo
              </h2>
              <p className="text-sm leading-relaxed text-white/90">
                Solicita un servicio para comenzar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isOperationalIdle ? (
        <Button
          type="button"
          onClick={() => {
            closeManualAddressModal();
            setExpandedPanel("NOW");
          }}
          className="w-full rounded-xl bg-[#2A9D8F] hover:bg-[#238b7e] h-12"
        >
          Solicitar servicio
        </Button>
      ) : null}

      {isCreatingServiceDraft ? (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="space-y-4 p-5 pb-0">
            <CardTitle className="text-lg font-semibold text-slate-900">Nuevo servicio</CardTitle>
            <div
              className="flex rounded-xl bg-slate-100/90 p-1 gap-1 transition-colors duration-150"
              role="tablist"
              aria-label="Modo de servicio"
            >
              <button
                type="button"
                role="tab"
                aria-selected={expandedPanel === "NOW"}
                onClick={() => {
                  closeManualAddressModal();
                  setExpandedPanel("NOW");
                }}
                className={[
                  "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-150",
                  expandedPanel === "NOW"
                    ? "bg-[#2A9D8F] text-white shadow-sm"
                    : "bg-transparent text-slate-500 hover:bg-slate-200/60",
                ].join(" ")}
              >
                Ahora
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={expandedPanel === "SCHEDULED"}
                onClick={() => {
                  closeManualAddressModal();
                  setExpandedPanel("SCHEDULED");
                }}
                className={[
                  "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-150",
                  expandedPanel === "SCHEDULED"
                    ? "bg-[#2A9D8F] text-white shadow-sm"
                    : "bg-transparent text-slate-500 hover:bg-slate-200/60",
                ].join(" ")}
              >
                Programado
              </button>
            </div>
          </CardHeader>

          {expandedPanel === "NOW" && (
            <CardContent className="space-y-5 p-5 pt-4 transition-opacity duration-150">
              {renderSharedForm({
                serviceMode,
                setServiceMode,
                serviceType,
                setServiceType,
                companyId,
                setCompanyId,
                companies,
                originMode,
                setOriginMode,
                destinationMode,
                setDestinationMode,
                originNodeId,
                setOriginNodeId,
                destinationNodeId,
                setDestinationNodeId,
                origin,
                setOrigin,
                destination,
                setDestination,
                nodeReference,
                setNodeReference,
                activeNodes,
                isLoadingNodes,
                recentNodeIds,
                onRegisterRecentNode,
                manualAddressModal,
                manualAddressDraft,
                setManualAddressDraft,
                openManualAddressModal,
                closeManualAddressModal,
                confirmManualAddressModal,
              })}

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    closeManualAddressModal();
                    setExpandedPanel(null);
                  }}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => void onCreateServiceNow()}
                  disabled={isCreatingNow}
                  className="rounded-xl bg-[#2A9D8F] hover:bg-[#238b7e] active:scale-[0.98] transition-all duration-150 shadow-sm"
                >
                  {isCreatingNow ? "Creando..." : "Crear servicio ahora"}
                </Button>
              </div>
            </CardContent>
          )}

          {expandedPanel === "SCHEDULED" && (
            <CardContent className="space-y-5 p-5 pt-4 transition-opacity duration-150">
              <div className="space-y-2">
                <Label>Fecha y hora programada</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  min={toInputDateTimeLocal(new Date().toISOString())}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {renderSharedForm({
                serviceMode,
                setServiceMode,
                serviceType,
                setServiceType,
                companyId,
                setCompanyId,
                companies,
                originMode,
                setOriginMode,
                destinationMode,
                setDestinationMode,
                originNodeId,
                setOriginNodeId,
                destinationNodeId,
                setDestinationNodeId,
                origin,
                setOrigin,
                destination,
                setDestination,
                nodeReference,
                setNodeReference,
                activeNodes,
                isLoadingNodes,
                recentNodeIds,
                onRegisterRecentNode,
                manualAddressModal,
                manualAddressDraft,
                setManualAddressDraft,
                openManualAddressModal,
                closeManualAddressModal,
                confirmManualAddressModal,
              })}

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    closeManualAddressModal();
                    setExpandedPanel(null);
                  }}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => void onCreateServiceScheduled()}
                  disabled={isCreatingScheduled}
                  className="rounded-xl bg-[#2A9D8F] hover:bg-[#238b7e] active:scale-[0.98] transition-all duration-150 shadow-sm"
                >
                  {isCreatingScheduled ? "Programando..." : "Programar servicio"}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      ) : null}
    </div>
  );
}

type TransportistaActivityViewProps = {
  activityServices: LocalServiceItem[];
  isLoadingHistory: boolean;
  loadTransportistaHistory: () => Promise<void>;
  setSelectedHistoryService: (service: LocalServiceItem) => void;
};

function TransportistaActivityView({
  activityServices,
  isLoadingHistory,
  loadTransportistaHistory,
  setSelectedHistoryService,
}: TransportistaActivityViewProps) {
  return (
    <div className="space-y-4">
      <Card className="border border-slate-200/80 bg-white shadow-sm overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Historial</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void loadTransportistaHistory();
            }}
            disabled={isLoadingHistory}
            className="h-8 rounded-lg text-slate-600"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoadingHistory ? "animate-spin" : ""}`} />
            {isLoadingHistory ? "Actualizando..." : "Recargar"}
          </Button>
        </div>

        <div className="px-3 py-3">
          {activityServices.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              No tienes servicios registrados todavía.
            </div>
          ) : (
            <ul className="space-y-2">
              {activityServices.map((service) => (
                <li key={service.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryService(service)}
                    className="w-full text-left rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3 transition-colors hover:bg-slate-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A9D8F]/40 focus-visible:ring-offset-1"
                  >
                    <p className="text-sm text-slate-900 font-medium leading-snug">
                      {service.origin} <span className="text-slate-400 mx-1">→</span> {service.destination}
                    </p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 text-[11px] rounded-full font-medium ${
                          statusColors[service.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabels[service.status] || service.status}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatDateTime(service.createdAt)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

type TransportistaAccountViewProps = {
  userName: string | null | undefined;
  userEmail: string | null | undefined;
  userPhone: string | null | undefined;
  requesterProfile: RequesterProfile | null;
  onLogout: () => void | Promise<void>;
};

function profileField(
  profile: RequesterProfile | null,
  key: keyof RequesterProfile,
): string {
  const v = profile?.[key];
  return v != null && String(v).trim() ? String(v).trim() : "—";
}

function TransportistaAccountView({
  userName,
  userEmail,
  userPhone,
  requesterProfile,
  onLogout,
}: TransportistaAccountViewProps) {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Cuenta operativa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Operador</span>
              <span className="font-medium text-right">{userName || "—"}</span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Teléfono</span>
              <span className="font-medium">{userPhone || "—"}</span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{userEmail || "—"}</span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Nombre operativo</span>
              <span className="font-medium text-right">
                {profileField(requesterProfile, "name") !== "—"
                  ? profileField(requesterProfile, "name")
                  : userName || "—"}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Placa</span>
              <span className="font-mono font-medium">
                {profileField(requesterProfile, "plate")}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Tipo de vehículo</span>
              <span className="font-medium text-right">
                {profileField(requesterProfile, "vehicle_type")}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Referencia vehículo</span>
              <span className="font-medium text-right">
                {profileField(requesterProfile, "vehicle_reference")}
              </span>
            </div>

            {requesterProfile?.company_name ? (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Empresa</span>
                <span className="font-medium text-right">
                  {requesterProfile.company_name}
                </span>
              </div>
            ) : null}

            <div className="flex justify-between py-2">
              <span className="text-gray-500">Estado</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Activo
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full rounded-xl border-slate-200 h-12 text-slate-700"
        onClick={() => void onLogout()}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Cerrar sesión
      </Button>
    </div>
  );
}

export default function TransportistaPanel() {
  const { user, logout, loading } = useAuth();
  const [, setLocation] = useLocation();

  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>("NOW");
  const [activeTab, setActiveTab] = useState<TransportistaTab>("home");
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistoryService, setSelectedHistoryService] = useState<LocalServiceItem | null>(null);
  const [detailEvidences, setDetailEvidences] = useState<ServiceEvidenceItem[]>([]);
  const [detailEvidencesLoading, setDetailEvidencesLoading] = useState(false);
  const [cancellingServiceId, setCancellingServiceId] = useState<string | null>(null);
  const [reportBlockOpen, setReportBlockOpen] = useState(false);
  const [reportNote, setReportNote] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedClosePin, setCopiedClosePin] = useState(false);
  const [isCreatingNow, setIsCreatingNow] = useState(false);
  const [isCreatingScheduled, setIsCreatingScheduled] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [dismissedTerminalServiceId, setDismissedTerminalServiceId] = useState<string | null>(null);

  const [serviceMode, setServiceMode] = useState<ServiceMode>("LIBRE");
  const [serviceType, setServiceType] = useState<UiServiceType>("DOCS");
  const [companyId, setCompanyId] = useState("");

  const [originMode, setOriginMode] = useState<LocationMode>("NODE");
  const [destinationMode, setDestinationMode] = useState<LocationMode>("NODE");

  const [originNodeId, setOriginNodeId] = useState("");
  const [destinationNodeId, setDestinationNodeId] = useState("");

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [recentNodeIds, setRecentNodeIds] = useState<string[]>(() => loadRecentNodeIdsFromStorage());

  const registerRecentNode = useCallback((nodeId: string) => {
    if (!nodeId) return;
    setRecentNodeIds((prev) => {
      const next = [nodeId, ...prev.filter((id) => id !== nodeId)].slice(0, MAX_RECENT_NODES);
      persistRecentNodeIds(next);
      return next;
    });
  }, []);
  const [nodeReference, setNodeReference] = useState("");

  const [manualAddressModal, setManualAddressModal] = useState<null | "origin" | "destination">(
    null,
  );
  const [manualAddressDraft, setManualAddressDraft] = useState("");

  const [scheduledAt, setScheduledAt] = useState("");

  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [isLoadingNodes, setIsLoadingNodes] = useState(false);

  const [createdService, setCreatedService] = useState<CreatedServiceInfo | null>(null);
  const [myServices, setMyServices] = useState<LocalServiceItem[]>([]);

  const companies: Array<{ id: number; name: string }> = [];

  const activeNodes = useMemo(
    () => nodes.filter((node) => node.is_active),
    [nodes],
  );

  const originSelectedNode = useMemo(
    () => activeNodes.find((node) => node.node_id === originNodeId) || null,
    [activeNodes, originNodeId],
  );

  const destinationSelectedNode = useMemo(
    () => activeNodes.find((node) => node.node_id === destinationNodeId) || null,
    [activeNodes, destinationNodeId],
  );

  const effectiveCompanyId = useMemo(() => {
    if (serviceMode === "EMPRESA" && companyId) return companyId;
    return DEFAULT_REQUESTER_COMPANY_ID;
  }, [serviceMode, companyId]);

  const displayName = useMemo(() => {
    return user?.name?.split(" ")[0] || user?.email || "Transportista";
  }, [user]);

  const activeService = useMemo(() => {
    const priority = [
      "STARTED",
      "CLAIMED",
      "OFFERED",
      "REQUESTED",
      "CLOSED",
      "CANCELLED_BY_TRANSPORTER",
      "CANCELLED_BY_MESSENGER",
      "EXPIRED",
      "FAILED_PICKUP",
      "FAILED_DROPOFF",
      "NO_SHOW",
    ];
    for (const status of priority) {
      const found = myServices.find(
        (service) =>
          service.status?.toUpperCase() === status &&
          service.id !== dismissedTerminalServiceId,
      );
      if (found) return found;
    }
    return null;
  }, [myServices, dismissedTerminalServiceId]);

  const {
    operationalPhase,
    isIdle,
    isSearching,
    isAssigned,
    isInProgress,
    isCompleted,
    isCancelled,
  } = useTransportistaOperationalState(myServices, activeService);

  useEffect(() => {
    console.debug("[transportista-operational-phase]", operationalPhase);
  }, [operationalPhase]);

  useEffect(() => {
    // #region agent log
    postTransportistaDebugLog(
      "H1_H3",
      "TransportistaPanel.tsx:state-visibility",
      "operational-structure-change",
      {
        activeTab,
        expandedPanel,
        operationalPhase,
        activeServiceId: activeService?.id ?? null,
        activeServiceStatus: activeService?.status ?? null,
        isIdle,
        isSearching,
        isAssigned,
        isInProgress,
        isCompleted,
        isCancelled,
      },
    );
    // #endregion
  }, [
    activeTab,
    expandedPanel,
    operationalPhase,
    activeService?.id,
    activeService?.status,
    isIdle,
    isSearching,
    isAssigned,
    isInProgress,
    isCompleted,
    isCancelled,
  ]);

  const activityServices = useMemo(() => myServices.slice(0, 30), [myServices]);

  const loadNodes = async () => {
    setIsLoadingNodes(true);
    try {
      const { data } = await http.get<NodesListResponse>("/v1/nodes", {
        params: { is_active: true },
      });
      if (data?.error) {
        throw new Error(data.error);
      }
      setNodes(data?.nodes || []);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string; error?: string })?.message ??
          (error.response?.data as { error?: string })?.error ??
          error.message
        : error instanceof Error
          ? error.message
          : "No fue posible cargar nodos";
      toast.error(message || "No fue posible cargar nodos");
    } finally {
      setIsLoadingNodes(false);
    }
  };

  const loadTransportistaHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data } = await http.get<
        BackendServicesListResponse & { data?: BackendServiceRow[] }
      >("/v1/services", {
        params: {
          requester_company_id: effectiveCompanyId,
          limit: 100,
        },
      });

      if (data?.error) {
        throw new Error(data.error);
      }

      const rawServices = data.services ?? data.data ?? [];

      const normalized = rawServices.map(normalizeBackendServiceToLocal);
      // #region agent log
      postTransportistaDebugLog(
        "H4",
        "TransportistaPanel.tsx:loadTransportistaHistory",
        "history-refresh-applied",
        {
          rawCount: rawServices.length,
          normalizedCount: normalized.length,
          topStatuses: normalized.slice(0, 5).map((s) => s.status),
          expandedPanel,
          activeTab,
        },
      );
      // #endregion
      setMyServices(normalized);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string; error?: string })?.message ??
          (error.response?.data as { error?: string })?.error ??
          error.message
        : error instanceof Error
          ? error.message
          : "No fue posible cargar historial";
      toast.error(message || "No fue posible cargar historial");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadTransportistaHistoryRef = useRef(loadTransportistaHistory);
  loadTransportistaHistoryRef.current = loadTransportistaHistory;

  const isLoadingHistoryRef = useRef(isLoadingHistory);
  isLoadingHistoryRef.current = isLoadingHistory;

  useEffect(() => {
    if (loading) return;
    if (!user || user.appRole !== "TRANSPORTISTA") return;

    const intervalId = window.setInterval(() => {
      if (isLoadingHistoryRef.current) return;
      void loadTransportistaHistoryRef.current();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [loading, user]);

  const handleCancelServiceAsTransportista = async (service: LocalServiceItem) => {
    if (!isTransportistaCancelableServiceStatus(service.status)) return;
    if (
      !window.confirm(
        "¿Cancelar este servicio? Aún no ha sido tomado por un mensajero. Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }
    setCancellingServiceId(service.id);
    try {
      await cancelServiceByTransportista(service.id, effectiveCompanyId);
      toast.success("Servicio cancelado");
      if (selectedHistoryService?.id === service.id) {
        setSelectedHistoryService(null);
        setReportBlockOpen(false);
        setReportNote("");
      }
      await loadTransportistaHistory();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string; error?: string })?.message ??
          (error.response?.data as { error?: string })?.error ??
          error.message
        : error instanceof Error
          ? error.message
          : "No se pudo cancelar el servicio";
      toast.error(message || "No se pudo cancelar el servicio");
    } finally {
      setCancellingServiceId(null);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    if (user.appRole === "MENSAJERO") {
      setLocation("/mensajero");
      return;
    }
    if (user.appRole === "ADMIN") {
      setLocation("/admin");
      return;
    }
    if (user.appRole !== "TRANSPORTISTA") {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  useEffect(() => {
    if (loading) return;
    if (!user || user.appRole !== "TRANSPORTISTA") return;
    void loadNodes();
    void loadTransportistaHistory();
  }, [loading, user]);

  useEffect(() => {
    if (!selectedHistoryService) {
      setDetailEvidences([]);
      setDetailEvidencesLoading(false);
      return;
    }
    const serviceId = selectedHistoryService.id;
    let cancelled = false;
    setDetailEvidencesLoading(true);
    setDetailEvidences([]);

    http
      .get<{ evidences?: ServiceEvidenceItem[] }>(
        `/v1/services/${encodeURIComponent(serviceId)}/evidences`,
      )
      .then(({ data }) => {
        if (cancelled) return;
        setDetailEvidences(Array.isArray(data?.evidences) ? data.evidences : []);
      })
      .catch(() => {
        if (cancelled) return;
        setDetailEvidences([]);
        toast.error("No se pudieron cargar las evidencias");
      })
      .finally(() => {
        if (!cancelled) setDetailEvidencesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedHistoryService?.id]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const openManualAddressModal = useCallback((which: "origin" | "destination") => {
    setManualAddressDraft(which === "origin" ? origin : destination);
    setManualAddressModal(which);
  }, [origin, destination]);

  const closeManualAddressModal = useCallback(() => {
    setManualAddressModal(null);
  }, []);

  const confirmManualAddressModal = useCallback(() => {
    const t = manualAddressDraft.trim();
    if (!t) {
      toast.error("Escribe una dirección.");
      return;
    }
    if (manualAddressModal === "origin") {
      setOrigin(t);
    } else if (manualAddressModal === "destination") {
      setDestination(t);
    }
    setManualAddressModal(null);
  }, [manualAddressDraft, manualAddressModal]);

  const resetForm = () => {
    setServiceMode("LIBRE");
    setServiceType("DOCS");
    setCompanyId("");
    setOriginMode("NODE");
    setDestinationMode("NODE");
    setOriginNodeId("");
    setDestinationNodeId("");
    setOrigin("");
    setDestination("");
    setNodeReference("");
    setScheduledAt("");
    setManualAddressModal(null);
    setManualAddressDraft("");
  };

  const copyToClipboard = async (
    text: string,
    type: "code" | "close",
  ) => {
    await navigator.clipboard.writeText(text);

    if (type === "code") {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedClosePin(true);
      setTimeout(() => setCopiedClosePin(false), 2000);
    }

    toast.success("Copiado al portapapeles");
  };

  const buildPayload = (requestMode: RequestFlow) => {
    const nodeReferenceTrimmed = nodeReference.trim();
    const finalOrigin =
      originMode === "NODE"
        ? originSelectedNode?.name?.trim() || ""
        : origin.trim();

    const finalDestination =
      destinationMode === "NODE"
        ? destinationSelectedNode?.name?.trim() || ""
        : destination.trim();

    if (!finalOrigin || !finalDestination) {
      throw new Error("Debes definir puntos de recogida y entrega.");
    }

    if (originMode === "NODE" && !originNodeId) {
      throw new Error("Debes seleccionar un nodo de origen.");
    }

    if (destinationMode === "NODE" && !destinationNodeId) {
      throw new Error("Debes seleccionar un nodo de destino.");
    }

    if (
      originMode === "NODE" &&
      destinationMode === "NODE" &&
      originNodeId === destinationNodeId
    ) {
      throw new Error("La recogida y la entrega no pueden ser el mismo nodo.");
    }

    if (
      normalizeComparableText(finalOrigin) ===
      normalizeComparableText(finalDestination)
    ) {
      throw new Error("La recogida y la entrega no pueden ser iguales.");
    }

    if (serviceMode === "EMPRESA" && !companyId) {
      throw new Error("Debes seleccionar una empresa.");
    }

    if (requestMode === "SCHEDULED" && !scheduledAt) {
      throw new Error("Debes seleccionar la fecha y hora programada.");
    }

    return {
      requester_company_id: effectiveCompanyId,
      service_type: mapUiTypeToBackendType(serviceType),
      request_mode: requestMode,
      scheduled_for: requestMode === "SCHEDULED" ? new Date(scheduledAt).toISOString() : undefined,
      origin: finalOrigin,
      destination: finalDestination,
      origin_node_id: originMode === "NODE" ? originNodeId : undefined,
      destination_node_id:
        destinationMode === "NODE" ? destinationNodeId : undefined,
      origin_lat: originMode === "NODE" ? originSelectedNode?.lat : undefined,
      origin_lng: originMode === "NODE" ? originSelectedNode?.lng : undefined,
      destination_lat:
        destinationMode === "NODE"
          ? destinationSelectedNode?.lat
          : undefined,
      destination_lng:
        destinationMode === "NODE"
          ? destinationSelectedNode?.lng
          : undefined,
      operational_instructions:
        nodeReferenceTrimmed !== ""
          ? `Referencia dentro del nodo: ${nodeReferenceTrimmed}`
          : undefined,
      meta:
        nodeReferenceTrimmed !== ""
          ? {
              node_reference: nodeReferenceTrimmed,
            }
          : undefined,
    };
  };

  const handleCreateService = async (requestMode: RequestFlow) => {
    try {
      const payload = buildPayload(requestMode);
      const finalOrigin = String(payload.origin);
      const finalDestination = String(payload.destination);

      if (requestMode === "NOW") {
        setIsCreatingNow(true);
      } else {
        setIsCreatingScheduled(true);
      }

      const response = (await createService(payload)) as BackendCreateServiceResponse;

      const normalized = normalizeCreateResponse(response);

      if (normalized.id !== "sin-id") {
        const res = response as Record<string, unknown>;
        persistTransportistaClosePinIfValid(
          normalized.id,
          res.close_pin ?? res.closePin ?? normalized.closePin,
        );
      }

      setCreatedService(normalized);

      setMyServices((prev) => [
        {
          id: normalized.id,
          status: "REQUESTED",
          origin: finalOrigin,
          destination: finalDestination,
          createdAt: new Date().toISOString(),
          serviceCode: normalized.serviceCode,
          closePin: normalized.closePin,
          serviceMode,
          requestMode,
          scheduledFor: requestMode === "SCHEDULED" ? new Date(scheduledAt).toISOString() : null,
        },
        ...prev,
      ]);

      setExpandedPanel(null);
      setIsSuccessOpen(true);
      resetForm();

      toast.success(
        requestMode === "SCHEDULED"
          ? "Recogida programada correctamente."
          : "Servicio creado correctamente.",
      );

      await loadTransportistaHistory();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "No fue posible crear el servicio.";

      toast.error(message);
    } finally {
      setIsCreatingNow(false);
      setIsCreatingScheduled(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#2A9D8F]" aria-hidden />
        <p className="text-sm text-gray-600">Cargando sesión...</p>
      </div>
    );
  }

  if (!user || user.appRole !== "TRANSPORTISTA") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#2A9D8F]" aria-hidden />
        <p className="text-sm text-gray-600">Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]"
      data-operational-phase={operationalPhase}
      data-op-idle={isIdle ? "1" : "0"}
      data-op-searching={isSearching ? "1" : "0"}
      data-op-assigned={isAssigned ? "1" : "0"}
      data-op-in-progress={isInProgress ? "1" : "0"}
      data-op-completed={isCompleted ? "1" : "0"}
      data-op-cancelled={isCancelled ? "1" : "0"}
    >
      <div className="bg-[#2A9D8F] text-white p-4 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="p-2 rounded-xl transition-all duration-150 hover:bg-white/10 active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-white/40">
                {((user as any)?.avatarUrl ?? "") && (
                  <AvatarImage
                    src={(user as any).avatarUrl}
                    alt={user?.name || user?.email || "Transportista"}
                  />
                )}
                <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div>
                <h1 className="text-xl font-bold">Panel de solicitudes</h1>
                <p className="text-white/75 text-sm">
                  Operador: {user?.name || user?.email || "—"}
                </p>
                {user?.requester_profile?.plate ? (
                  <p className="text-white/65 text-xs">
                    Placa {user.requester_profile.plate}
                    {user.requester_profile.vehicle_type
                      ? ` · ${user.requester_profile.vehicle_type}`
                      : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="max-w-md mx-auto p-4 md:p-6 pb-28">
        {activeTab === "home" && (
          <TransportistaHomeView
            activeService={activeService}
            isIdle={isIdle}
            isSearching={isSearching}
            isAssigned={isAssigned}
            isInProgress={isInProgress}
            isCompleted={isCompleted}
            isCancelled={isCancelled}
            expandedPanel={expandedPanel}
            setExpandedPanel={setExpandedPanel}
            setDismissedTerminalServiceId={setDismissedTerminalServiceId}
            onCancelService={handleCancelServiceAsTransportista}
            cancellingServiceId={cancellingServiceId}
            serviceMode={serviceMode}
            setServiceMode={setServiceMode}
            serviceType={serviceType}
            setServiceType={setServiceType}
            companyId={companyId}
            setCompanyId={setCompanyId}
            companies={companies}
            originMode={originMode}
            setOriginMode={setOriginMode}
            destinationMode={destinationMode}
            setDestinationMode={setDestinationMode}
            originNodeId={originNodeId}
            setOriginNodeId={setOriginNodeId}
            destinationNodeId={destinationNodeId}
            setDestinationNodeId={setDestinationNodeId}
            origin={origin}
            setOrigin={setOrigin}
            destination={destination}
            setDestination={setDestination}
            nodeReference={nodeReference}
            setNodeReference={setNodeReference}
            activeNodes={activeNodes}
            recentNodeIds={recentNodeIds}
            onRegisterRecentNode={registerRecentNode}
            isLoadingNodes={isLoadingNodes}
            scheduledAt={scheduledAt}
            setScheduledAt={setScheduledAt}
            onCreateServiceNow={() => handleCreateService("NOW")}
            onCreateServiceScheduled={() => handleCreateService("SCHEDULED")}
            isCreatingNow={isCreatingNow}
            isCreatingScheduled={isCreatingScheduled}
            manualAddressModal={manualAddressModal}
            manualAddressDraft={manualAddressDraft}
            setManualAddressDraft={setManualAddressDraft}
            openManualAddressModal={openManualAddressModal}
            closeManualAddressModal={closeManualAddressModal}
            confirmManualAddressModal={confirmManualAddressModal}
          />
        )}
        {activeTab === "activity" && (
          <TransportistaActivityView
            activityServices={activityServices}
            isLoadingHistory={isLoadingHistory}
            loadTransportistaHistory={loadTransportistaHistory}
            setSelectedHistoryService={setSelectedHistoryService}
          />
        )}
        {activeTab === "account" && (
          <TransportistaAccountView
            userName={user?.name}
            userEmail={user?.email}
            userPhone={user?.phone}
            requesterProfile={user?.requester_profile ?? null}
            onLogout={handleLogout}
          />
        )}
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(15,23,42,0.07)] pb-[env(safe-area-inset-bottom,0)]"
        aria-label="Navegación principal"
      >
        <div className="max-w-md mx-auto flex items-stretch justify-around gap-0.5 px-1.5 pt-1 pb-1.5 sm:px-2">
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            aria-current={activeTab === "home" ? "page" : undefined}
            className={[
              "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2.5 text-[11px] leading-tight transition-colors duration-150 min-h-[3.5rem] border-t-[3px]",
              activeTab === "home"
                ? "border-t-[#2A9D8F] text-[#2A9D8F] bg-[#2A9D8F]/[0.11] font-semibold"
                : "border-t-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-500 active:bg-slate-100/80 font-medium",
            ].join(" ")}
          >
            <Home
              className="w-[22px] h-[22px] shrink-0"
              strokeWidth={activeTab === "home" ? 2.35 : 1.65}
            />
            <span>Inicio</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            aria-current={activeTab === "activity" ? "page" : undefined}
            className={[
              "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2.5 text-[11px] leading-tight transition-colors duration-150 min-h-[3.5rem] border-t-[3px]",
              activeTab === "activity"
                ? "border-t-[#2A9D8F] text-[#2A9D8F] bg-[#2A9D8F]/[0.11] font-semibold"
                : "border-t-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-500 active:bg-slate-100/80 font-medium",
            ].join(" ")}
          >
            <History
              className="w-[22px] h-[22px] shrink-0"
              strokeWidth={activeTab === "activity" ? 2.35 : 1.65}
            />
            <span>Actividad</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("account")}
            aria-current={activeTab === "account" ? "page" : undefined}
            className={[
              "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2.5 text-[11px] leading-tight transition-colors duration-150 min-h-[3.5rem] border-t-[3px]",
              activeTab === "account"
                ? "border-t-[#2A9D8F] text-[#2A9D8F] bg-[#2A9D8F]/[0.11] font-semibold"
                : "border-t-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-500 active:bg-slate-100/80 font-medium",
            ].join(" ")}
          >
            <User
              className="w-[22px] h-[22px] shrink-0"
              strokeWidth={activeTab === "account" ? 2.35 : 1.65}
            />
            <span>Cuenta</span>
          </button>
        </div>
      </nav>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Historial completo</DialogTitle>
            <DialogDescription>
              Aquí ves todos los servicios registrados del transportista.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-1">
            {myServices.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No tienes servicios registrados todavía.
              </div>
            ) : (
              myServices.map((service) => (
                <button
                  type="button"
                  key={service.id}
                  onClick={() => {
                    setSelectedHistoryService(service);
                    setIsHistoryOpen(false);
                  }}
                  className={`w-full text-left rounded-2xl border border-l-4 bg-white p-4 flex gap-3 transition-all duration-150 hover:shadow-md active:scale-[0.99] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A9D8F]/50 focus-visible:ring-offset-2 ${
                    statusBorderColors[service.status] || "border-l-slate-300"
                  }`}
                >
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-base font-bold text-[#2A9D8F] break-all">
                          {service.serviceCode}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDateTime(service.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            statusColors[service.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {statusLabels[service.status] || service.status}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                          {getRequestModeLabel(service.requestMode)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        <span aria-hidden>📄</span>
                        <span>{getServiceTypeLabel(service.serviceType)}</span>
                      </span>
                    </div>

                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">{service.origin}</span>
                      <span className="mx-1.5 text-gray-400">→</span>
                      <span className="font-medium text-gray-900">{service.destination}</span>
                    </p>

                    {service.requestMode === "SCHEDULED" && service.scheduledFor && (
                      <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-800">
                        Programado: <strong>{formatDateTime(service.scheduledFor)}</strong>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center pt-1">
                    <ChevronRight className="w-5 h-5 text-slate-400" aria-hidden />
                  </div>
                </button>
              ))
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setIsHistoryOpen(false)} className="rounded-xl">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedHistoryService}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedHistoryService(null);
            setReportBlockOpen(false);
            setReportNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle del servicio</DialogTitle>
            <DialogDescription>
              Información del servicio seleccionado.
            </DialogDescription>
          </DialogHeader>
          {selectedHistoryService && (
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-lg font-bold text-[#2A9D8F] break-all">
                  {selectedHistoryService.serviceCode}
                </p>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full shrink-0 ${
                    statusColors[selectedHistoryService.status] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {statusLabels[selectedHistoryService.status] || selectedHistoryService.status}
                </span>
              </div>
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-gray-500 font-medium">Tipo</dt>
                  <dd className="text-gray-900">{getServiceTypeLabel(selectedHistoryService.serviceType)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Fecha y hora</dt>
                  <dd className="text-gray-900">{formatDateTime(selectedHistoryService.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Recoger en</dt>
                  <dd className="text-gray-900">{selectedHistoryService.origin}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Entregar en</dt>
                  <dd className="text-gray-900">{selectedHistoryService.destination}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Modo</dt>
                  <dd className="text-gray-900">
                    {getRequestModeLabel(selectedHistoryService.requestMode)}
                  </dd>
                </div>
                {selectedHistoryService.requestMode === "SCHEDULED" && selectedHistoryService.scheduledFor && (
                  <div>
                    <dt className="text-gray-500 font-medium">Programado para</dt>
                    <dd className="text-gray-900">
                      {formatDateTime(selectedHistoryService.scheduledFor)}
                    </dd>
                  </div>
                )}
                {getUsableClosePin(selectedHistoryService) ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <dt className="text-amber-700 text-xs font-medium uppercase tracking-wide flex items-center gap-1">
                      <KeyRound className="w-3 h-3" /> PIN de cierre
                    </dt>
                    <dd className="font-mono font-semibold text-amber-900 mt-1">
                      {getUsableClosePin(selectedHistoryService)}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <ServiceOperationalPreview service={selectedHistoryService} variant="onCard" />

              {isTransportistaCancelableServiceStatus(selectedHistoryService.status) ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                  disabled={cancellingServiceId === selectedHistoryService.id}
                  onClick={() => void handleCancelServiceAsTransportista(selectedHistoryService)}
                >
                  {cancellingServiceId === selectedHistoryService.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" aria-hidden />
                      Cancelando…
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-2 shrink-0" aria-hidden />
                      Cancelar servicio
                    </>
                  )}
                </Button>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Evidencias del mensajero
                </p>
                {detailEvidencesLoading ? (
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden />
                    Cargando…
                  </p>
                ) : detailEvidences.length === 0 ? (
                  <p className="text-xs text-slate-500">Sin evidencias registradas aún.</p>
                ) : (
                  <ul className="space-y-3 max-h-64 overflow-y-auto pr-0.5">
                    {detailEvidences.map((ev) => {
                      const url = buildEvidenceAbsoluteUrl(ev.file_url);
                      const mime = ev.mime_type ?? "";
                      const looksImage =
                        mime.startsWith("image/") ||
                        /\.(jpe?g|png|gif|webp|heic|heif)(\?|$)/i.test(ev.file_url || "");
                      return (
                        <li
                          key={ev.evidence_id}
                          className="rounded-lg border border-slate-100 bg-white p-2 text-xs space-y-1.5"
                        >
                          <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5 text-slate-700">
                            <span className="font-medium">{ev.kind}</span>
                            <span className="text-slate-500 shrink-0">
                              {formatDateTime(ev.created_at)}
                            </span>
                          </div>
                          {ev.note ? (
                            <p className="text-slate-600">
                              <span className="font-medium text-slate-700">Nota:</span> {ev.note}
                            </p>
                          ) : null}
                          {url && looksImage ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-md border border-slate-100 overflow-hidden"
                            >
                              <img
                                src={url}
                                alt={`Evidencia ${ev.kind}`}
                                className="max-h-32 w-full object-contain bg-slate-50"
                              />
                            </a>
                          ) : url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex text-[#2A9D8F] font-medium hover:underline"
                            >
                              Ver archivo
                            </a>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100">
                {!reportBlockOpen ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReportBlockOpen(true)}
                    className="w-full rounded-xl justify-start gap-2 text-slate-700 border-slate-200"
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    Reportar novedad
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="report-note" className="text-xs text-gray-500">
                      Observación o novedad (opcional)
                    </Label>
                    <Textarea
                      id="report-note"
                      placeholder="Describe la novedad o observación sobre este servicio..."
                      value={reportNote}
                      onChange={(e) => setReportNote(e.target.value)}
                      rows={3}
                      className="rounded-xl text-sm resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReportBlockOpen(false);
                          setReportNote("");
                        }}
                        className="rounded-xl"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          toast.info("Reporte de novedad en preparación. Próximamente disponible.");
                        }}
                        className="rounded-xl bg-slate-700 hover:bg-slate-800"
                      >
                        Enviar reporte
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setSelectedHistoryService(null)}
              className="rounded-xl"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              <Check className="w-5 h-5" />
              Servicio creado exitosamente
            </DialogTitle>
            <DialogDescription>
              Guarda estos datos para operar el servicio
            </DialogDescription>
          </DialogHeader>

          {createdService &&
            (() => {
              const createdClosePin = extractValidClosePinDigits(createdService.closePin);
              return (
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700 mb-3">
                      Información operativa del servicio:
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white rounded border border-amber-300">
                        <div>
                          <p className="text-xs text-amber-600">Código del servicio</p>
                          <p className="font-mono text-lg font-bold text-amber-900 break-all">
                            {createdService.serviceCode}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(createdService.serviceCode, "code")}
                        >
                          {copiedCode ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {createdClosePin ? (
                        <div className="flex items-center justify-between p-3 bg-white rounded border border-amber-300">
                          <div>
                            <p className="text-xs text-amber-600">PIN de cierre</p>
                            <p className="font-mono text-xl font-bold text-amber-900">{createdClosePin}</p>
                            <p className="text-xs text-amber-700 mt-1">
                              Guárdalo para finalizar el servicio
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(createdClosePin, "close")}
                          >
                            {copiedClosePin ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-gray-50 p-3">
                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Inicio:</strong> el mensajero inicia sin código ni PIN.
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Cierre:</strong> el mensajero finaliza usando solo el PIN de cierre.
                    </p>
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    ID del servicio: #{createdService.id}
                  </p>
                </div>
              );
            })()}

          <DialogFooter>
            <Button
              onClick={() => setIsSuccessOpen(false)}
              className="w-full rounded-xl bg-[#2A9D8F] hover:bg-[#238b7e]"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function renderSharedForm({
  serviceMode,
  setServiceMode,
  serviceType,
  setServiceType,
  companyId,
  setCompanyId,
  companies,
  originMode,
  setOriginMode,
  destinationMode,
  setDestinationMode,
  originNodeId,
  setOriginNodeId,
  destinationNodeId,
  setDestinationNodeId,
  origin,
  setOrigin,
  destination,
  setDestination,
  nodeReference,
  setNodeReference,
  activeNodes,
  isLoadingNodes,
  recentNodeIds,
  onRegisterRecentNode,
  manualAddressModal,
  manualAddressDraft,
  setManualAddressDraft,
  openManualAddressModal,
  closeManualAddressModal,
  confirmManualAddressModal,
}: {
  serviceMode: ServiceMode;
  setServiceMode: (value: ServiceMode) => void;
  serviceType: UiServiceType;
  setServiceType: (value: UiServiceType) => void;
  companyId: string;
  setCompanyId: (value: string) => void;
  companies: Array<{ id: number; name: string }>;
  originMode: LocationMode;
  setOriginMode: (value: LocationMode) => void;
  destinationMode: LocationMode;
  setDestinationMode: (value: LocationMode) => void;
  originNodeId: string;
  setOriginNodeId: (value: string) => void;
  destinationNodeId: string;
  setDestinationNodeId: (value: string) => void;
  origin: string;
  setOrigin: (value: string) => void;
  destination: string;
  setDestination: (value: string) => void;
  nodeReference: string;
  setNodeReference: (value: string) => void;
  activeNodes: NodeItem[];
  isLoadingNodes: boolean;
  recentNodeIds: readonly string[];
  onRegisterRecentNode: (nodeId: string) => void;
  manualAddressModal: "origin" | "destination" | null;
  manualAddressDraft: string;
  setManualAddressDraft: (value: string) => void;
  openManualAddressModal: (which: "origin" | "destination") => void;
  closeManualAddressModal: () => void;
  confirmManualAddressModal: () => void;
}) {
  return (
    <>
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto pb-32 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {serviceMode === "LIBRE" ? (
          <div className="space-y-2">
            <Label>Tipo de servicio</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "DOCS" as UiServiceType, label: "Documentos", Icon: FileDoc },
                { id: "PACKAGE" as UiServiceType, label: "Paquete", Icon: PhosphorPackage },
                { id: "COMPLIANCE" as UiServiceType, label: "Cumplido", Icon: ClipboardText },
                { id: "TRANSPORT" as UiServiceType, label: "Transporte", Icon: Motorcycle },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setServiceType(option.id)}
                  className={`
                    w-full
                    flex flex-col items-center justify-center
                    aspect-[4/3]
                    gap-2.5
                    rounded-2xl
                    border
                    px-2
                    text-center
                    transition-all duration-200
                    active:scale-[0.96]

                    ${
                      serviceType === option.id
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }
                  `}
                >
                  <option.Icon size={36} weight="duotone" />
                  <span className="w-full text-sm font-semibold leading-tight whitespace-normal break-words">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Tipo de servicio</Label>
            <div className="p-3 bg-gray-100 rounded-xl border border-gray-200">
              <span className="text-gray-700">Documentos</span>
              <span className="text-xs text-gray-500 ml-2">
                (Por ahora todo entra como DOCS al backend)
              </span>
            </div>
          </div>
        )}
      </div>

      {serviceMode === "EMPRESA" && (
        <div className="space-y-2">
          <Label>Empresa</Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Seleccionar empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.length === 0 ? (
                <SelectItem value="no-data" disabled>
                  Sin empresas cargadas aún
                </SelectItem>
              ) : (
                companies.map((company) => (
                  <SelectItem key={company.id} value={String(company.id)}>
                    {company.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#2A9D8F]/10 flex items-center justify-center">
            <MapPinned className="w-5 h-5 text-[#2A9D8F]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Recoger en</h3>
            <p className="text-xs text-gray-500">Donde inicia la gestión</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Modo para recoger</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                closeManualAddressModal();
                setOriginMode("NODE");
                setOrigin("");
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                originMode === "NODE"
                  ? "bg-[#2A9D8F] text-white"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              <MapPinLine className="h-4 w-4" />
              <span>Nodo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeManualAddressModal();
                setOriginMode("FREE");
                setOriginNodeId("");
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                originMode === "FREE"
                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                  : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              <NavigationArrow className="h-4 w-4" />
              <span>Dirección (avanzado)</span>
            </button>
          </div>
        </div>

        {originMode === "FREE" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            La dirección manual está en ajuste. Te recomendamos usar un nodo logístico.
          </div>
        )}

        {originMode === "NODE" ? (
          <NodeQuickPicker
            idPrefix="transportista-origin-node"
            label="Nodo de origen"
            nodes={activeNodes}
            value={originNodeId}
            onValueChange={setOriginNodeId}
            recentNodeIds={recentNodeIds}
            onRegisterRecent={onRegisterRecentNode}
            disabled={isLoadingNodes}
          />
        ) : (
          <div className="space-y-3">
            <Label>Dirección manual</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl h-11 border-slate-200 text-slate-800"
              onClick={() => openManualAddressModal("origin")}
            >
              Escribir dirección manual
            </Button>
            {origin.trim() !== "" ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Dirección guardada
                </p>
                <p className="text-sm text-slate-900 whitespace-pre-wrap break-words">{origin}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Aún no has definido una dirección de recogida.</p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
            <MapPinned className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Entregar en</h3>
            <p className="text-xs text-gray-500">Donde finaliza la entrega</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Modo para entregar</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                closeManualAddressModal();
                setDestinationMode("NODE");
                setDestination("");
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                destinationMode === "NODE"
                  ? "bg-[#2A9D8F] text-white"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              <MapPinLine className="h-4 w-4" />
              <span>Nodo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeManualAddressModal();
                setDestinationMode("FREE");
                setDestinationNodeId("");
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                destinationMode === "FREE" && !destination.startsWith("GPS:")
                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                  : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              <NavigationArrow className="h-4 w-4" />
              <span>Dirección (avanzado)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeManualAddressModal();
                setDestinationMode("FREE");
                setDestinationNodeId("");
                if ("geolocation" in navigator) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const { latitude, longitude } = position.coords;
                      setDestination(
                        `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
                      );
                    },
                    () => {
                      toast.error("No fue posible obtener la ubicación GPS.");
                    },
                  );
                } else {
                  toast.error("GPS no disponible en este dispositivo.");
                }
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                destinationMode === "FREE" && destination.startsWith("GPS:")
                  ? "bg-[#2A9D8F] text-white"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              <CrosshairSimple className="h-4 w-4" />
              <span>GPS</span>
            </button>
          </div>
        </div>

        {destinationMode === "FREE" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            La dirección manual está en ajuste. Te recomendamos usar un nodo logístico.
          </div>
        )}

        {destinationMode === "NODE" ? (
          <NodeQuickPicker
            idPrefix="transportista-destination-node"
            label="Nodo de destino"
            nodes={activeNodes}
            value={destinationNodeId}
            onValueChange={setDestinationNodeId}
            recentNodeIds={recentNodeIds}
            onRegisterRecent={onRegisterRecentNode}
            disabled={isLoadingNodes}
          />
        ) : (
          <div className="space-y-3">
            <Label>Dirección manual</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl h-11 border-slate-200 text-slate-800"
              onClick={() => openManualAddressModal("destination")}
            >
              Escribir dirección manual
            </Button>
            {destination.trim() !== "" ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Dirección guardada
                </p>
                <p className="text-sm text-slate-900 whitespace-pre-wrap break-words">{destination}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Aún no has definido una dirección de entrega.</p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border p-4 space-y-2">
        <Label htmlFor="node-reference">Referencia dentro del nodo (opcional)</Label>
        <Input
          id="node-reference"
          className="rounded-xl"
          placeholder="Ej: Oficina 301, Patio 2, Ventanilla documentos, Camión placa ABC123"
          value={nodeReference}
          onChange={(e) => setNodeReference(e.target.value)}
          maxLength={120}
        />
      </div>
      </div>
    </div>

    <Dialog
      open={manualAddressModal !== null}
      onOpenChange={(open) => {
        if (!open) closeManualAddressModal();
      }}
    >
      <DialogContent className="max-w-md rounded-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {manualAddressModal === "origin"
              ? "Dirección de recogida"
              : manualAddressModal === "destination"
                ? "Dirección de entrega"
                : "Dirección"}
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-slate-600">
            Escribe la dirección completa. Se usará al crear el servicio.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Textarea
            value={manualAddressDraft}
            onChange={(e) => setManualAddressDraft(e.target.value)}
            placeholder="Ej: Sociedad portuaria, bodega 3, ventanilla documentos"
            className="min-h-[200px] rounded-xl text-base resize-y"
            rows={8}
          />
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className="w-full rounded-xl bg-[#2A9D8F] hover:bg-[#238b7e]"
            onClick={() => void confirmManualAddressModal()}
          >
            Usar esta dirección
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            onClick={closeManualAddressModal}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
