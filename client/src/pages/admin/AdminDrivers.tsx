import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronLeft,
  Star,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Phone,
  Mail,
  Car,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MobileNav from "@/components/MobileNav";
import { toast } from "sonner";

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo: string;
  vehicle: string;
  plate: string;
  rating: number;
  trips: number;
  status: "active" | "inactive" | "pending";
  isOnline: boolean;
}

const mockDrivers: Driver[] = [
  {
    id: "DRV-001",
    name: "Carlos Rodríguez",
    email: "carlos@email.com",
    phone: "+57 310 987 6543",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    vehicle: "Honda CB 150",
    plate: "ABC-123",
    rating: 4.8,
    trips: 342,
    status: "active",
    isOnline: true,
  },
  {
    id: "DRV-002",
    name: "Ana Sánchez",
    email: "ana@email.com",
    phone: "+57 315 456 7890",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    vehicle: "Yamaha FZ",
    plate: "DEF-456",
    rating: 4.9,
    trips: 567,
    status: "active",
    isOnline: true,
  },
  {
    id: "DRV-003",
    name: "Pedro López",
    email: "pedro@email.com",
    phone: "+57 320 123 4567",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    vehicle: "Suzuki GN 125",
    plate: "GHI-789",
    rating: 4.6,
    trips: 189,
    status: "active",
    isOnline: false,
  },
  {
    id: "DRV-004",
    name: "María González",
    email: "maria@email.com",
    phone: "+57 318 765 4321",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    vehicle: "Honda XR 150",
    plate: "JKL-012",
    rating: 4.7,
    trips: 423,
    status: "inactive",
    isOnline: false,
  },
  {
    id: "DRV-005",
    name: "Juan Martínez",
    email: "juan@email.com",
    phone: "+57 312 345 6789",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    vehicle: "Bajaj Pulsar",
    plate: "MNO-345",
    rating: 0,
    trips: 0,
    status: "pending",
    isOnline: false,
  },
];

export default function AdminDrivers() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "pending">("all");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const filteredDrivers = mockDrivers.filter((driver) => {
    const matchesSearch =
      driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || driver.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleApprove = (driver: Driver) => {
    toast.success(`${driver.name} ha sido aprobado`);
    setSelectedDriver(null);
  };

  const handleBlock = (driver: Driver) => {
    toast.error(`${driver.name} ha sido bloqueado`);
    setSelectedDriver(null);
  };

  return (
    <div className="mobile-shell bg-background">
      {/* Header */}
      <div className="safe-top bg-[#1E3A5F] text-white">
        <div className="p-4 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setLocation("/admin")}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Conductores</h1>
          </div>
          <p className="text-white/70 text-sm">
            {mockDrivers.length} conductores registrados
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 -mt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Buscar conductor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white shadow-md"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {[
            { id: "all", label: "Todos", count: mockDrivers.length },
            {
              id: "active",
              label: "Activos",
              count: mockDrivers.filter((d) => d.status === "active").length,
            },
            {
              id: "inactive",
              label: "Inactivos",
              count: mockDrivers.filter((d) => d.status === "inactive").length,
            },
            {
              id: "pending",
              label: "Pendientes",
              count: mockDrivers.filter((d) => d.status === "pending").length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab.id
                  ? "bg-[#2A9D8F] text-white"
                  : "bg-white text-gray-600 shadow-sm"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Drivers List */}
      <div className="flex-1 overflow-auto pb-24 px-4 pt-4">
        <div className="space-y-3">
          {filteredDrivers.map((driver, index) => (
            <motion.div
              key={driver.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-sm p-4"
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <img
                    src={driver.photo}
                    alt={driver.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  {driver.isOnline && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#1E3A5F]">
                      {driver.name}
                    </h3>
                    <button
                      onClick={() => setSelectedDriver(driver)}
                      className="p-1"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{driver.id}</p>
                  <div className="flex items-center gap-3 text-sm">
                    {driver.status !== "pending" && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-gray-600">{driver.rating}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Car className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{driver.vehicle}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {driver.trips} viajes
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        driver.status === "active"
                          ? "bg-green-100 text-green-700"
                          : driver.status === "inactive"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {driver.status === "active"
                        ? "Activo"
                        : driver.status === "inactive"
                        ? "Inactivo"
                        : "Pendiente"}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Driver Detail Modal */}
      <AnimatePresence>
        {selectedDriver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end"
            onClick={() => setSelectedDriver(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full bg-white rounded-t-3xl safe-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="pull-indicator mb-4" />

                {/* Driver Info */}
                <div className="flex items-center gap-4 mb-6">
                  <img
                    src={selectedDriver.photo}
                    alt={selectedDriver.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-[#2A9D8F]"
                  />
                  <div>
                    <h3 className="font-bold text-xl text-[#1E3A5F]">
                      {selectedDriver.name}
                    </h3>
                    <p className="text-sm text-gray-500">{selectedDriver.id}</p>
                    {selectedDriver.status !== "pending" && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">
                          {selectedDriver.rating}
                        </span>
                        <span className="text-gray-500">
                          • {selectedDriver.trips} viajes
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">{selectedDriver.email}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">{selectedDriver.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Car className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">
                      {selectedDriver.vehicle} • {selectedDriver.plate}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {selectedDriver.status === "pending" ? (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleBlock(selectedDriver)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rechazar
                      </Button>
                      <Button
                        className="flex-1 bg-[#2A9D8F] hover:bg-[#1F7A6F]"
                        onClick={() => handleApprove(selectedDriver)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Aprobar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedDriver(null)}
                      >
                        Cerrar
                      </Button>
                      <Button
                        variant="outline"
                        className={`flex-1 ${
                          selectedDriver.status === "active"
                            ? "border-red-200 text-red-600 hover:bg-red-50"
                            : "border-green-200 text-green-600 hover:bg-green-50"
                        }`}
                        onClick={() =>
                          selectedDriver.status === "active"
                            ? handleBlock(selectedDriver)
                            : handleApprove(selectedDriver)
                        }
                      >
                        {selectedDriver.status === "active" ? (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Bloquear
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Activar
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <MobileNav type="admin" />
    </div>
  );
}
