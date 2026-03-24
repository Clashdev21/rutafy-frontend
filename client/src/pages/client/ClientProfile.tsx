import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileNav from "@/components/MobileNav";
import { toast } from "sonner";

const menuItems = [
  {
    icon: User,
    label: "Datos personales",
    description: "Edita tu información",
  },
  {
    icon: CreditCard,
    label: "Métodos de pago",
    description: "Gestiona tus tarjetas",
  },
  {
    icon: Bell,
    label: "Notificaciones",
    description: "Configura alertas",
  },
  {
    icon: Shield,
    label: "Seguridad",
    description: "Contraseña y privacidad",
  },
  {
    icon: HelpCircle,
    label: "Ayuda",
    description: "Centro de soporte",
  },
];

const user = {
  name: "María García",
  email: "maria.garcia@email.com",
  phone: "+57 300 123 4567",
  photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
  memberSince: "Enero 2024",
  totalTrips: 47,
};

export default function ClientProfile() {
  const [, setLocation] = useLocation();

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
            <img
              src={user.photo}
              alt={user.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-[#2A9D8F]"
            />
            <div className="flex-1">
              <h2 className="font-bold text-xl text-[#1E3A5F]">{user.name}</h2>
              <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Phone className="w-4 h-4" />
                <span>{user.phone}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-around mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#2A9D8F]">
                {user.totalTrips}
              </p>
              <p className="text-xs text-gray-500">Servicios</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-[#1E3A5F]">4.9</p>
              <p className="text-xs text-gray-500">Calificación</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                {user.memberSince}
              </p>
              <p className="text-xs text-gray-500">Miembro desde</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-auto pb-24 px-4 pt-6">
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
          Rutafy v1.0.0 • Demo
        </p>
      </div>

      {/* Bottom Navigation */}
      <MobileNav type="client" />
    </div>
  );
}
