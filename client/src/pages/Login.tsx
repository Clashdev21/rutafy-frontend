import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import rutafyLogo from "@/assets/rutafy-logo.png";
import { http } from "@/api/http";
import { clearSession, setRefreshToken, setToken } from "@/authStorage";
import { normalizeAuthUser } from "@/authUser";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";

export default function Login() {
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        refresh_token?: string;
        refreshToken?: string;
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
      const refresh = data?.refresh_token ?? data?.refreshToken;
      if (typeof refresh === "string" && refresh.trim()) {
        setRefreshToken(refresh);
      }

      const meRes = await http.get("/v1/auth/me");
      const normalized = normalizeAuthUser(meRes.data);

      if (!normalized) {
        clearSession();
        toast.error("No se pudo obtener el perfil del usuario");
        return;
      }

      toast.success("Inicio de sesión exitoso");

      if (normalized.appRole === "ADMIN") {
        setLocation("/admin/login", { replace: true });
      } else if (normalized.appRole === "MENSAJERO") {
        setLocation("/mensajero", { replace: true });
      } else {
        setLocation("/transportista", { replace: true });
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
    <div className="mobile-shell bg-[#102033] safe-top safe-bottom">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <motion.button
          type="button"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          onClick={() => setLocation("/")}
          className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:text-white active:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
          <span>Volver</span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8 mt-10"
        >
          <img
            src={rutafyLogo}
            alt="Rutafy"
            className="mx-auto h-16 w-auto object-contain drop-shadow-md"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="w-full max-w-sm"
        >
          <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-lg">
            <h1 className="text-center text-2xl font-semibold leading-tight text-[#0F172A]">Entrar</h1>
            <p className="mt-1 text-center text-sm leading-relaxed text-[#64748B]">
              Usa tu teléfono y contraseña
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[#0F172A]">
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="Ej: 3001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isPending}
                  autoComplete="tel"
                  className="rounded-xl border-[#E2E8F0] bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#0F172A]">
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    autoComplete="current-password"
                    className="rounded-xl border-[#E2E8F0] bg-white pr-12"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isPending}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-[#2A9D8F] font-semibold text-white shadow-sm hover:bg-[#1F6F66] disabled:opacity-70"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Entrando…
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="mt-6 text-center text-sm text-[#94A3B8]"
        >
          ¿No tienes cuenta?{" "}
          <button
            type="button"
            onClick={() => setLocation("/register-transportista")}
            className="font-medium text-[#2A9D8F] underline-offset-4 transition hover:text-[#1F6F66] hover:underline"
          >
            Crear cuenta
          </button>
        </motion.p>
      </div>
    </div>
  );
}
