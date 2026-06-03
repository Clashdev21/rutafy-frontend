import {
  createAdminMessenger,
  getAdminMessengers,
  updateAdminMessenger,
  type AdminMessenger,
} from "@/api/admin-messengers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Package, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const DOC_TYPES = ["CC", "CE", "TI", "PA"] as const;

type IsActiveFilter = "all" | "true" | "false";

const EMPTY_CREATE = {
  full_name: "",
  phone: "",
  password: "",
  doc_type: "" as string,
  doc_number: "",
  vehicle_type: "",
  plate: "",
};

function formatCreatedAt(iso?: string | null): string {
  if (!iso?.trim()) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function availabilityBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "AVAILABLE" || s === "ONLINE") {
    return "bg-green-100 text-green-700";
  }
  if (s === "BUSY") return "bg-amber-100 text-amber-800";
  if (s === "OFFLINE") return "bg-slate-100 text-slate-600";
  return "bg-blue-100 text-blue-700";
}

function matchesSearch(m: AdminMessenger, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    m.full_name,
    m.phone,
    m.plate,
    m.doc_number,
    m.doc_type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function MessengerCard({
  messenger,
  onEdit,
}: {
  messenger: AdminMessenger;
  onEdit: (m: AdminMessenger) => void;
}) {
  const isLegacy = messenger.user_id == null;
  const availability = messenger.availability_status?.trim();

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[#1E3A5F]">{messenger.full_name}</p>
          <p className="text-sm text-gray-600">{messenger.phone}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {isLegacy ? (
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
              LEGACY
            </Badge>
          ) : null}
          <Badge
            variant="outline"
            className={`text-xs ${
              messenger.is_active
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {messenger.is_active ? "ACTIVE" : "INACTIVE"}
          </Badge>
          {availability ? (
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium ${availabilityBadgeClass(availability)}`}
            >
              {availability}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
        <span>
          Placa:{" "}
          <span className="font-medium text-gray-800">
            {messenger.plate?.trim() || "—"}
          </span>
        </span>
        <span>
          Vehículo:{" "}
          <span className="font-medium text-gray-800">
            {messenger.vehicle_type?.trim() || "—"}
          </span>
        </span>
        <span className="col-span-2">
          Doc:{" "}
          <span className="font-medium text-gray-800">
            {[messenger.doc_type, messenger.doc_number].filter(Boolean).join(" ") || "—"}
          </span>
        </span>
        <span className="col-span-2">
          Nodo:{" "}
          <span className="font-medium text-gray-800">
            {messenger.current_node_name?.trim() || "—"}
          </span>
        </span>
        <span className="col-span-2 text-gray-500">
          Creado: {formatCreatedAt(messenger.created_at)}
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1"
        onClick={() => onEdit(messenger)}
      >
        <Edit className="h-3.5 w-3.5" />
        Editar
      </Button>
    </div>
  );
}

export default function AdminMensajerosPage() {
  const [items, setItems] = useState<AdminMessenger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<IsActiveFilter>("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<AdminMessenger | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE });
  const [editForm, setEditForm] = useState({
    full_name: "",
    is_active: true,
    doc_type: "",
    doc_number: "",
    vehicle_type: "",
    plate: "",
  });

  const loadMessengers = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getAdminMessengers({
        limit: 100,
        is_active: isActiveFilter,
      });
      setItems(list);
      setError(null);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No fue posible cargar mensajeros";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isActiveFilter]);

  useEffect(() => {
    void loadMessengers();
  }, [loadMessengers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filteredItems = useMemo(
    () => items.filter((m) => matchesSearch(m, debouncedSearch)),
    [items, debouncedSearch],
  );

  const openCreate = () => {
    setCreateForm({ ...EMPTY_CREATE });
    setIsCreateOpen(true);
  };

  const openEdit = (m: AdminMessenger) => {
    setEditing(m);
    setEditForm({
      full_name: m.full_name,
      is_active: m.is_active,
      doc_type: m.doc_type?.trim() ?? "",
      doc_number: m.doc_number?.trim() ?? "",
      vehicle_type: m.vehicle_type?.trim() ?? "",
      plate: m.plate?.trim() ?? "",
    });
    setIsEditOpen(true);
  };

  const handleCreate = async () => {
    if (!createForm.full_name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (!createForm.phone.trim()) {
      toast.error("El teléfono es requerido");
      return;
    }
    if (!createForm.password) {
      toast.error("La contraseña es requerida");
      return;
    }

    setIsSaving(true);
    try {
      await createAdminMessenger({
        full_name: createForm.full_name,
        phone: createForm.phone,
        password: createForm.password,
        doc_type: createForm.doc_type || undefined,
        doc_number: createForm.doc_number || undefined,
        vehicle_type: createForm.vehicle_type || undefined,
        plate: createForm.plate || undefined,
      });
      toast.success("Mensajero creado");
      setIsCreateOpen(false);
      setCreateForm({ ...EMPTY_CREATE });
      await loadMessengers();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al crear mensajero");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editing) return;
    if (!editForm.full_name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setIsSaving(true);
    try {
      await updateAdminMessenger(editing.id, {
        full_name: editForm.full_name,
        is_active: editForm.is_active,
        doc_type: editForm.doc_type,
        doc_number: editForm.doc_number,
        vehicle_type: editForm.vehicle_type,
        plate: editForm.plate,
      });
      toast.success("Mensajero actualizado");
      setIsEditOpen(false);
      setEditing(null);
      await loadMessengers();
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Error al actualizar mensajero",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">Mensajeros</h1>
            <p className="text-gray-500 mt-1">
              Gestión operativa (API Rutafy)
            </p>
          </div>
          <Button
            type="button"
            onClick={openCreate}
            className="bg-[#36f532] hover:bg-[#2dd429] text-[#1E3A5F]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo mensajero
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nombre, teléfono, placa, documento…"
              className="pl-9"
            />
          </div>
          <Select
            value={isActiveFilter}
            onValueChange={(v) => setIsActiveFilter(v as IsActiveFilter)}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#1E3A5F] flex items-center gap-2">
              <Package className="h-5 w-5" />
              Listado ({filteredItems.length}
              {debouncedSearch ? ` de ${items.length}` : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Cargando...</div>
            ) : error && items.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-red-600 text-sm font-medium">{error}</p>
                <p className="text-xs text-gray-400">
                  Verifica VITE_RUTAFY_API_BASE y VITE_RUTAFY_ADMIN_KEY en
                  .env.local
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {debouncedSearch
                  ? "Sin resultados para la búsqueda"
                  : "No hay mensajeros"}
              </div>
            ) : (
              <>
                <div className="md:hidden space-y-3">
                  {filteredItems.map((m) => (
                    <MessengerCard
                      key={m.id}
                      messenger={m}
                      onEdit={openEdit}
                    />
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Vehículo</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Nodo</TableHead>
                        <TableHead>Creado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((m) => {
                        const isLegacy = m.user_id == null;
                        const availability = m.availability_status?.trim();
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {m.full_name}
                                {isLegacy ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-amber-50 text-amber-800"
                                  >
                                    LEGACY
                                  </Badge>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{m.phone}</TableCell>
                            <TableCell className="text-sm font-mono">
                              {m.plate?.trim() || "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {m.vehicle_type?.trim() || "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {[m.doc_type, m.doc_number]
                                .filter(Boolean)
                                .join(" ") || "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    m.is_active
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {m.is_active ? "ACTIVE" : "INACTIVE"}
                                </Badge>
                                {availability ? (
                                  <span
                                    className={`px-2 py-0.5 text-xs rounded-full ${availabilityBadgeClass(availability)}`}
                                  >
                                    {availability}
                                  </span>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm max-w-[120px] truncate">
                              {m.current_node_name?.trim() || "—"}
                            </TableCell>
                            <TableCell className="text-gray-500 text-xs whitespace-nowrap">
                              {formatCreatedAt(m.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(m)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo mensajero</DialogTitle>
              <DialogDescription>
                Crea un mensajero en Rutafy (teléfono no editable después).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="create-name">Nombre completo *</Label>
                <Input
                  id="create-name"
                  value={createForm.full_name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, full_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-phone">Teléfono *</Label>
                <Input
                  id="create-phone"
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Contraseña *</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo documento</Label>
                  <Select
                    value={createForm.doc_type || "none"}
                    onValueChange={(v) =>
                      setCreateForm({
                        ...createForm,
                        doc_type: v === "none" ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {DOC_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-doc">Número documento</Label>
                  <Input
                    id="create-doc"
                    value={createForm.doc_number}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        doc_number: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-vehicle">Tipo vehículo</Label>
                <Input
                  id="create-vehicle"
                  value={createForm.vehicle_type}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      vehicle_type: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-plate">Placa</Label>
                <Input
                  id="create-plate"
                  value={createForm.plate}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, plate: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => void handleCreate()}
                disabled={isSaving}
                className="bg-[#36f532] hover:bg-[#2dd429] text-[#1E3A5F]"
              >
                {isSaving ? "Creando…" : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar mensajero</DialogTitle>
              <DialogDescription>
                Teléfono, disponibilidad y nodo no se editan aquí.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre completo *</Label>
                <Input
                  id="edit-name"
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, full_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <p className="text-sm font-medium text-gray-700 py-2 px-3 bg-gray-50 rounded-md border">
                  {editing?.phone ?? "—"}
                </p>
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label htmlFor="edit-active">Activo</Label>
                <Switch
                  id="edit-active"
                  checked={editForm.is_active}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, is_active: checked })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo documento</Label>
                  <Select
                    value={editForm.doc_type || "none"}
                    onValueChange={(v) =>
                      setEditForm({
                        ...editForm,
                        doc_type: v === "none" ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {DOC_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-doc">Número documento</Label>
                  <Input
                    id="edit-doc"
                    value={editForm.doc_number}
                    onChange={(e) =>
                      setEditForm({ ...editForm, doc_number: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-vehicle">Tipo vehículo</Label>
                <Input
                  id="edit-vehicle"
                  value={editForm.vehicle_type}
                  onChange={(e) =>
                    setEditForm({ ...editForm, vehicle_type: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-plate">Placa</Label>
                <Input
                  id="edit-plate"
                  value={editForm.plate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, plate: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => void handleEdit()}
                disabled={isSaving}
                className="bg-[#36f532] hover:bg-[#2dd429] text-[#1E3A5F]"
              >
                {isSaving ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
