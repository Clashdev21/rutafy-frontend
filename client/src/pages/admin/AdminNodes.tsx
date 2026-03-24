import { useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  MapPin,
  Plus,
  RefreshCw,
  TriangleAlert,
  Pencil,
  Trash2,
  Store,
  Power,
} from "lucide-react";

type NodeCategory =
  | "PUERTO"
  | "PATIO"
  | "EMPRESA_TRANSPORTE"
  | "PARADOR"
  | "ESTACION_SERVICIO"
  | "HOTEL"
  | "RESTAURANTE"
  | "PARQUEADERO"
  | "BODEGA"
  | "TALLER"
  | "PUNTO_OPERATIVO"
  | "OTRO";

type NodeItem = {
  node_id: string;
  code: string;
  name: string;
  category: NodeCategory;
  zone: string | null;
  lat: number;
  lng: number;
  address_text: string | null;
  is_active: boolean;
  marketplace_enabled: boolean;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

type NodesListResponse = {
  trace_id?: string;
  nodes?: NodeItem[];
};

type NodeResponse = {
  trace_id?: string;
  node?: NodeItem;
  warning?: {
    type?: string;
    nearest_node?: {
      node_id?: string;
      code?: string;
      name?: string;
      category?: string;
      zone?: string | null;
      lat?: number;
      lng?: number;
      proximity_score?: number;
    };
  } | null;
  error?: string;
};

type DeleteNodeResponse = {
  trace_id?: string;
  deleted?: boolean;
  node?: {
    node_id: string;
    code: string;
    name: string;
  };
  error?: string;
};

const API_BASE =
  (import.meta as any)?.env?.VITE_RUTAFY_API_BASE || "https://api.rutafy.app";

const CATEGORY_OPTIONS: NodeCategory[] = [
  "PUERTO",
  "PATIO",
  "EMPRESA_TRANSPORTE",
  "PARADOR",
  "ESTACION_SERVICIO",
  "HOTEL",
  "RESTAURANTE",
  "PARQUEADERO",
  "BODEGA",
  "TALLER",
  "PUNTO_OPERATIVO",
  "OTRO",
];

function formatCategoryLabel(category: NodeCategory): string {
  return category.replaceAll("_", " ");
}

export default function AdminNodes() {
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [lastWarning, setLastWarning] = useState<NodeResponse["warning"] | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [busyNodeId, setBusyNodeId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<NodeCategory>("PARADOR");
  const [zone, setZone] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [addressText, setAddressText] = useState("");
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(false);

  const totalActive = useMemo(
    () => nodes.filter((n) => n.is_active).length,
    [nodes]
  );

  const totalMarketplace = useMemo(
    () => nodes.filter((n) => n.marketplace_enabled).length,
    [nodes]
  );

  const loadNodes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/v1/nodes`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = (await response.json()) as NodesListResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data?.error || "No fue posible cargar nodos");
      }

      setNodes(data.nodes || []);
    } catch (error: any) {
      toast.error(error?.message || "No fue posible cargar nodos");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingNodeId(null);
    setName("");
    setCode("");
    setCategory("PARADOR");
    setZone("");
    setLat("");
    setLng("");
    setAddressText("");
    setMarketplaceEnabled(false);
  };

  const sortNodes = (items: NodeItem[]) => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name, "es"));
  };

  const upsertNode = (node: NodeItem) => {
    setNodes((prev) => {
      const filtered = prev.filter((item) => item.node_id !== node.node_id);
      return sortNodes([node, ...filtered]);
    });
  };

  const handleSaveNode = async () => {
    if (!name.trim()) {
      toast.error("Debes ingresar el nombre del nodo");
      return;
    }

    if (!lat.trim() || !lng.trim()) {
      toast.error("Debes ingresar latitud y longitud");
      return;
    }

    setIsCreating(true);
    setLastWarning(null);

    try {
      const payload = {
        name: name.trim(),
        code: code.trim() || undefined,
        category,
        zone: zone.trim() || undefined,
        lat: Number(lat),
        lng: Number(lng),
        address_text: addressText.trim() || undefined,
        marketplace_enabled: marketplaceEnabled,
      };

      const isEditing = Boolean(editingNodeId);
      const url = isEditing
        ? `${API_BASE}/v1/nodes/${editingNodeId}`
        : `${API_BASE}/v1/nodes`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-trace-id": `WEB-NODE-${Date.now()}`,
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as NodeResponse;

      if (!response.ok) {
        throw new Error(data?.error || "No fue posible guardar el nodo");
      }

      if (data.node) {
        upsertNode(data.node);
      }

      setLastWarning(data.warning || null);
      toast.success(isEditing ? "Nodo actualizado correctamente" : "Nodo creado correctamente");
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || "No fue posible guardar el nodo");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditNode = (node: NodeItem) => {
    setEditingNodeId(node.node_id);
    setName(node.name);
    setCode(node.code);
    setCategory(node.category);
    setZone(node.zone || "");
    setLat(String(node.lat));
    setLng(String(node.lng));
    setAddressText(node.address_text || "");
    setMarketplaceEnabled(Boolean(node.marketplace_enabled));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleActive = async (node: NodeItem) => {
    setBusyNodeId(node.node_id);
    try {
      const response = await fetch(`${API_BASE}/v1/nodes/${node.node_id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-trace-id": `WEB-NODE-STATUS-${Date.now()}`,
        },
        body: JSON.stringify({
          is_active: !node.is_active,
        }),
      });

      const data = (await response.json()) as NodeResponse;

      if (!response.ok) {
        throw new Error(data?.error || "No fue posible cambiar el estado");
      }

      if (data.node) {
        upsertNode(data.node);
      }

      toast.success(
        !node.is_active ? "Nodo activado correctamente" : "Nodo desactivado correctamente"
      );
    } catch (error: any) {
      toast.error(error?.message || "No fue posible cambiar el estado");
    } finally {
      setBusyNodeId(null);
    }
  };

  const handleToggleMarketplace = async (node: NodeItem) => {
    setBusyNodeId(node.node_id);
    try {
      const response = await fetch(`${API_BASE}/v1/nodes/${node.node_id}/marketplace`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-trace-id": `WEB-NODE-MARKET-${Date.now()}`,
        },
        body: JSON.stringify({
          marketplace_enabled: !node.marketplace_enabled,
        }),
      });

      const data = (await response.json()) as NodeResponse;

      if (!response.ok) {
        throw new Error(data?.error || "No fue posible cambiar marketplace");
      }

      if (data.node) {
        upsertNode(data.node);
      }

      toast.success(
        !node.marketplace_enabled
          ? "Nodo habilitado para marketplace"
          : "Nodo ocultado del marketplace"
      );
    } catch (error: any) {
      toast.error(error?.message || "No fue posible cambiar marketplace");
    } finally {
      setBusyNodeId(null);
    }
  };

  const handleDeleteNode = async (node: NodeItem) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar el nodo "${node.name}"?`
    );

    if (!confirmed) return;

    setBusyNodeId(node.node_id);

    try {
      const response = await fetch(`${API_BASE}/v1/nodes/${node.node_id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-trace-id": `WEB-NODE-DELETE-${Date.now()}`,
        },
      });

      const data = (await response.json()) as DeleteNodeResponse;

      if (!response.ok) {
        throw new Error(data?.error || "No fue posible eliminar el nodo");
      }

      setNodes((prev) => prev.filter((item) => item.node_id !== node.node_id));
      if (editingNodeId === node.node_id) {
        resetForm();
      }
      toast.success("Nodo eliminado correctamente");
    } catch (error: any) {
      toast.error(error?.message || "No fue posible eliminar el nodo");
    } finally {
      setBusyNodeId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Nodos</h1>
          <p className="text-gray-500 mt-1">
            Crea y consulta nodos operativos para dispatch, zonas y operación logística.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg text-[#1E3A5F] flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {editingNodeId ? "Editar nodo" : "Crear nodo"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="node-name">Nombre</Label>
                  <Input
                    id="node-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Parador Pacífico"
                  />
                </div>

                <div>
                  <Label htmlFor="node-code">Código</Label>
                  <Input
                    id="node-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="PARADOR_PACIFICO"
                  />
                </div>

                <div>
                  <Label htmlFor="node-category">Categoría</Label>
                  <select
                    id="node-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as NodeCategory)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatCategoryLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="node-zone">Zona</Label>
                  <Input
                    id="node-zone"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    placeholder="VARIANTE"
                  />
                </div>

                <div>
                  <Label htmlFor="node-lat">Latitud</Label>
                  <Input
                    id="node-lat"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="3.8891"
                    type="number"
                    step="any"
                  />
                </div>

                <div>
                  <Label htmlFor="node-lng">Longitud</Label>
                  <Input
                    id="node-lng"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="-77.0702"
                    type="number"
                    step="any"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="node-address">Dirección / referencia</Label>
                <Input
                  id="node-address"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="Parador Pacífico Buenaventura"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="marketplace-enabled"
                  type="checkbox"
                  checked={marketplaceEnabled}
                  onChange={(e) => setMarketplaceEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="marketplace-enabled" className="cursor-pointer">
                  Mostrar este nodo en marketplace futuro
                </Label>
              </div>

              {lastWarning?.type === "possible_similar_node" && lastWarning.nearest_node && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <TriangleAlert className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        Posible nodo similar detectado
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Nodo cercano:{" "}
                        <span className="font-medium">
                          {lastWarning.nearest_node.name}
                        </span>{" "}
                        ({lastWarning.nearest_node.code})
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Esta alerta no bloquea la creación, solo ayuda a evitar duplicados.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleSaveNode}
                  disabled={isCreating}
                  className="bg-[#1E3A5F] hover:bg-[#16304f]"
                >
                  {isCreating
                    ? editingNodeId
                      ? "Actualizando..."
                      : "Creando..."
                    : editingNodeId
                    ? "Guardar cambios"
                    : "Crear nodo"}
                </Button>

                <Button
                  variant="outline"
                  onClick={resetForm}
                  disabled={isCreating}
                >
                  {editingNodeId ? "Cancelar edición" : "Limpiar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1E3A5F]">
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Total nodos</span>
                <span className="font-semibold">{nodes.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Activos</span>
                <span className="font-semibold">{totalActive}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Marketplace</span>
                <span className="font-semibold">{totalMarketplace}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">API base</span>
                <span className="font-semibold text-xs text-right break-all max-w-[160px]">
                  {API_BASE}
                </span>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={loadNodes}
                  disabled={isLoading}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  {isLoading ? "Actualizando..." : "Recargar nodos"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-[#1E3A5F] flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Nodos registrados
            </CardTitle>
            <Button variant="outline" onClick={loadNodes} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Recargar
            </Button>
          </CardHeader>
          <CardContent>
            {nodes.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                Aún no hay nodos cargados en este panel. Usa “Recargar nodos” o crea el primero.
              </div>
            ) : (
              <div className="space-y-3">
                {nodes.map((node) => (
                  <div
                    key={node.node_id}
                    className="rounded-lg border bg-white p-4"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="font-semibold text-[#1E3A5F]">
                              {node.name}
                            </span>
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                              {formatCategoryLabel(node.category)}
                            </span>
                            {node.zone && (
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                                {node.zone}
                              </span>
                            )}
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                node.is_active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {node.is_active ? "Activo" : "Inactivo"}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                node.marketplace_enabled
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {node.marketplace_enabled
                                ? "Marketplace visible"
                                : "Marketplace oculto"}
                            </span>
                          </div>

                          <div className="text-sm text-gray-600 space-y-1">
                            <p>
                              <span className="font-medium">Código:</span> {node.code}
                            </p>
                            {node.address_text && (
                              <p>
                                <span className="font-medium">Referencia:</span>{" "}
                                {node.address_text}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-sm text-gray-500 lg:text-right">
                          <p>
                            <span className="font-medium">Lat:</span> {node.lat}
                          </p>
                          <p>
                            <span className="font-medium">Lng:</span> {node.lng}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditNode(node)}
                          disabled={busyNodeId === node.node_id}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(node)}
                          disabled={busyNodeId === node.node_id}
                        >
                          <Power className="h-4 w-4 mr-2" />
                          {node.is_active ? "Desactivar" : "Activar"}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleMarketplace(node)}
                          disabled={busyNodeId === node.node_id}
                        >
                          <Store className="h-4 w-4 mr-2" />
                          {node.marketplace_enabled
                            ? "Ocultar marketplace"
                            : "Mostrar en marketplace"}
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteNode(node)}
                          disabled={busyNodeId === node.node_id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}