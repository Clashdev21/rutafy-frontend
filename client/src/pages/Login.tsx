import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { http } from "@/api/http";
import { clearToken, setToken } from "@/authStorage";
import { normalizeAuthUser } from "@/authUser";
import { toast } from "sonner";
import { ArrowLeft, LogIn, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";

export default function Login() {
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password.trim()) {
      toast.error("Por favor ingresa teléfono y contraseña");
      return;
    }

    setIsPending(true);
    try {
      const { data } = await http.post<{
        access_token?: string;
        accessToken?: string;
      }>("/v1/auth/login", {
        phone: phone.trim(),
        password,
      });

      const token = data?.access_token ?? data?.accessToken;
      if (!token || typeof token !== "string") {
        toast.error("Respuesta de login sin access_token");
        return;
      }

      setToken(token);

      const meRes = await http.get("/v1/auth/me");
      const normalized = normalizeAuthUser(meRes.data);

      if (!normalized) {
        clearToken();
        toast.error("No se pudo obtener el perfil del usuario");
        return;
      }

      toast.success("Inicio de sesión exitoso");

      if (normalized.appRole === "ADMIN") {
        setLocation("/admin");
      } else if (normalized.appRole === "MENSAJERO") {
        setLocation("/mensajero");
      } else {
        setLocation("/transportista");
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string; error?: string })?.message ??
          (err.response?.data as { error?: string })?.error ??
          err.message
        : err instanceof Error
          ? err.message
          : "Error al iniciar sesión";
      toast.error(msg || "Error al iniciar sesión");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="mobile-shell bg-gradient-to-b from-[#1E3A5F] to-[#152A4A] safe-top safe-bottom">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setLocation("/")}
          className="absolute top-6 left-6 text-white/70 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver</span>
        </motion.button>

        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-2xl">
            <svg viewBox="0 0 100 100" className="w-12 h-12">
              <path
                d="M30 35 L50 25 L70 35 L70 50 L50 60 L30 50 Z"
                fill="none"
                stroke="#36f532"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path
                d="M30 50 L30 65 L50 75 L70 65 L70 50"
                fill="none"
                stroke="#36f532"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <circle cx="50" cy="45" r="8" fill="#36f532" />
            </svg>
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-[#1E3A5F]">Iniciar Sesión</CardTitle>
              <CardDescription>
                Ingresa con tu teléfono y contraseña
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Ej: 3001234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isPending}
                    autoComplete="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#36f532] hover:bg-[#2dd429] text-[#1E3A5F] font-semibold"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Iniciar Sesión
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Help Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-white/50 text-sm text-center"
        >
          ¿No tienes cuenta?{" "}
          <button
            type="button"
            onClick={() => setLocation("/register-transportista")}
            className="text-[#36f532] hover:underline font-medium"
          >
            Crear cuenta
          </button>
        </motion.p>
      </div>
    </div>
  );
}
