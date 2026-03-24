import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Navigation,
  Phone,
  MessageCircle,
  QrCode,
  Camera,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/Map";
import { toast } from "sonner";

type ServicePhase = "toPickup" | "atPickup" | "toDestination" | "atDestination" | "completed";

const service = {
  id: "PTX-2024-0848",
  clientName: "María García",
  clientPhone: "+57 300 123 4567",
  origin: "Centro Comercial Plaza",
  destination: "Puerto Central - Muelle 3",
  earning: 8500,
};

export default function DriverService() {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<ServicePhase>("toPickup");
  const [showScanner, setShowScanner] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const handleArrivedAtPickup = () => {
    setPhase("atPickup");
    toast.success("Has llegado al punto de recogida");
  };

  const handleScanQR = () => {
    setShowScanner(true);
  };

  const handleQRScanned = () => {
    setShowScanner(false);
    if (phase === "atPickup") {
      setPhase("toDestination");
      toast.success("Servicio iniciado");
    } else if (phase === "atDestination") {
      setShowCamera(true);
    }
  };

  const handleArrivedAtDestination = () => {
    setPhase("atDestination");
    toast.success("Has llegado al destino");
  };

  const handlePhotoTaken = () => {
    setShowCamera(false);
    setPhase("completed");
    toast.success("¡Servicio completado!");
  };

  const handleFinish = () => {
    setLocation("/driver");
  };

  const getPhaseInfo = () => {
    switch (phase) {
      case "toPickup":
        return {
          title: "En camino al origen",
          subtitle: service.origin,
          action: "He llegado",
          onAction: handleArrivedAtPickup,
        };
      case "atPickup":
        return {
          title: "En punto de recogida",
          subtitle: "Escanea el QR del cliente para iniciar",
          action: "Escanear QR",
          onAction: handleScanQR,
        };
      case "toDestination":
        return {
          title: "En camino al destino",
          subtitle: service.destination,
          action: "He llegado",
          onAction: handleArrivedAtDestination,
        };
      case "atDestination":
        return {
          title: "En destino",
          subtitle: "Escanea el QR para finalizar",
          action: "Escanear QR",
          onAction: handleScanQR,
        };
      case "completed":
        return {
          title: "Servicio completado",
          subtitle: `Ganancia: $${service.earning.toLocaleString()}`,
          action: "Finalizar",
          onAction: handleFinish,
        };
    }
  };

  const phaseInfo = getPhaseInfo();

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
            onClick={() => setLocation("/driver")}
            className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center"
          >
            <ChevronLeft className="w-6 h-6 text-[#1E3A5F]" />
          </button>
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
            <span className="font-medium text-[#1E3A5F]">{service.id}</span>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Progress Steps */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 mx-4 mt-2"
      >
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            {["toPickup", "atPickup", "toDestination", "atDestination", "completed"].map(
              (step, index) => {
                const stepIndex = ["toPickup", "atPickup", "toDestination", "atDestination", "completed"].indexOf(phase);
                const isCompleted = index < stepIndex;
                const isCurrent = index === stepIndex;
                return (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        isCompleted
                          ? "bg-[#2A9D8F] text-white"
                          : isCurrent
                          ? "bg-[#1E3A5F] text-white"
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    {index < 4 && (
                      <div
                        className={`w-6 h-0.5 mx-0.5 ${
                          isCompleted ? "bg-[#2A9D8F]" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </motion.div>

      {/* Bottom Card */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-0 left-0 right-0 z-10 safe-bottom"
      >
        <div className="bg-white rounded-t-3xl shadow-2xl p-6">
          <div className="pull-indicator mb-4" />

          {/* Phase Info */}
          <div className="mb-4">
            <h3 className="font-semibold text-[#1E3A5F] text-lg">
              {phaseInfo.title}
            </h3>
            <div className="flex items-center gap-2 text-gray-500">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{phaseInfo.subtitle}</span>
            </div>
          </div>

          {/* Client Info */}
          {phase !== "completed" && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-[#E0F2F1] flex items-center justify-center">
                <span className="font-medium text-[#2A9D8F]">
                  {service.clientName.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#1E3A5F]">
                  {service.clientName}
                </p>
                <p className="text-sm text-gray-500">Cliente</p>
              </div>
              <button
                onClick={() => toast.info("Función próximamente")}
                className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center"
              >
                <Phone className="w-5 h-5 text-[#1E3A5F]" />
              </button>
              <button
                onClick={() => toast.info("Chat próximamente")}
                className="w-10 h-10 rounded-full bg-[#2A9D8F] shadow flex items-center justify-center"
              >
                <MessageCircle className="w-5 h-5 text-white" />
              </button>
            </div>
          )}

          {/* Earning summary for completed */}
          {phase === "completed" && (
            <div className="bg-[#E0F2F1] rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Ganancia del servicio</span>
                <span className="text-2xl font-bold text-[#2A9D8F]">
                  ${service.earning.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Main Action */}
          <Button
            onClick={phaseInfo.onAction}
            className={`w-full h-14 text-lg ${
              phase === "completed"
                ? "bg-[#1E3A5F] hover:bg-[#152A4A]"
                : "bg-[#2A9D8F] hover:bg-[#1F7A6F]"
            }`}
          >
            {phase === "atPickup" || phase === "atDestination" ? (
              <QrCode className="w-5 h-5 mr-2" />
            ) : phase === "toPickup" || phase === "toDestination" ? (
              <Navigation className="w-5 h-5 mr-2" />
            ) : (
              <CheckCircle2 className="w-5 h-5 mr-2" />
            )}
            {phaseInfo.action}
          </Button>
        </div>
      </motion.div>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            <div className="safe-top p-4 flex items-center justify-between">
              <button
                onClick={() => setShowScanner(false)}
                className="text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <span className="text-white font-medium">Escanear QR</span>
              <div className="w-6" />
            </div>

            <div className="flex-1 flex items-center justify-center p-8">
              <div className="relative w-64 h-64">
                {/* Scanner frame */}
                <div className="absolute inset-0 border-2 border-[#2A9D8F] rounded-2xl" />
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#2A9D8F] rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#2A9D8F] rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#2A9D8F] rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#2A9D8F] rounded-br-2xl" />
                
                {/* Scanning line */}
                <motion.div
                  animate={{ y: [0, 240, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute left-2 right-2 h-0.5 bg-[#2A9D8F]"
                />
              </div>
            </div>

            <div className="p-6 safe-bottom">
              <p className="text-white/70 text-center mb-4">
                Apunta la cámara al código QR del cliente
              </p>
              <Button
                onClick={handleQRScanned}
                className="w-full bg-[#2A9D8F]"
              >
                Simular escaneo exitoso
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            <div className="safe-top p-4 flex items-center justify-between">
              <button
                onClick={() => setShowCamera(false)}
                className="text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <span className="text-white font-medium">Evidencia de entrega</span>
              <div className="w-6" />
            </div>

            <div className="flex-1 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <Camera className="w-16 h-16 text-white/50 mx-auto mb-4" />
                <p className="text-white/70">Vista previa de cámara</p>
              </div>
            </div>

            <div className="p-6 safe-bottom">
              <p className="text-white/70 text-center mb-4">
                Toma una foto del paquete entregado
              </p>
              <Button
                onClick={handlePhotoTaken}
                className="w-full bg-[#2A9D8F]"
              >
                <Camera className="w-5 h-5 mr-2" />
                Tomar foto
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
