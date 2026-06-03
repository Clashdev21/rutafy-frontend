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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Building2, Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Company = {
  id: number;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export default function AdminCompanies() {
  const utils = trpc.useUtils();
  const { data: companies = [], isLoading } = trpc.admin.companies.list.useQuery();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({ name: "", active: true });

  const createMutation = trpc.admin.companies.create.useMutation({
    onSuccess: () => {
      utils.admin.companies.list.invalidate();
      setIsCreateOpen(false);
      setFormData({ name: "", active: true });
      toast.success("Empresa creada exitosamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.admin.companies.update.useMutation({
    onSuccess: () => {
      utils.admin.companies.list.invalidate();
      setIsEditOpen(false);
      setSelectedCompany(null);
      toast.success("Empresa actualizada exitosamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.admin.companies.delete.useMutation({
    onSuccess: () => {
      utils.admin.companies.list.invalidate();
      setIsDeleteOpen(false);
      setSelectedCompany(null);
      toast.success("Empresa eliminada exitosamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = () => {
    if (!selectedCompany || !formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    updateMutation.mutate({
      id: selectedCompany.id,
      name: formData.name,
      active: formData.active,
    });
  };

  const handleDelete = () => {
    if (!selectedCompany) return;
    deleteMutation.mutate({ id: selectedCompany.id });
  };

  const openEdit = (company: Company) => {
    setSelectedCompany(company);
    setFormData({ name: company.name, active: company.active });
    setIsEditOpen(true);
  };

  const openDelete = (company: Company) => {
    setSelectedCompany(company);
    setIsDeleteOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">Empresas</h1>
            <p className="text-gray-500 mt-1">Gestiona las empresas registradas</p>
          </div>
          <Button
            onClick={() => {
              setFormData({ name: "", active: true });
              setIsCreateOpen(true);
            }}
            className="bg-[#36f532] hover:bg-[#2dd429] text-[#1E3A5F]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Empresa
          </Button>
        </div>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#1E3A5F] flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Listado de Empresas ({companies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Cargando...</div>
            ) : companies.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No hay empresas registradas
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Creada</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-mono text-sm">
                        #{company.id}
                      </TableCell>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            company.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {company.active ? "Activa" : "Inactiva"}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {new Date(company.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(company)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => openDelete(company)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Empresa</DialogTitle>
              <DialogDescription>
                Ingresa los datos de la nueva empresa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Activa</Label>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="bg-[#36f532] hover:bg-[#2dd429] text-[#1E3A5F]"
              >
                {createMutation.isPending ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Empresa</DialogTitle>
              <DialogDescription>
                Modifica los datos de la empresa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-active">Activa</Label>
                <Switch
                  id="edit-active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleEdit}
                disabled={updateMutation.isPending}
                className="bg-[#36f532] hover:bg-[#2dd429] text-[#1E3A5F]"
              >
                {updateMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar Empresa</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar la empresa "{selectedCompany?.name}"?
                Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
