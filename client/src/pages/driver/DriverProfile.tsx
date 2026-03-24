import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  User,
  Car,
  FileText,
  Wallet,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Star,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import MobileNav from "@/components/MobileNav";
import { toast } from "sonner";

const menuItems = [
  {
    icon: User,
    label: "Datos personales",
    description: "Edita tu información",
  },
  {
    icon: Car,
    label: "Mi vehículo",
    description: "Información del vehículo",
  },
  {
    icon: FileText,
    label: "Documentos",
    description: "Licencia, SOAT, etc.",
  },
  {
    icon: Wallet,
    label: "Mis ganancias",
    description: "Historial de pagos",
  },
  {
    icon: Bell,
    label: "Notificaciones",
    description: "Configura alertas",
  },
  {
    icon: HelpCircle,
    label: "Ayuda",
    description: "Centro de soporte",
  },
];

const driver = {
  name: "Carlos Rodríguez",
  email: "carlos.rodriguez@email.com",
  phone: "+57 310 987 6543",
  photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  rating: 4.8,
  totalTrips: 342,
  memberSince: "Marzo 2024",
  vehicle: "Honda CB 150",
  plate: "ABC-123",
  isVerified: true,
};

export default function DriverProfile() {
  const [, setLocation] = useLocation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    toast.success("Sesión cerrada");
    setLocation("/");
  };

  return (
    <div className="mobile-shell bg-background">
      {/* Header */}
      <div className="safe-top bg-[#1E3A5F]">
        <div className="p-4 pb-16">
          <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-4 -mt-12">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={driver.photo}
                alt={driver.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-[#2A9D8F]"
              />
              {driver.isVerified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#2A9D8F] rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xl text-[#1E3A5F]">
                  {driver.name}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span>{driver.rating}</span>
                <span>•</span>
                <span>{driver.totalTrips} viajes</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Car className="w-4 h-4" />
                <span>
                  {driver.vehicle} • {driver.plate}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-around mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#2A9D8F]">
                {driver.totalTrips}
              </p>
              <p className="text-xs text-gray-500">Viajes</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-[#1E3A5F]">{driver.rating}</p>
              <p className="text-xs text-gray-500">Calificación</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                {driver.memberSince}
              </p>
              <p className="text-xs text-gray-500">Miembro desde</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Settings */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-[#2A9D8F]" />
              <span className="font-medium text-[#1E3A5F]">
                Notificaciones de solicitudes
              </span>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-auto pb-24 px-4 pt-4">
        <div className="space-y-2">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toast.info("Función próximamente")}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm active:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[#E0F2F1] flex items-center justify-center">
                <item.icon className="w-5 h-5 text-[#2A9D8F]" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-[#1E3A5F]">{item.label}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>
          ))}
        </div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <Button
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </motion.div>

        {/* App Version */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Rutafy Conductor v1.0.0 • Demo
        </p>
      </div>

      {/* Bottom Navigation */}
      <MobileNav type="driver" />
    </div>
  );
}
