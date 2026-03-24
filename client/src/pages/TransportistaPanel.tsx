import { useAuth } from "@/_core/hooks/useAuth";
import { http } from "@/api/http";
import { createService } from "@/api/services";
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
  ShieldCheck,
  ClipboardList,
  KeyRound,
  MapPinned,
  RefreshCw,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Sparkles,
  MessageSquarePlus,
  Loader2,
} from "lucide-react";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ServiceMode = "EMPRESA" | "LIBRE";
type UiServiceType = "DOCS" | "PACKAGE" | "COMPLIANCE" | "TRANSPORT";
type LocationMode = "NODE" | "FREE";
type RequestFlow = "NOW" | "SCHEDULED";
type ExpandedPanel = "NOW" | "SCHEDULED" | null;

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
};

type BackendCreateServiceResponse = Record<string, unknown>;

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
  origin?: string | null;
  destination?: string | null;
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
};

type BackendServicesListResponse = {
  trace_id?: string;
  services?: BackendServiceRow[];
  error?: string;
};

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

function normalizeCreateResponse(
  data: BackendCreateServiceResponse,
): CreatedServiceInfo {
  const id = String(data.id ?? data.service_id ?? data.serviceId ?? data.uuid ?? "sin-id");

  const serviceCode = String(data.serviceCode ?? data.service_code ?? data.code ?? id);

  const closePin = String(data.closePin ?? data.close_pin ?? "----");

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
  const createdAt = String(
    service.created_at ?? service.createdAt ?? new Date().toISOString(),
  );
  const origin = String(service.origin ?? "Origen no definido");
  const destination = String(service.destination ?? "Destino no definido");

  return {
    id,
    status: String(service.status ?? "REQUESTED"),
    origin,
    destination,
    createdAt,
    serviceCode: String(
      service.serviceCode ??
        service.service_code ??
        `RTF-${id.slice(0, 6).toUpperCase()}`,
    ),
    closePin: String(service.closePin ?? service.close_pin ?? "N/D"),
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
  };
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

export default function TransportistaPanel() {
  const { user, logout, loading } = useAuth();
  const [, setLocation] = useLocation();

  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [selectedHistoryService, setSelectedHistoryService] = useState<LocalServiceItem | null>(null);
  const [reportBlockOpen, setReportBlockOpen] = useState(false);
  const [reportNote, setReportNote] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedClosePin, setCopiedClosePin] = useState(false);
  const [isCreatingNow, setIsCreatingNow] = useState(false);
  const [isCreatingScheduled, setIsCreatingScheduled] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [serviceMode, setServiceMode] = useState<ServiceMode>("LIBRE");
  const [serviceType, setServiceType] = useState<UiServiceType>("DOCS");
  const [companyId, setCompanyId] = useState("");

  const [originMode, setOriginMode] = useState<LocationMode>("FREE");
  const [destinationMode, setDestinationMode] = useState<LocationMode>("FREE");

  const [originNodeId, setOriginNodeId] = useState("");
  const [destinationNodeId, setDestinationNodeId] = useState("");

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [originNodeSearch, setOriginNodeSearch] = useState("");
  const [destinationNodeSearch, setDestinationNodeSearch] = useState("");

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

  const stats = useMemo(() => {
    return {
      total: myServices.length,
      requested: myServices.filter((s) => s.status === "REQUESTED").length,
      claimed: myServices.filter((s) => s.status === "CLAIMED").length,
      started: myServices.filter((s) => s.status === "STARTED").length,
      closed: myServices.filter((s) => s.status === "CLOSED").length,
    };
  }, [myServices]);

  const activeService = useMemo(() => {
    const priority = ["STARTED", "CLAIMED", "OFFERED", "REQUESTED"];
    for (const status of priority) {
      const found = myServices.find(
        (service) => service.status?.toUpperCase() === status,
      );
      if (found) return found;
    }
    return null;
  }, [myServices]);

  const recentServices = useMemo(() => myServices.slice(0, 5), [myServices]);

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

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const resetForm = () => {
    setServiceMode("LIBRE");
    setServiceType("DOCS");
    setCompanyId("");
    setOriginMode("FREE");
    setDestinationMode("FREE");
    setOriginNodeId("");
    setDestinationNodeId("");
    setOrigin("");
    setDestination("");
    setScheduledAt("");
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

  const togglePanel = (panel: ExpandedPanel) => {
    setExpandedPanel((prev) => (prev === panel ? null : panel));
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
      <div className="bg-[#2A9D8F] text-white p-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
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
                <h1 className="text-xl font-bold">Panel Transportista</h1>
                <p className="text-white/75 text-sm">
                  {user?.name || user?.email || "Usuario"}
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white hover:bg-white/10 active:scale-95 transition-all duration-150"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_0.9fr] gap-6">
          <div className="space-y-6">
            <Card className="border-0 shadow-sm bg-gradient-to-r from-[#2A9D8F] to-[#238b7e] text-white overflow-hidden">
              <CardContent className="p-4 md:p-6">
                {activeService ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
                          <Motorcycle className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-white/80">
                            Servicio activo
                          </p>
                          <p className="text-xs text-white/90 mt-0.5">
                            {getServiceTypeLabel(activeService.serviceType)}
                          </p>
                          <p className="text-sm font-semibold text-white mt-0.5 line-clamp-2">
                            {activeService.origin}{" "}
                            <span className="mx-1">→</span>
                            {activeService.destination}
                          </p>
                          <p className="text-xs font-mono text-white/80 mt-1">
                            Código: {activeService.serviceCode}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`rounded-2xl bg-white/12 px-3 py-2 text-xs md:text-sm backdrop-blur-sm ${
                          activeService.status === "OFFERED" ? "animate-pulse" : ""
                        }`}
                      >
                        <p className="text-white/80">Estado actual</p>
                        <p className="font-semibold mt-0.5">
                          {statusLabels[activeService.status] || activeService.status}
                        </p>
                      </div>
                    </div>

                    <div className="mt-1">
                      {(() => {
                        const stepIndex = getProgressStepIndex(activeService.status);
                        const percent =
                          (stepIndex / Math.max(progressSteps.length - 1, 1)) * 100;
                        return (
                          <div className="space-y-3">
                            <div className="relative h-8">
                              <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full bg-white/20" />
                              <div
                                className="absolute -top-1 transition-all duration-500 ease-out"
                                style={{
                                  left: `${percent}%`,
                                  transform: "translateX(-50%)",
                                }}
                              >
                                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-md">
                                  <Motorcycle className="h-4 w-4 text-[#2A9D8F]" />
                                </div>
                              </div>
                              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-1">
                                {progressSteps.map((step, index) => {
                                  const isPast = index <= stepIndex;
                                  return (
                                    <div
                                      key={step.key}
                                      className="flex flex-col items-center w-full"
                                    >
                                      <div
                                        className={`h-2 w-2 rounded-full border border-white ${
                                          isPast ? "bg-white" : "bg-transparent"
                                        }`}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex justify-between text-xs text-white/80">
                              {progressSteps.map((step, index) => {
                                const isPast = index <= stepIndex;
                                return (
                                  <span
                                    key={step.key}
                                    className={`w-full text-center ${
                                      isPast ? "font-semibold text-white" : ""
                                    }`}
                                  >
                                    {step.label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <ServiceOperationalPreview service={activeService} variant="onColor" />
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
                        <Truck className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div>
                        <h2 className="text-base md:text-lg font-semibold">
                          Sin servicio activo
                        </h2>
                        <p className="text-white/85 mt-1 text-sm">
                          Solicita un servicio o programa una recogida para empezar a operar.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/12 px-4 py-3 text-sm backdrop-blur-sm">
                      <p className="text-white/80">Estado general</p>
                      <p className="font-semibold mt-1">
                        Sin servicio activo
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-0 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => togglePanel("NOW")}
                  className="w-full text-left group"
                >
                  <CardContent
                    className={[
                      "p-5 md:p-6 transition-all duration-150 border rounded-2xl",
                      expandedPanel === "NOW"
                        ? "border-[#2A9D8F] bg-[#2A9D8F]/5 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.995]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={[
                            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105",
                            expandedPanel === "NOW"
                              ? "bg-[#2A9D8F]"
                              : "bg-[#2A9D8F]/10",
                          ].join(" ")}
                        >
                          <Sparkles
                            className={[
                              "w-7 h-7",
                              expandedPanel === "NOW"
                                ? "text-white"
                                : "text-[#2A9D8F]",
                            ].join(" ")}
                          />
                        </div>
                        <div>
                          <p className="text-lg md:text-xl font-bold tracking-[0.1em] text-[#2A9D8F] uppercase animate-[pulse_2.5s_ease-in-out_infinite]">
                            Solicitar ahora
                          </p>
                          <h3 className="text-lg md:text-xl font-semibold text-slate-800 mt-1">
                            Mensajero asignado lo antes posible
                          </h3>
                          <p className="text-sm text-slate-500 mt-0.5">
                            Usa este modo para servicios inmediatos de operación.
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 rounded-full bg-slate-100 p-2">
                        {expandedPanel === "NOW" ? (
                          <ChevronUp className="w-5 h-5 text-slate-700" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-700" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </button>

                {expandedPanel === "NOW" && (
                  <div className="border-t bg-white">
                    <CardContent className="p-5 md:p-6 space-y-5 animate-in fade-in duration-200">
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
                        originNodeSearch,
                        setOriginNodeSearch,
                        destinationNodeSearch,
                        setDestinationNodeSearch,
                        activeNodes,
                        originSelectedNode,
                        destinationSelectedNode,
                        isLoadingNodes,
                      })}

                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setExpandedPanel(null)}
                          className="rounded-xl"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => handleCreateService("NOW")}
                          disabled={isCreatingNow}
                          className="rounded-xl bg-[#2A9D8F] hover:bg-[#238b7e] active:scale-[0.98] transition-all duration-150 shadow-sm"
                        >
                          {isCreatingNow ? "Creando..." : "Crear servicio ahora"}
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                )}
              </Card>

              <Card className="border-0 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => togglePanel("SCHEDULED")}
                  className="w-full text-left group"
                >
                  <CardContent
                    className={[
                      "p-5 md:p-6 transition-all duration-150 border rounded-2xl",
                      expandedPanel === "SCHEDULED"
                        ? "border-blue-600 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.995]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={[
                            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105",
                            expandedPanel === "SCHEDULED"
                              ? "bg-blue-600"
                              : "bg-blue-100",
                          ].join(" ")}
                        >
                          <CalendarClock
                            className={[
                              "w-7 h-7",
                              expandedPanel === "SCHEDULED"
                                ? "text-white"
                                : "text-blue-700",
                            ].join(" ")}
                          />
                        </div>
                        <div>
                          <p className="text-base md:text-lg font-bold tracking-[0.12em] text-blue-700 uppercase">
                            Programar recogida
                          </p>
                          <h3 className="text-lg md:text-xl font-semibold text-slate-800 mt-1">
                            Agenda el servicio para más tarde
                          </h3>
                          <p className="text-sm text-slate-500 mt-0.5">
                            Programa una recogida futura sin mezclarla con el flujo inmediato.
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 rounded-full bg-slate-100 p-2">
                        {expandedPanel === "SCHEDULED" ? (
                          <ChevronUp className="w-5 h-5 text-slate-700" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-700" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </button>

                {expandedPanel === "SCHEDULED" && (
                  <div className="border-t bg-white">
                    <CardContent className="p-5 md:p-6 space-y-5 animate-in fade-in duration-200">
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
                        originNodeSearch,
                        setOriginNodeSearch,
                        destinationNodeSearch,
                        setDestinationNodeSearch,
                        activeNodes,
                        originSelectedNode,
                        destinationSelectedNode,
                        isLoadingNodes,
                      })}

                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setExpandedPanel(null)}
                          className="rounded-xl"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => handleCreateService("SCHEDULED")}
                          disabled={isCreatingScheduled}
                          className="rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 shadow-sm"
                        >
                          {isCreatingScheduled ? "Programando..." : "Programar recogida"}
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                )}
              </Card>
            </div>

            <Card className="border-0 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setIsHistoryExpanded((prev) => !prev)}
                className="w-full text-left"
              >
                <CardContent
                  className={[
                    "p-5 md:p-6 transition-all duration-150 border rounded-2xl",
                    isHistoryExpanded
                      ? "border-slate-300 bg-slate-50/50 shadow-sm"
                      : "border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.995]",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={[
                          "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm",
                          isHistoryExpanded ? "bg-slate-600" : "bg-slate-100",
                        ].join(" ")}
                      >
                        <History
                          className={["w-7 h-7", isHistoryExpanded ? "text-white" : "text-slate-700"].join(" ")}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                          Historial
                        </p>
                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
                          Últimos 5 servicios
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {recentServices.length === 0
                            ? "Tus servicios recientes aparecerán aquí."
                            : `${recentServices.length} servicio${recentServices.length !== 1 ? "s" : ""} reciente${recentServices.length !== 1 ? "s" : ""}. Toca para ver.`}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full bg-slate-100 p-2">
                      {isHistoryExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-700" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-700" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </button>

              {isHistoryExpanded && (
                <div className="border-t bg-white">
                  <CardContent className="p-5 md:p-6 space-y-4 animate-in fade-in duration-200">
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadTransportistaHistory();
                        }}
                        disabled={isLoadingHistory}
                        className="rounded-xl"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingHistory ? "animate-spin" : ""}`} />
                        {isLoadingHistory ? "Actualizando..." : "Recargar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsHistoryOpen(true);
                        }}
                        className="rounded-xl"
                      >
                        Ver historial completo
                      </Button>
                    </div>
                    {recentServices.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        No tienes servicios registrados todavía.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentServices.map((service) => (
                      <button
                        type="button"
                        key={service.id}
                        onClick={() => setSelectedHistoryService(service)}
                        className={`w-full text-left rounded-2xl border border-l-4 bg-white p-4 transition-all duration-150 hover:shadow-md active:scale-[0.99] cursor-pointer flex gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A9D8F]/50 focus-visible:ring-offset-2 ${
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

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                            <div className="rounded-lg bg-[#2A9D8F]/5 border border-[#2A9D8F]/20 px-3 py-2">
                              <p className="text-[11px] text-gray-500 uppercase tracking-wide">Código</p>
                              <p className="font-mono text-sm font-semibold text-[#2A9D8F] break-all">
                                {service.serviceCode}
                              </p>
                            </div>
                            <div className="rounded-lg bg-amber-50/80 border border-amber-200/60 px-3 py-2">
                              <p className="text-[11px] text-amber-700 uppercase tracking-wide flex items-center gap-1">
                                <KeyRound className="w-3 h-3" /> PIN cierre
                              </p>
                              <p className="font-mono text-sm font-semibold text-amber-900">
                                {service.closePin}
                              </p>
                            </div>
                          </div>

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
                    ))}
                      </div>
                    )}
                  </CardContent>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  Resumen corto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Total</span>
                  <span className="font-semibold">{stats.total}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Solicitados</span>
                  <span className="font-semibold">{stats.requested}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Tomados</span>
                  <span className="font-semibold">{stats.claimed}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">En curso</span>
                  <span className="font-semibold">{stats.started}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Cerrados</span>
                  <span className="font-semibold">{stats.closed}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Servicio activo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!activeService ? (
                  <div className="rounded-2xl border border-dashed bg-slate-50 p-4 text-sm text-slate-500">
                    No tienes ningún servicio en curso en este momento.
                  </div>
                ) : (
                  <div className="rounded-2xl border bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          statusColors[activeService.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabels[activeService.status] || activeService.status}
                      </span>

                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
                        {getRequestModeLabel(activeService.requestMode)}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Ruta</p>
                      <p className="text-sm text-gray-800">
                        <strong>{activeService.origin}</strong>
                        <span className="mx-2">→</span>
                        <strong>{activeService.destination}</strong>
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Código</p>
                      <p className="font-mono text-sm font-semibold text-[#2A9D8F] break-all">
                        {activeService.serviceCode}
                      </p>
                    </div>

                    <ServiceOperationalPreview service={activeService} variant="onCard" />

                    {activeService.closePin &&
                      activeService.closePin !== "N/D" &&
                      activeService.closePin !== "----" &&
                      (activeService.status === "STARTED" ? (
                        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3 space-y-2">
                          <p className="text-xs font-semibold text-amber-800">
                            PIN listo para cierre
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-mono text-lg font-bold text-amber-900">
                              {activeService.closePin}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(activeService.closePin, "close")
                              }
                              className="shrink-0"
                            >
                              {copiedClosePin ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-amber-700">
                            Úsalo al finalizar el servicio
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              PIN de cierre
                            </p>
                            <p className="font-mono text-sm font-semibold text-gray-800">
                              {activeService.closePin}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(activeService.closePin, "close")
                            }
                            className="shrink-0"
                          >
                            {copiedClosePin ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ))}

                    {activeService.requestMode === "SCHEDULED" && activeService.scheduledFor && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Programado</p>
                        <p className="text-sm text-gray-800">
                          {formatDateTime(activeService.scheduledFor)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Mi Perfil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Nombre</span>
                    <span className="font-medium">{user?.name || "-"}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium">{user?.email || "-"}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Rol</span>
                    <span className="px-2 py-1 bg-[#2A9D8F]/10 text-[#2A9D8F] rounded-full text-sm font-medium">
                      Transportista
                    </span>
                  </div>

                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">Estado</span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Activo
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
                {selectedHistoryService.closePin && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <dt className="text-amber-700 text-xs font-medium uppercase tracking-wide flex items-center gap-1">
                      <KeyRound className="w-3 h-3" /> PIN de cierre
                    </dt>
                    <dd className="font-mono font-semibold text-amber-900 mt-1">
                      {selectedHistoryService.closePin}
                    </dd>
                  </div>
                )}
              </dl>

              <ServiceOperationalPreview service={selectedHistoryService} variant="onCard" />

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

          {createdService && (
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

                  <div className="flex items-center justify-between p-3 bg-white rounded border border-amber-300">
                    <div>
                      <p className="text-xs text-amber-600">PIN de cierre</p>
                      <p className="font-mono text-xl font-bold text-amber-900">
                        {createdService.closePin}
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Guárdalo para finalizar el servicio
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(createdService.closePin, "close")}
                    >
                      {copiedClosePin ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
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
          )}

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
  originNodeSearch,
  setOriginNodeSearch,
  destinationNodeSearch,
  setDestinationNodeSearch,
  activeNodes,
  originSelectedNode,
  destinationSelectedNode,
  isLoadingNodes,
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
  originNodeSearch: string;
  setOriginNodeSearch: (value: string) => void;
  destinationNodeSearch: string;
  setDestinationNodeSearch: (value: string) => void;
  activeNodes: NodeItem[];
  originSelectedNode: NodeItem | null;
  destinationSelectedNode: NodeItem | null;
  isLoadingNodes: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {serviceMode === "LIBRE" ? (
          <div className="space-y-2">
            <Label>Tipo de servicio</Label>
            <div className="grid grid-cols-2 gap-4">
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
                    flex flex-col items-center justify-center
                    h-32
                    gap-3
                    rounded-2xl
                    border
                    transition-all duration-200
                    active:scale-[0.96]

                    ${
                      serviceType === option.id
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }
                  `}
                >
                  <option.Icon size={42} weight="duotone" />
                  <span className="text-sm font-semibold text-center">
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
                setOriginMode("FREE");
                setOriginNodeId("");
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                originMode === "FREE"
                  ? "bg-[#2A9D8F] text-white"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              <NavigationArrow className="h-4 w-4" />
              <span>Dirección</span>
            </button>
          </div>
        </div>

        {originMode === "NODE" ? (
          <div className="space-y-2">
            <Label>Nodo de origen</Label>
            <Select value={originNodeId} onValueChange={setOriginNodeId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue
                  placeholder={
                    isLoadingNodes
                      ? "Cargando nodos..."
                      : "Seleccionar nodo de origen"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {activeNodes.length > 0 && (
                  <div className="p-2 sticky top-0 bg-white z-10">
                    <Input
                      placeholder="Buscar por nombre, tipo o zona..."
                      value={originNodeSearch}
                      onChange={(e) => setOriginNodeSearch(e.target.value)}
                      className="h-8 text-xs rounded-xl"
                    />
                  </div>
                )}

                {activeNodes.length === 0 ? (
                  <SelectItem value="no-nodes-origin" disabled>
                    No hay nodos activos disponibles
                  </SelectItem>
                ) : (
                  activeNodes
                    .filter((node) => {
                      if (!originNodeSearch.trim()) return true;
                      const needle = normalizeComparableText(originNodeSearch);
                      const composite = normalizeComparableText(
                        `${node.name} ${node.category || ""} ${node.zone || ""}`,
                      );
                      return composite.includes(needle);
                    })
                    .map((node) => {
                      const zoneText = node.zone || "Sin zona";
                      const categoryText = (node.category || "").replace(/_/g, " ");

                      return (
                        <SelectItem key={node.node_id} value={node.node_id}>
                          <div className="flex flex-col text-left">
                            <span className="text-sm font-medium text-slate-900">
                              {node.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {zoneText} · {categoryText}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })
                )}
              </SelectContent>
            </Select>

            {originSelectedNode && (
              <div className="rounded-xl border bg-gray-50 p-3 text-sm text-gray-600">
                <p className="font-medium text-gray-800">
                  {originSelectedNode.name}
                </p>
                <p>
                  {originSelectedNode.zone || "Sin zona"} · {originSelectedNode.category}
                </p>
                {originSelectedNode.address_text && (
                  <p>{originSelectedNode.address_text}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Recoger en</Label>
            <Input
              className="rounded-xl"
              placeholder="Dirección o punto de recogida"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
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
                setDestinationMode("FREE");
                setDestinationNodeId("");
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                destinationMode === "FREE" && !destination.startsWith("GPS:")
                  ? "bg-[#2A9D8F] text-white"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              <NavigationArrow className="h-4 w-4" />
              <span>Dirección</span>
            </button>

            <button
              type="button"
              onClick={() => {
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

        {destinationMode === "NODE" ? (
          <div className="space-y-2">
            <Label>Nodo de destino</Label>
            <Select
              value={destinationNodeId}
              onValueChange={setDestinationNodeId}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue
                  placeholder={
                    isLoadingNodes
                      ? "Cargando nodos..."
                      : "Seleccionar nodo de destino"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {activeNodes.length > 0 && (
                  <div className="p-2 sticky top-0 bg-white z-10">
                    <Input
                      placeholder="Buscar por nombre, tipo o zona..."
                      value={destinationNodeSearch}
                      onChange={(e) => setDestinationNodeSearch(e.target.value)}
                      className="h-8 text-xs rounded-xl"
                    />
                  </div>
                )}

                {activeNodes.length === 0 ? (
                  <SelectItem value="no-nodes-destination" disabled>
                    No hay nodos activos disponibles
                  </SelectItem>
                ) : (
                  activeNodes
                    .filter((node) => {
                      if (!destinationNodeSearch.trim()) return true;
                      const needle = normalizeComparableText(destinationNodeSearch);
                      const composite = normalizeComparableText(
                        `${node.name} ${node.category || ""} ${node.zone || ""}`,
                      );
                      return composite.includes(needle);
                    })
                    .map((node) => {
                      const zoneText = node.zone || "Sin zona";
                      const categoryText = (node.category || "").replace(/_/g, " ");

                      return (
                        <SelectItem key={node.node_id} value={node.node_id}>
                          <div className="flex flex-col text-left">
                            <span className="text-sm font-medium text-slate-900">
                              {node.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {zoneText} · {categoryText}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })
                )}
              </SelectContent>
            </Select>

            {destinationSelectedNode && (
              <div className="rounded-xl border bg-gray-50 p-3 text-sm text-gray-600">
                <p className="font-medium text-gray-800">
                  {destinationSelectedNode.name}
                </p>
                <p>
                  {destinationSelectedNode.zone || "Sin zona"} · {destinationSelectedNode.category}
                </p>
                {destinationSelectedNode.address_text && (
                  <p>{destinationSelectedNode.address_text}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Entregar en</Label>
            <Input
              className="rounded-xl"
              placeholder="Dirección o punto de entrega"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}