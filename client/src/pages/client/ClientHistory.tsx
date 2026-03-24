import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Car, ChevronRight, Calendar, MapPin } from "lucide-react";
import MobileNav from "@/components/MobileNav";

interface Service {
  id: string;
  type: "messaging" | "transport";
  origin: string;
  destination: string;
  date: string;
  price: number;
  status: "completed" | "cancelled";
  driverName: string;
}

const mockServices: Service[] = [
  {
    id: "PTX-2024-0847",
    type: "messaging",
    origin: "Centro Comercial",
    destination: "Puerto Central",
    date: "2026-02-01",
    price: 12500,
    status: "completed",
    driverName: "Carlos R.",
  },
  {
    id: "PTX-2024-0846",
    type: "transport",
    origin: "Aeropuerto",
    destination: "Hotel Marina",
    date: "2026-01-31",
    price: 28000,
    status: "completed",
    driverName: "María S.",
  },
  {
    id: "PTX-2024-0845",
    type: "messaging",
    origin: "Oficina Central",
    destination: "Terminal de Carga",
    date: "2026-01-30",
    price: 8500,
    status: "cancelled",
    driverName: "Juan P.",
  },
  {
    id: "PTX-2024-0844",
    type: "transport",
    origin: "Zona Industrial",
    destination: "Centro Histórico",
    date: "2026-01-29",
    price: 15000,
    status: "completed",
    driverName: "Ana G.",
  },
  {
    id: "PTX-2024-0843",
    type: "messaging",
    origin: "Muelle 5",
    destination: "Almacén Norte",
    date: "2026-01-28",
    price: 9800,
    status: "completed",
    driverName: "Pedro L.",
  },
];

export default function ClientHistory() {
  const [filter, setFilter] = useState<"all" | "messaging" | "transport">("all");

  const filteredServices = mockServices.filter(
    (s) => filter === "all" || s.type === filter
  );

  return (
    <div className="mobile-shell bg-background">
      {/* Header */}
      <div className="safe-top bg-[#1E3A5F] text-white">
        <div className="p-4 pb-6">
          <h1 className="text-2xl font-bold">Historial</h1>
          <p className="text-white/70 text-sm">Tus servicios anteriores</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 -mt-3">
        <div className="bg-white rounded-xl shadow-md p-1 flex">
          {[
            { id: "all", label: "Todos" },
            { id: "messaging", label: "Mensajería" },
            { id: "transport", label: "Transporte" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.id
                  ? "bg-[#2A9D8F] text-white"
                  : "text-gray-600"
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
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    service.type === "messaging"
                      ? "bg-[#E0F2F1]"
                      : "bg-[#E8ECF1]"
                  }`}
                >
                  {service.type === "messaging" ? (
                    <Package className="w-5 h-5 text-[#2A9D8F]" />
                  ) : (
                    <Car className="w-5 h-5 text-[#1E3A5F]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{service.id}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        service.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {service.status === "completed"
                        ? "Completado"
                        : "Cancelado"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm mb-1">
                    <MapPin className="w-3 h-3 text-[#2A9D8F]" />
                    <span className="text-gray-700 truncate">
                      {service.origin}
                    </span>
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-700 truncate">
                      {service.destination}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(service.date).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <span>•</span>
                      <span>{service.driverName}</span>
                    </div>
                    <span className="font-semibold text-[#1E3A5F]">
                      ${service.price.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <MobileNav type="client" />
    </div>
  );
}
