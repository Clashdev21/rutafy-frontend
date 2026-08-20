import { Button } from "@/components/ui/button";
import type { OperationalLocationStatus } from "@/hooks/useMessengerOperationalState";
import type { GeolocationPermissionState } from "@/hooks/useMessengerOperationalState";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

type Props = {
  zoneLabel: string;
  locationStatus: OperationalLocationStatus;
  locationPermissionState: GeolocationPermissionState | null;
  onRequestLocationPermission: () => void;
  onToggleOffline: () => void;
  onLogout: () => void;
  className?: string;
};

export function MessengerHomeIdle({
  zoneLabel,
  locationStatus,
  locationPermissionState,
  onRequestLocationPermission,
  onToggleOffline,
  onLogout,
  className,
}: Props) {
  const showGpsRetry =
    locationStatus === "denied" || locationStatus === "unavailable";
  const showPermanentDeniedHint =
    locationStatus === "denied" && locationPermissionState === "denied";

  return (
    <div className={cn("min-h-screen bg-white flex flex-col", className)}>
      <header className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-2">
        <div className="space-y-2">
          <span className="inline-flex rounded-full bg-[#2A9D8F]/12 px-3 py-1 text-xs font-semibold text-[#2A9D8F]">
            Disponible
          </span>
          <p className="flex items-center gap-1.5 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-[#2A9D8F]" aria-hidden />
            {zoneLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onToggleOffline()}
            className="text-xs text-gray-500"
          >
            Offline
          </Button>
          <button
            type="button"
            onClick={() => onLogout()}
            className="text-xs font-medium text-gray-400 hover:text-gray-600"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="mx-5 border-t border-gray-100" aria-hidden />

      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-24 text-center">
        <p className="text-lg font-semibold text-[#0F172A]">Sin ofertas</p>
        <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-[#64748B]">
          Estamos buscando
          <br />
          servicios cerca de ti.
        </p>

        <div className="relative mt-12 flex h-20 w-20 items-center justify-center">
          <span
            className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-[#2A9D8F]/20 motion-reduce:animate-none"
            aria-hidden
          />
          <span
            className="relative h-3 w-3 rounded-full bg-[#2A9D8F]"
            aria-hidden
          />
        </div>

        {showGpsRetry ? (
          <div className="mt-8 space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRequestLocationPermission()}
              className="rounded-full"
            >
              Activar ubicación
            </Button>
            {showPermanentDeniedHint ? (
              <p className="text-xs text-red-600">Habilita ubicación en ajustes del dispositivo</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
