import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { http } from "@/api/http";
import { clearSession, setRefreshToken, setToken } from "@/authStorage";
import { normalizeAuthUser } from "@/authUser";
import { toast } from "sonner";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";

type RegisterTransportistaResponse = {
  access_token?: string;
  accessToken?: string;
  refresh_token?: string;
  refreshToken?: string;
  user?: unknown;
};

export default function RegisterTransportista() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [email, setEmail] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleReference, setVehicleReference] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Ingresa tu nombre");
      return;
    }
    if (!phone.trim()) {
      toast.error("Ingresa tu teléfono");
      return;
    }
    if (!password.trim()) {
      toast.error("Ingresa una contraseña");
      return;
    }
    if (!companyName.trim()) {
      toast.error("Ingresa el nombre de la empresa");
      return;
    }
    if (!docNumber.trim()) {
      toast.error("Ingresa el número de documento");
      return;
    }

    setIsPending(true);
    try {
      clearSession();

      const body: Record<string, string> = {
        name: name.trim(),
        phone: phone.trim(),
        password,
        company_name: companyName.trim(),
        doc_number: docNumber.trim(),
      };
      const emailTrim = email.trim();
      if (emailTrim) {
        body.email = emailTrim;
      }
      const plateTrim = plate.trim();
      if (plateTrim) {
        body.plate = plateTrim;
      }
      const vehicleTypeTrim = vehicleType.trim();
      if (vehicleTypeTrim) {
        body.vehicle_type = vehicleTypeTrim;
      }
      const vehicleReferenceTrim = vehicleReference.trim();
      if (vehicleReferenceTrim) {
        body.vehicle_reference = vehicleReferenceTrim;
      }

      const { data } = await http.post<RegisterTransportistaResponse>(
        "/v1/auth/register-transportista",
        body,
      );

      const token = data?.access_token ?? data?.accessToken;
      if (!token || typeof token !== "string") {
        toast.error("Respuesta de registro sin access_token");
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

      toast.success("Cuenta creada correctamente");

      if (normalized.appRole === "ADMIN") {
        setLocation("/admin");
      } else if (normalized.appRole === "MENSAJERO") {
        setLocation("/mensajero");
      } else {
        setLocation("/transportista");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error(
          "Este teléfono ya está registrado. Inicia sesión o usa otro número.",
        );
        return;
      }

      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string; error?: string })?.message ??
          (err.response?.data as { error?: string })?.error ??
          err.message
        : err instanceof Error
          ? err.message
          : "Error al registrarse";
      toast.error(msg || "Error al registrarse");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="mobile-shell bg-gradient-to-b from-[#1E3A5F] to-[#152A4A] safe-top safe-bottom min-h-screen overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setLocation("/login")}
          className="absolute top-6 left-6 text-white/70 hover:text-white flex items-center gap-2"
          type="button"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver al inicio de sesión</span>
        </motion.button>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
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

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-[#1E3A5F]">Crear cuenta operativa</CardTitle>
              <CardDescription>
                Cuenta de empresa + vehículo con el que solicitarás mensajería
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Tu nombre (operador)</Label>
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="Nombre del operador"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isPending}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-phone">Teléfono</Label>
                  <Input
                    id="reg-phone"
                    type="tel"
                    placeholder="Ej: 3001234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isPending}
                    autoComplete="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Contraseña</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-company">Nombre de empresa</Label>
                  <Input
                    id="reg-company"
                    type="text"
                    placeholder="Razón social o nombre comercial"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={isPending}
                    autoComplete="organization"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-doc">Número de documento</Label>
                  <Input
                    id="reg-doc"
                    type="text"
                    placeholder="NIT / CC / documento"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Correo (opcional)</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <p className="text-xs font-semibold text-[#1E3A5F]">Vehículo</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-plate">Placa</Label>
                  <Input
                    id="reg-plate"
                    type="text"
                    placeholder="Ej: ABC123"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    disabled={isPending}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-vehicle-type">Tipo de vehículo</Label>
                  <Input
                    id="reg-vehicle-type"
                    type="text"
                    placeholder="Ej: Moto, camión, van"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-vehicle-ref">Referencia del vehículo (opcional)</Label>
                  <Input
                    id="reg-vehicle-ref"
                    type="text"
                    placeholder="Color, marca, alias interno"
                    value={vehicleReference}
                    onChange={(e) => setVehicleReference(e.target.value)}
                    disabled={isPending}
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
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Registrarse
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-white/50 text-sm text-center"
        >
          ¿Ya tienes cuenta?{" "}
          <button
            type="button"
            onClick={() => setLocation("/login")}
            className="text-[#36f532] hover:underline font-medium"
          >
            Iniciar sesión
          </button>
        </motion.p>
      </div>
    </div>
  );
}
