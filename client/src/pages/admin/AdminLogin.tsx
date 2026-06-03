import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLogin } from "@/api/adminAuth";
import { getAdminAccessToken } from "@/authAdminStorage";
import { Loader2 } from "lucide-react";
import axios from "axios";

const LOGIN_ERROR_MESSAGE =
  "Credenciales inválidas o usuario sin permisos de administrador.";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getAdminAccessToken()) {
      setLocation("/admin/ops/map", { replace: true });
    }
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone.trim() || !password.trim()) {
      setError("Ingresa teléfono y contraseña.");
      return;
    }

    setIsPending(true);
    try {
      await adminLogin(phone, password);
      setLocation("/admin/ops/map", { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const code = (err.response?.data as { error?: string })?.error;
        if (code === "invalid_credentials" || err.response?.status === 401) {
          setError(LOGIN_ERROR_MESSAGE);
          return;
        }
      }
      setError(LOGIN_ERROR_MESSAGE);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1E3A5F] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1E3A5F]">
            <span className="text-2xl font-bold text-[#36f532]">R</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Rutafy Admin</h1>
          <p className="text-sm font-medium text-[#1E3A5F]/80">
            Centro de Control Operacional
          </p>
          <p className="text-xs text-gray-500">
            Acceso exclusivo para administradores.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-phone">Teléfono</Label>
            <Input
              id="admin-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+57..."
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Contraseña</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full bg-[#36f532] font-semibold text-[#1E3A5F] hover:bg-[#2dd429]"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando…
              </>
            ) : (
              "Entrar al Centro de Control"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
