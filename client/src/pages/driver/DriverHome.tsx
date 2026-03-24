import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Power,
  MapPin,
  Clock,
  DollarSign,
  Package,
  Car,
  X,
  Check,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileNav from "@/components/MobileNav";
import { MapView } from "@/components/Map";
import { toast } from "sonner";

interface ServiceRequest {
  id: string;
  type: "messaging" | "transport";
  origin: string;
  destination: string;
  distance: string;
  estimatedEarning: number;
  clientName: string;
  timeToAccept: number;
}

const mockRequest: ServiceRequest = {
  id: "PTX-2024-0848",
  type: "messaging",
  origin: "Centro Comercial Plaza",
  destination: "Puerto Central - Muelle 3",
  distance: "4.2 km",
  estimatedEarning: 8500,
  clientName: "María García",
  timeToAccept: 30,
};

export default function DriverHome() {
  const [, setLocation] = useLocation();
  const [isOnline, setIsOnline] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState<ServiceRequest | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [todayEarnings, setTodayEarnings] = useState(45000);
  const [todayTrips, setTodayTrips] = useState(6);

  // Simulate incoming request when online
  useEffect(() => {
    if (isOnline && !incomingRequest) {
      const timer = setTimeout(() => {
        setIncomingRequest(mockRequest);
        setTimeLeft(30);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, incomingRequest]);

  // Countdown timer for request
  useEffect(() => {
    if (incomingRequest && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && incomingRequest) {
      setIncomingRequest(null);
      toast.error("Solicitud expirada");
    }
  }, [incomingRequest, timeLeft]);

  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
    toast.success(isOnline ? "Ahora estás desconectado" : "¡Estás en línea!");
  };

  const handleAcceptRequest = () => {
    toast.success("¡Servicio aceptado!");
    setIncomingRequest(null);
    setLocation("/driver/service");
  };

  const handleRejectRequest = () => {
    setIncomingRequest(null);
    toast.info("Solicitud rechazada");
  };

  return (
    <div className="mobile-shell">
      {/* Map Background */}
      <div className="absolute inset-0">
        <MapView
          className="h-full"
          onMapReady={(map: google.maps.Map) => {
            map.setCenter({ lat: 10.9685, lng: -74.7813 });
            map.setZoom(14);
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 safe-top">
        <div className="flex items-center justify-between p-4">
          <div className="bg-white rounded-xl shadow-md p-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
                }`}
              />
              <span className="font-medium text-[#1E3A5F]">
                {isOnline ? "En línea" : "Desconectado"}
              </span>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
            <span className="font-semibold text-[#36f532]">Rutafy</span>
          </div>
          <div className="w-24" />
        </div>
      </div>

      {/* Stats Card */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 mx-4 mt-2"
      >
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <p className="text-sm text-gray-500 mb-2">Ganancias de hoy</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-[#2A9D8F]" />
              <span className="text-2xl font-bold text-[#1E3A5F]">
                ${todayEarnings.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <Navigation className="w-4 h-4" />
              <span className="text-sm">{todayTrips} viajes</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Online Toggle Button */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-28 left-0 right-0 z-10 px-4"
      >
        <Button
          onClick={handleToggleOnline}
          className={`w-full h-16 rounded-2xl text-lg font-semibold shadow-lg transition-all ${
            isOnline
              ? "bg-red-500 hover:bg-red-600"
              : "bg-[#2A9D8F] hover:bg-[#1F7A6F]"
          }`}
        >
          <Power className="w-6 h-6 mr-3" />
          {isOnline ? "Desconectarse" : "Conectarse"}
        </Button>
      </motion.div>

      {/* Incoming Request Modal */}
      <AnimatePresence>
        {incomingRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full bg-white rounded-t-3xl safe-bottom"
            >
              {/* Timer bar */}
              <div className="h-1 bg-gray-200">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 30, ease: "linear" }}
                  className="h-full bg-[#2A9D8F]"
                />
              </div>

              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        incomingRequest.type === "messaging"
                          ? "bg-[#E0F2F1]"
                          : "bg-[#E8ECF1]"
                      }`}
                    >
                      {incomingRequest.type === "messaging" ? (
                        <Package className="w-5 h-5 text-[#2A9D8F]" />
                      ) : (
                        <Car className="w-5 h-5 text-[#1E3A5F]" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-[#1E3A5F]">
                        Nueva solicitud
                      </p>
                      <p className="text-sm text-gray-500">
                        {incomingRequest.type === "messaging"
                          ? "Mensajería"
                          : "Transporte"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#2A9D8F]">
                      ${incomingRequest.estimatedEarning.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {incomingRequest.distance}
                    </p>
                  </div>
                </div>

                {/* Route */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-3 h-3 mt-1.5 rounded-full bg-[#2A9D8F]" />
                    <div>
                      <p className="text-xs text-gray-500">Recoger en</p>
                      <p className="font-medium text-[#1E3A5F]">
                        {incomingRequest.origin}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 mt-1.5 rounded-full bg-[#E53E3E]" />
                    <div>
                      <p className="text-xs text-gray-500">Entregar en</p>
                      <p className="font-medium text-[#1E3A5F]">
                        {incomingRequest.destination}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Client info */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="font-medium text-gray-600">
                      {incomingRequest.clientName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-[#1E3A5F]">
                      {incomingRequest.clientName}
                    </p>
                    <p className="text-sm text-gray-500">Cliente</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 text-orange-500">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">{timeLeft}s</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-14 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={handleRejectRequest}
                  >
                    <X className="w-5 h-5 mr-2" />
                    Rechazar
                  </Button>
                  <Button
                    className="flex-1 h-14 bg-[#2A9D8F] hover:bg-[#1F7A6F]"
                    onClick={handleAcceptRequest}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Aceptar
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <MobileNav type="driver" />
    </div>
  );
}
