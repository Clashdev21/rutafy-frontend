import AdminLayout from "@/components/AdminLayout";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Eye, Trash2, Truck, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Service = {
  id: number;
  customerId: number;
  driverId: number | null;
  companyId: number | null;
  serviceType: "MESSAGING" | "TRANSPORT";
  origin: string;
  destination: string;
  status: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "FULFILLED";
  serviceCode: string;
  servicePin: string;
  createdAt: Date;
  updatedAt: Date;
};

type ServiceEvent = {
  id: number;
  serviceId: number;
  eventType: string;
  actorUserId: number | null;
  createdAt: Date;
};

const statusLabels = {
  CREATED: "Creado",
  IN_PROGRESS: "En Progreso",
  COMPLETED: "Completado",
  FULFILLED: "Entregado",
};

const statusColors = {
  CREATED: "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FULFILLED: "bg-purple-100 text-purple-700",
};

const serviceTypeLabels = {
  MESSAGING: "Mensajería",
  TRANSPORT: "Transporte",
};

export default function AdminServicesPage() {
  const utils = trpc.useUtils();
  const { data: services = [], isLoading } = trpc.admin.services.list.useQuery();
  
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [events, setEvents] = useState<ServiceEvent[]>([]);

  const { data: serviceEvents = [] } = trpc.admin.services.getEvents.useQuery(
    { serviceId: selectedService?.id || 0 },
    { enabled: !!selectedService && isDetailOpen }
  );

  const updateStatusMutation = trpc.admin.services.updateStatus.useMutation({
    onSuccess: () => {
      utils.admin.services.list.invalidate();
      toast.success("Estado actualizado exitosamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.admin.services.delete.useMutation({
    onSuccess: () => {
      utils.admin.services.list.invalidate();
      setIsDeleteOpen(false);
      setSelectedService(null);
      toast.success("Servicio eliminado exitosamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleStatusChange = (serviceId: number, newStatus: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "FULFILLED") => {
    updateStatusMutation.mutate({ id: serviceId, status: newStatus });
  };

  const handleDelete = () => {
    if (!selectedService) return;
    deleteMutation.mutate({ id: selectedService.id });
  };

  const openDetail = (service: Service) => {
    setSelectedService(service);
    setIsDetailOpen(true);
  };

  const openDelete = (service: Service) => {
    setSelectedService(service);
    setIsDeleteOpen(true);
  };

  const filteredServices = statusFilter === "all"
    ? services
    : services.filter(s => s.status === statusFilter);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">Servicios</h1>
            <p className="text-gray-500 mt-1">Gestiona los servicios del sistema</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="CREATED">Creado</SelectItem>
                <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
                <SelectItem value="COMPLETED">Completado</SelectItem>
                <SelectItem value="FULFILLED">Entregado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#1E3A5F] flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Listado de Servicios ({filteredServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Cargando...</div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No hay servicios registrados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServices.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-mono text-sm">
                          #{service.id}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {serviceTypeLabels[service.serviceType]}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-sm">
                          {service.origin}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-sm">
                          {service.destination}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={service.status}
                            onValueChange={(value: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "FULFILLED") =>
                              handleStatusChange(service.id, value)
                            }
                          >
                            <SelectTrigger className="w-[140px] h-8">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[service.status]}`}>
                                {statusLabels[service.status]}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CREATED">Creado</SelectItem>
                              <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
                              <SelectItem value="COMPLETED">Completado</SelectItem>
                              <SelectItem value="FULFILLED">Entregado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {new Date(service.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {service.status === "COMPLETED" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                onClick={() => handleStatusChange(service.id, "FULFILLED")}
                                title="Marcar como Entregado"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDetail(service)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => openDelete(service)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalle del Servicio #{selectedService?.id}</DialogTitle>
              <DialogDescription>
                Información completa y historial del servicio
              </DialogDescription>
            </DialogHeader>
            {selectedService && (
              <div className="space-y-6 py-4">
                {/* Service Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Tipo de Servicio</p>
                    <p className="font-medium">{serviceTypeLabels[selectedService.serviceType]}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Estado</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[selectedService.status]}`}>
                      {statusLabels[selectedService.status]}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Origen</p>
                    <p className="font-medium text-sm">{selectedService.origin}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Destino</p>
                    <p className="font-medium text-sm">{selectedService.destination}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Cliente ID</p>
                    <p className="font-medium">#{selectedService.customerId}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Conductor ID</p>
                    <p className="font-medium">{selectedService.driverId ? `#${selectedService.driverId}` : "Sin asignar"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Creado</p>
                    <p className="font-medium text-sm">
                      {new Date(selectedService.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Actualizado</p>
                    <p className="font-medium text-sm">
                      {new Date(selectedService.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Service Code & PIN - Admin Only */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Credenciales de Validación (Solo Admin)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-amber-700">Código del Servicio</p>
                      <p className="font-mono text-lg font-bold text-amber-900 bg-white px-3 py-2 rounded border border-amber-300">
                        {selectedService.serviceCode || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-amber-700">PIN de 4 dígitos</p>
                      <p className="font-mono text-lg font-bold text-amber-900 bg-white px-3 py-2 rounded border border-amber-300">
                        {selectedService.servicePin || "N/A"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    Estos datos son necesarios para que el mensajero inicie y complete el servicio.
                  </p>
                </div>

                {/* Events History */}
                <div>
                  <h3 className="font-semibold text-[#1E3A5F] mb-3">Historial de Eventos</h3>
                  {serviceEvents.length === 0 ? (
                    <p className="text-gray-400 text-sm">No hay eventos registrados</p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {serviceEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">{event.eventType}</p>
                            {event.actorUserId && (
                              <p className="text-xs text-gray-500">
                                Por usuario #{event.actorUserId}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(event.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar Servicio</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar el servicio #{selectedService?.id}?
                Esta acción eliminará también el historial de eventos asociado.
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
    </AdminLayout>
  );
}
