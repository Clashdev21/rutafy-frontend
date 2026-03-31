import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import MensajeroPanel from "@/pages/MensajeroPanel";
import { Loader2 } from "lucide-react";

function isValidUuid(id: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    id.trim()
  );
}

export default function MensajeroRoute() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setLocation("/login");
      return;
    }

    if (user.appRole !== "MENSAJERO") {
      setLocation("/login");
      return;
    }

    const actorId = user.actor_id != null ? String(user.actor_id).trim() : "";
    if (!actorId || !isValidUuid(actorId)) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" aria-hidden />
        <p className="text-sm text-gray-600">Cargando sesión...</p>
      </div>
    );
  }

  if (!user || user.appRole !== "MENSAJERO") {
    return null;
  }

  const actorId = user.actor_id != null ? String(user.actor_id).trim() : "";
  if (!actorId || !isValidUuid(actorId)) {
    return null;
  }

  return <MensajeroPanel />;
}
