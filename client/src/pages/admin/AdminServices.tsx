import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Search,
  ChevronLeft,
  Package,
  Car,
  MapPin,
  ChevronRight,
  Calendar,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import MobileNav from "@/components/MobileNav";

interface Service {
  id: string;
  type: "messaging" | "transport";
  client: string;
  driver: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  amount: number;
  commission: number;
  status: "completed" | "in_progress" | "cancelled";
}

const mockServices: Service[] = [
  {
    id: "PTX-2024-0848",
    type: "messaging",
    client: "María García",
    driver: "Carlos R.",
    origin: "Centro Comercial Plaza",
    destination: "Puerto Central - Muelle 3",
    date: "2026-02-01",
    time: "14:32",
    amount: 12500,
    commission: 1875,
    status: "completed",
  },
  {
    id: "PTX-2024-0847",
    type: "transport",
    client: "Juan Pérez",
    driver: "Ana S.",
    origin: "Aeropuerto Internacional",
    destination: "Hotel Marina Bay",
    date: "2026-02-01",
    time: "13:45",
    amount: 28000,
    commission: 4200,
    status: "in_progress",
  },
  {
    id: "PTX-2024-0846",
    type: "messaging",
    client: "Laura Martínez",
    driver: "Pedro L.",
    origin: "Oficina Central",
    destination: "Terminal de Carga",
    date: "2026-02-01",
    time: "12:18",
    amount: 8500,
    commission: 1275,
    status: "completed",
  },
  {
    id: "PTX-2024-0845",
    type: "transport",
    client: "Roberto Díaz",
    driver: "María G.",
    origin: "Zona Industrial Norte",
    destination: "Centro Histórico",
    date: "2026-02-01",
    time: "11:05",
    amount: 15000,
    commission: 2250,
    status: "cancelled",
  },
  {
    id: "PTX-2024-0844",
    type: "messaging",
    client: "Carmen López",
    driver: "Juan M.",
    origin: "Muelle 5",
    destination: "Almacén Norte",
    date: "2026-01-31",
    time: "16:42",
    amount: 9800,
    commission: 1470,
    status: "completed",
  },
  {
    id: "PTX-2024-0843",
    type: "transport",
    client: "Andrés Silva",
    driver: "Carlos R.",
    origin: "Terminal de Buses",
    destination: "Zona Franca",
    date: "2026-01-31",
    time: "15:20",
    amount: 18500,
    commission: 2775,
    status: "completed",
  },
];

export default function AdminServices() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "in_progress" | "cancelled">("all");

  const filteredServices = mockServices.filter((service) => {
    const matchesSearch =
      service.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.driver.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || service.status === filter;
    return matchesSearch && matchesFilter;
  });

  const totalAmount = filteredServices
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.amount, 0);

  const totalCommission = filteredServices
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.commission, 0);

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
            <h1 className="text-2xl font-bold">Servicios</h1>
          </div>
          <p className="text-white/70 text-sm">
            {mockServices.length} servicios registrados
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-4 -mt-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-xs text-gray-500 mb-1">Total Ingresos</p>
            <p className="text-xl font-bold text-[#1E3A5F]">
              ${totalAmount.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-xs text-gray-500 mb-1">Total Comisión</p>
            <p className="text-xl font-bold text-[#2A9D8F]">
              ${totalCommission.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Buscar servicio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {[
            { id: "all", label: "Todos" },
            { id: "completed", label: "Completados" },
            { id: "in_progress", label: "En curso" },
            { id: "cancelled", label: "Cancelados" },
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
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Services List */}
      <div className="flex-1 overflow-auto pb-24 px-4 pt-4">
        <div className="space-y-3">
          {filteredServices.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-sm p-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      service.type === "messaging"
                        ? "bg-[#E0F2F1]"
                        : "bg-[#E8ECF1]"
                    }`}
                  >
                    {service.type === "messaging" ? (
                      <Package className="w-4 h-4 text-[#2A9D8F]" />
                    ) : (
                      <Car className="w-4 h-4 text-[#1E3A5F]" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[#1E3A5F] text-sm">
                      {service.id}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(service.date).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        • {service.time}
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    service.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : service.status === "in_progress"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {service.status === "completed"
                    ? "Completado"
                    : service.status === "in_progress"
                    ? "En curso"
                    : "Cancelado"}
                </span>
              </div>

              {/* Route */}
              <div className="flex items-center gap-1 text-sm mb-3">
                <MapPin className="w-3 h-3 text-[#2A9D8F] flex-shrink-0" />
                <span className="text-gray-700 truncate">{service.origin}</span>
                <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700 truncate">
                  {service.destination}
                </span>
              </div>

              {/* People & Amount */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="text-sm">
                  <p className="text-gray-500">
                    Cliente:{" "}
                    <span className="text-[#1E3A5F] font-medium">
                      {service.client}
                    </span>
                  </p>
                  <p className="text-gray-500">
                    Conductor:{" "}
                    <span className="text-[#1E3A5F] font-medium">
                      {service.driver}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[#1E3A5F]">
                    ${service.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#2A9D8F]">
                    Comisión: ${service.commission.toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <MobileNav type="admin" />
    </div>
  );
}
