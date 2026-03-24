import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Navigation,
  Package,
  Car,
  ChevronLeft,
  Search,
  Clock,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileNav from "@/components/MobileNav";
import { MapView } from "@/components/Map";
import { toast } from "sonner";

type ServiceType = "messaging" | "transport" | null;
type Step = "home" | "selectDestination" | "selectService" | "confirm" | "searching";

export default function ClientHome() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("home");
  const [origin, setOrigin] = useState("Mi ubicación actual");
  const [destination, setDestination] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>(null);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);

  const handleDestinationSelect = () => {
    if (!destination.trim()) {
      toast.error("Ingresa un destino");
      return;
    }
    // Simulate price calculation
    const price = Math.floor(Math.random() * 15000) + 5000;
    const time = Math.floor(Math.random() * 20) + 10;
    setEstimatedPrice(price);
    setEstimatedTime(time);
    setStep("selectService");
  };

  const handleServiceSelect = (type: ServiceType) => {
    setServiceType(type);
    setStep("confirm");
  };

  const handleConfirm = () => {
    setStep("searching");
    // Simulate finding a driver
    setTimeout(() => {
      toast.success("¡Conductor asignado!");
      setLocation("/client/tracking");
    }, 3000);
  };

  const handleBack = () => {
    if (step === "selectDestination") setStep("home");
    else if (step === "selectService") setStep("selectDestination");
    else if (step === "confirm") setStep("selectService");
    else if (step === "searching") setStep("confirm");
  };

  return (
    <div className="mobile-shell">
      {/* Map Background */}
      <div className="absolute inset-0">
        <MapView
          onMapReady={(map: google.maps.Map) => {
            map.setCenter({ lat: 10.9685, lng: -74.7813 }); // Barranquilla as example port city
            map.setZoom(14);
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 safe-top">
        <div className="flex items-center justify-between p-4">
          {step !== "home" ? (
            <button
              onClick={handleBack}
              className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6 text-[#1E3A5F]" />
            </button>
          ) : (
            <div className="w-10" />
          )}
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
            <span className="font-semibold text-[#36f532]">Rutafy</span>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Bottom Card */}
      <AnimatePresence mode="wait">
        {step === "home" && (
          <motion.div
            key="home"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="map-card bottom-24"
          >
            <button
              onClick={() => setStep("selectDestination")}
              className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-xl"
            >
              <Search className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500">¿A dónde vamos?</span>
            </button>
            <div className="mt-4 flex gap-3">
              <button className="flex-1 flex items-center gap-2 p-3 bg-[#E0F2F1] rounded-xl">
                <Package className="w-5 h-5 text-[#2A9D8F]" />
                <span className="text-sm font-medium text-[#1E3A5F]">Mensajería</span>
              </button>
              <button className="flex-1 flex items-center gap-2 p-3 bg-[#E8ECF1] rounded-xl">
                <Car className="w-5 h-5 text-[#1E3A5F]" />
                <span className="text-sm font-medium text-[#1E3A5F]">Transporte</span>
              </button>
            </div>
          </motion.div>
        )}

        {step === "selectDestination" && (
          <motion.div
            key="destination"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="map-card bottom-24"
          >
            <h3 className="font-semibold text-[#1E3A5F] mb-4">Selecciona tu ruta</h3>
            
            {/* Origin */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full bg-[#2A9D8F]" />
              <Input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Punto de origen"
                className="flex-1"
              />
            </div>
            
            {/* Destination */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-[#E53E3E]" />
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Punto de destino"
                className="flex-1"
                autoFocus
              />
            </div>

            {/* Quick locations */}
            <div className="space-y-2 mb-4">
              {["Puerto Central", "Terminal de Carga", "Centro Comercial"].map((loc) => (
                <button
                  key={loc}
                  onClick={() => setDestination(loc)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-700">{loc}</span>
                </button>
              ))}
            </div>

            <Button
              onClick={handleDestinationSelect}
              className="w-full bg-[#2A9D8F] hover:bg-[#1F7A6F]"
            >
              Continuar
            </Button>
          </motion.div>
        )}

        {step === "selectService" && (
          <motion.div
            key="service"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="map-card bottom-24"
          >
            <h3 className="font-semibold text-[#1E3A5F] mb-4">Tipo de servicio</h3>
            
            <div className="space-y-3">
              <button
                onClick={() => handleServiceSelect("messaging")}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-[#2A9D8F] transition-colors"
              >
                <div className="w-12 h-12 bg-[#E0F2F1] rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-[#2A9D8F]" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-medium text-[#1E3A5F]">Mensajería</h4>
                  <p className="text-sm text-gray-500">Envío de paquetes y documentos</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[#2A9D8F]">
                    ${estimatedPrice.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{estimatedTime} min</p>
                </div>
              </button>

              <button
                onClick={() => handleServiceSelect("transport")}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-[#2A9D8F] transition-colors"
              >
                <div className="w-12 h-12 bg-[#E8ECF1] rounded-xl flex items-center justify-center">
                  <Car className="w-6 h-6 text-[#1E3A5F]" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-medium text-[#1E3A5F]">Transporte</h4>
                  <p className="text-sm text-gray-500">Traslado de personas</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[#2A9D8F]">
                    ${(estimatedPrice * 1.2).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{estimatedTime} min</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {step === "confirm" && (
          <motion.div
            key="confirm"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="map-card bottom-24"
          >
            <h3 className="font-semibold text-[#1E3A5F] mb-4">Confirmar servicio</h3>
            
            {/* Route summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-3 h-3 mt-1.5 rounded-full bg-[#2A9D8F]" />
                <div>
                  <p className="text-xs text-gray-500">Origen</p>
                  <p className="font-medium text-[#1E3A5F]">{origin}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 mt-1.5 rounded-full bg-[#E53E3E]" />
                <div>
                  <p className="text-xs text-gray-500">Destino</p>
                  <p className="font-medium text-[#1E3A5F]">{destination}</p>
                </div>
              </div>
            </div>

            {/* Service details */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {serviceType === "messaging" ? (
                  <Package className="w-5 h-5 text-[#2A9D8F]" />
                ) : (
                  <Car className="w-5 h-5 text-[#1E3A5F]" />
                )}
                <span className="font-medium text-[#1E3A5F]">
                  {serviceType === "messaging" ? "Mensajería" : "Transporte"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{estimatedTime} min</span>
                </div>
                <div className="flex items-center gap-1 text-[#2A9D8F]">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-semibold">
                    {(serviceType === "messaging"
                      ? estimatedPrice
                      : estimatedPrice * 1.2
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleConfirm}
              className="w-full bg-[#2A9D8F] hover:bg-[#1F7A6F]"
            >
              Confirmar servicio
            </Button>
          </motion.div>
        )}

        {step === "searching" && (
          <motion.div
            key="searching"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="map-card bottom-24"
          >
            <div className="text-center py-6">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full bg-[#2A9D8F]/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-[#2A9D8F]/40 animate-ping animation-delay-200" />
                <div className="absolute inset-4 rounded-full bg-[#2A9D8F] flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="font-semibold text-[#1E3A5F] mb-2">
                Buscando conductor
              </h3>
              <p className="text-gray-500 text-sm">
                Conectando con el conductor más cercano...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <MobileNav type="client" />
    </div>
  );
}
