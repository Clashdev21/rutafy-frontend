import rutafyLogo from "@/assets/rutafy-logo.png";
import { useLocation } from "wouter";
import { Truck, Package, Shield, ChevronRight, LogIn } from "lucide-react";
import { motion } from "framer-motion";

const roles = [
  {
    id: "transportista",
    title: "Transportista",
    description: "Solicita servicios de mensajería y transporte",
    icon: Truck,
    color: "bg-[#2A9D8F]",
    barClass: "border-l-4 border-l-emerald-500",
    path: "/transportista",
  },
  {
    id: "mensajero",
    title: "Mensajero",
    description: "Acepta y realiza servicios de entrega",
    icon: Package,
    color: "bg-[#1E3A5F]",
    barClass: "border-l-4 border-l-blue-500",
    path: "/mensajero",
  },
  {
    id: "admin",
    title: "Administrador",
    description: "Gestiona mensajeros y servicios",
    icon: Shield,
    color: "bg-gray-700",
    barClass: "border-l-4 border-l-slate-600",
    path: "/admin",
  },
];

export default function RoleSelector() {
  const [, setLocation] = useLocation();

  return (
    <div className="mobile-shell min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1a3352] to-[#152A4A] safe-top safe-bottom">
      {/* Header: solo logo */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-14 flex justify-center"
        >
          <img
            src={rutafyLogo}
            alt="Rutafy"
            className="h-40 w-auto sm:h-48 object-contain object-center animate-rutafy-pulse drop-shadow-[0_0_24px_rgba(255,255,255,0.12)]"
          />
        </motion.div>

        {/* Role Cards */}
        <div className="w-full max-w-sm space-y-4">
          {roles.map((role, index) => (
            <motion.button
              key={role.id}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
              onClick={() => setLocation(role.path)}
              className={`w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-[0_4px_14px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 active:scale-[0.99] active:translate-y-0 transition-all duration-200 ${role.barClass}`}
            >
              <div
                className={`w-16 h-16 rounded-xl ${role.color} flex items-center justify-center shadow-sm shrink-0`}
              >
                <role.icon className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h3 className="font-semibold text-[#1E3A5F] text-lg">
                  {role.title}
                </h3>
                <p className="text-gray-500 text-sm mt-0.5">{role.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" aria-hidden />
            </motion.button>
          ))}
        </div>

        {/* Login Link */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          onClick={() => setLocation("/login")}
          className="mt-8 flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <LogIn className="w-4 h-4" />
          <span className="text-sm">Iniciar sesión con email</span>
        </motion.button>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center pb-8 px-6"
      >
        <p className="text-white/50 text-sm">
          Gestión segura de documentos
        </p>
      </motion.div>
    </div>
  );
}
