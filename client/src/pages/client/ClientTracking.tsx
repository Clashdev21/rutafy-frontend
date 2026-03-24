import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Phone,
  MessageCircle,
  Star,
  Navigation,
  CheckCircle2,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/Map";
import { toast } from "sonner";

type ServiceStatus = "accepted" | "arriving" | "inProgress" | "completed";

const statusSteps = [
  { id: "accepted", label: "Conductor asignado" },
  { id: "arriving", label: "En camino al origen" },
  { id: "inProgress", label: "Servicio en curso" },
  { id: "completed", label: "Completado" },
];

const driver = {
  name: "Carlos Rodríguez",
  rating: 4.8,
  trips: 342,
  vehicle: "Honda CB 150",
  plate: "ABC-123",
  photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
};

export default function ClientTracking() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<ServiceStatus>("accepted");
  const [showQR, setShowQR] = useState(false);

  // Simulate status progression
  useEffect(() => {
    const timers = [
      setTimeout(() => setStatus("arriving"), 3000),
      setTimeout(() => setStatus("inProgress"), 8000),
      setTimeout(() => {
        setStatus("completed");
        toast.success("¡Servicio completado!");
      }, 15000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const currentStepIndex = statusSteps.findIndex((s) => s.id === status);

  return (
    <div className="mobile-shell">
      {/* Map Background */}
      <div className="absolute inset-0">
        <MapView
          className="h-full"
          onMapReady={(map: google.maps.Map) => {
            map.setCenter({ lat: 10.9685, lng: -74.7813 });
            map.setZoom(15);
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 safe-top">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setLocation("/client")}
            className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center"
          >
            <ChevronLeft className="w-6 h-6 text-[#1E3A5F]" />
          </button>
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
            <span className="font-medium text-[#1E3A5F]">
              Servicio #{Math.floor(Math.random() * 9000) + 1000}
            </span>
          </div>
          <button
            onClick={() => setShowQR(true)}
            className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center"
          >
            <QrCode className="w-5 h-5 text-[#1E3A5F]" />
          </button>
        </div>
      </div>

      {/* Status Progress */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 mx-4 mt-2"
      >
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            {statusSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index <= currentStepIndex
                      ? "bg-[#2A9D8F] text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {index < statusSteps.length - 1 && (
                  <div
                    className={`w-8 h-1 mx-1 rounded ${
                      index < currentStepIndex ? "bg-[#2A9D8F]" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center mt-3 font-medium text-[#1E3A5F]">
            {statusSteps[currentStepIndex].label}
          </p>
        </div>
      </motion.div>

      {/* Driver Card */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-0 left-0 right-0 z-10 safe-bottom"
      >
        <div className="bg-white rounded-t-3xl shadow-2xl p-6">
          {/* Pull indicator */}
          <div className="pull-indicator mb-4" />

          {/* Driver info */}
          <div className="flex items-center gap-4 mb-4">
            <img
              src={driver.photo}
              alt={driver.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-[#2A9D8F]"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-[#1E3A5F] text-lg">
                {driver.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span>{driver.rating}</span>
                <span>•</span>
                <span>{driver.trips} viajes</span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-[#1E3A5F]">{driver.vehicle}</p>
              <p className="text-sm text-gray-500">{driver.plate}</p>
            </div>
          </div>

          {/* ETA */}
          {status !== "completed" && (
            <div className="bg-[#E0F2F1] rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <Navigation className="w-5 h-5 text-[#2A9D8F]" />
                <div>
                  <p className="text-sm text-gray-600">Tiempo estimado</p>
                  <p className="font-semibold text-[#1E3A5F]">
                    {status === "accepted"
                      ? "5 minutos para llegar"
                      : status === "arriving"
                      ? "2 minutos para llegar"
                      : "8 minutos al destino"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {status !== "completed" ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => toast.info("Función próximamente")}
              >
                <Phone className="w-4 h-4 mr-2" />
                Llamar
              </Button>
              <Button
                className="flex-1 bg-[#2A9D8F] hover:bg-[#1F7A6F]"
                onClick={() => toast.info("Chat próximamente")}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Mensaje
              </Button>
            </div>
          ) : (
            <Button
              className="w-full bg-[#2A9D8F] hover:bg-[#1F7A6F]"
              onClick={() => setLocation("/client")}
            >
              Volver al inicio
            </Button>
          )}
        </div>
      </motion.div>

      {/* QR Modal */}
      {showQR && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowQR(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-[#1E3A5F] text-center mb-4">
              Código QR del Servicio
            </h3>
            <div className="bg-gray-100 rounded-xl p-8 flex items-center justify-center mb-4">
              {/* Simulated QR Code */}
              <div className="w-48 h-48 bg-white p-4 rounded-lg shadow-inner">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <rect x="10" y="10" width="20" height="20" fill="#1E3A5F" />
                  <rect x="70" y="10" width="20" height="20" fill="#1E3A5F" />
                  <rect x="10" y="70" width="20" height="20" fill="#1E3A5F" />
                  <rect x="35" y="35" width="30" height="30" fill="#2A9D8F" />
                  <rect x="40" y="10" width="5" height="5" fill="#1E3A5F" />
                  <rect x="50" y="10" width="5" height="5" fill="#1E3A5F" />
                  <rect x="10" y="40" width="5" height="5" fill="#1E3A5F" />
                  <rect x="10" y="50" width="5" height="5" fill="#1E3A5F" />
                  <rect x="85" y="40" width="5" height="5" fill="#1E3A5F" />
                  <rect x="85" y="50" width="5" height="5" fill="#1E3A5F" />
                  <rect x="40" y="85" width="5" height="5" fill="#1E3A5F" />
                  <rect x="50" y="85" width="5" height="5" fill="#1E3A5F" />
                </svg>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 mb-4">
              Muestra este código al conductor para iniciar o finalizar el
              servicio
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowQR(false)}
            >
              Cerrar
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
