import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessengerRouteMap } from "@/components/MessengerRouteMap";
import { MessengerJourneyBar } from "@/components/messenger/MessengerJourneyBar";
import type { BackendService } from "@/hooks/useMessengerOperationalState";
import type { ServiceEvidence } from "@/hooks/useMessengerOperationalState";
import {
  getShortRouteLabel,
  resolveMessengerEtaMinutes,
  resolveMessengerJourneyNodes,
  resolveMessengerJourneyPercent,
} from "@/lib/messengerUx";
import { parseServiceRouteCoords } from "@/lib/formatOperationalLocation";
import { openMapsUrl } from "@/lib/openMapsUrl";
import type { OperationalGeofenceState } from "@/lib/resolveOperationalCopy";
import { resolveOperationalCopy } from "@/lib/resolveOperationalCopy";
import {
  formatOperationalDistance,
  haversineDistanceMeters,
} from "@/lib/resolveOperationalDistance";
import { resolveOperationalProximity } from "@/lib/resolveOperationalProximity";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Camera, Loader2, Navigation } from "lucide-react";
import { useMemo } from "react";

type MessengerMapPosition = { lat: number; lng: number };

type Props = {
  service: BackendService;
  mode: "assigned" | "in_service";
  messengerPosition: MessengerMapPosition | null;
  currentLat: number | null;
  currentLng: number | null;
  locationFresh: boolean;
  geofenceState?: OperationalGeofenceState | null;
  onStart?: () => Promise<void> | void;
  isStarting?: boolean;
  onOpenCapture?: () => void;
  onCloseService?: () => void | Promise<void>;
  closingServiceId?: string | null;
  closePin?: string;
  setClosePin?: (v: string) => void;
  validationError?: string;
  evidences?: ServiceEvidence[];
  className?: string;
};

export function MessengerActiveServiceScreen({
  service,
  mode,
  messengerPosition,
  currentLat,
  currentLng,
  locationFresh,
  geofenceState,
  onStart,
  isStarting,
  onOpenCapture,
  onCloseService,
  closingServiceId,
  closePin = "",
  setClosePin,
  validationError,
  className,
}: Props) {
  const ext = service as BackendService & {
    estimated_route_duration_minutes?: number | string | null;
  };

  const copy = resolveOperationalCopy({
    serviceStatus: service.status,
    geofenceState,
    estimatedRouteDurationMinutes: ext.estimated_route_duration_minutes,
    audience: "mensajero",
  });

  const proximity = useMemo(
    () =>
      resolveOperationalProximity({
        serviceStatus: service.status,
        geofenceState,
        messengerLat: currentLat,
        messengerLng: currentLng,
        originLat: parseServiceRouteCoords(service, "origin")?.lat,
        originLng: parseServiceRouteCoords(service, "origin")?.lng,
        destinationLat: parseServiceRouteCoords(service, "destination")?.lat,
        destinationLng: parseServiceRouteCoords(service, "destination")?.lng,
        locationUpdatedAt: locationFresh ? new Date().toISOString() : null,
      }),
    [service, geofenceState, currentLat, currentLng, locationFresh],
  );

  const progressPct = proximity
    ? Math.round(proximity.progress * 100)
    : resolveMessengerJourneyPercent(
        service,
        geofenceState,
        currentLat,
        currentLng,
        locationFresh,
      );

  const journeyNodes = resolveMessengerJourneyNodes(service, geofenceState, service.status);
  const journeyPercent = resolveMessengerJourneyPercent(
    service,
    geofenceState,
    currentLat,
    currentLng,
    locationFresh,
  );

  const eta = resolveMessengerEtaMinutes(service);
  const destination = getShortRouteLabel(service, "destination");

  const distanceToTarget = useMemo(() => {
    if (!locationFresh || currentLat == null || currentLng == null) return null;
    const isClaimed = service.status === "CLAIMED";
    const target = parseServiceRouteCoords(service, isClaimed ? "origin" : "destination");
    if (!target) return null;
    const meters = haversineDistanceMeters(currentLat, currentLng, target.lat, target.lng);
    const km = Math.round(meters / 1000);
    if (km >= 1) return `${km} km`;
    return formatOperationalDistance(meters).replace(/^~/, "");
  }, [service, currentLat, currentLng, locationFresh]);

  const navCoords = useMemo(() => {
    const isClaimed = service.status === "CLAIMED";
    return parseServiceRouteCoords(service, isClaimed ? "origin" : "destination");
  }, [service]);

  const isClosing = closingServiceId === service.service_id;
  const isPinValid = closePin.trim().length === 4;

  const statusEmoji = geofenceState === "AT_PICKUP" ? "📍" : geofenceState === "AT_DROPOFF" ? "✅" : "📍";
  const statusLabel =
    geofenceState === "AT_PICKUP"
      ? "En recogida"
      : geofenceState === "AT_DROPOFF"
        ? "En destino"
        : service.status === "CLAIMED"
          ? "Hacia recogida"
          : "En tránsito";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn("fixed inset-0 z-40 flex flex-col bg-gray-100", className)}
    >
      <div className="shrink-0 bg-white px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-sm">
        <MessengerJourneyBar nodes={journeyNodes} percent={journeyPercent} />
      </div>

      <div className="relative flex-1 min-h-0">
        <MessengerRouteMap
          service={service}
          messengerPosition={messengerPosition}
          className="absolute inset-0 h-full w-full"
          mapClassName="h-full min-h-[12rem] rounded-none border-0"
          hideLegend
        />

        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-[70%] pointer-events-none">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="rounded-2xl bg-[#1E3A5F]/90 px-5 py-3 text-center shadow-xl backdrop-blur-sm"
          >
            <p className="text-3xl font-bold tabular-nums text-white">{progressPct}%</p>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="shrink-0 rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" aria-hidden />

        <p className="text-sm font-medium text-gray-500">
          {statusEmoji} {statusLabel}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Destino</p>
            <p className="mt-0.5 text-lg font-semibold text-[#0F172A]">{destination}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-400">ETA</p>
            <p className="mt-0.5 text-lg font-semibold text-[#0F172A] tabular-nums">
              {eta ?? copy.etaLabel?.replace(/.*~/, "") ?? "—"}
            </p>
          </div>
        </div>

        {distanceToTarget ? (
          <p className="mt-2 text-sm text-gray-500">
            Distancia{" "}
            <span className="font-semibold text-gray-800 tabular-nums">{distanceToTarget}</span>
          </p>
        ) : null}

        {mode === "assigned" ? (
          <Button
            type="button"
            disabled={isStarting}
            onClick={() => void onStart?.()}
            className="mt-6 h-14 w-full rounded-2xl bg-[#2A9D8F] text-base font-semibold hover:bg-[#238b7e]"
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Iniciando...
              </>
            ) : (
              "Iniciar servicio"
            )}
          </Button>
        ) : (
          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={!navCoords}
              onClick={() => {
                if (navCoords) openMapsUrl(navCoords.lat, navCoords.lng, "google");
              }}
              className="h-14 flex-1 rounded-2xl text-base font-semibold"
            >
              <Navigation className="mr-2 h-4 w-4" aria-hidden />
              Navegar
            </Button>
            <Button
              type="button"
              onClick={() => onOpenCapture?.()}
              className="h-14 flex-1 rounded-2xl bg-[#1E3A5F] text-base font-semibold hover:bg-[#152A4A]"
            >
              <Camera className="mr-2 h-4 w-4" aria-hidden />
              Captura
            </Button>
          </div>
        )}

        {mode === "in_service" && setClosePin && onCloseService ? (
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            <Label htmlFor="messenger-close-pin" className="text-xs text-gray-500">
              PIN de cierre
            </Label>
            <div className="flex gap-2">
              <Input
                id="messenger-close-pin"
                type="password"
                placeholder="••••"
                value={closePin}
                onChange={(e) => setClosePin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="font-mono text-lg tracking-wider"
                maxLength={4}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              <Button
                type="button"
                disabled={isClosing || !isPinValid}
                onClick={() => void onCloseService()}
                className="shrink-0 bg-[#2A9D8F] hover:bg-[#238b7e]"
              >
                {isClosing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cerrar"}
              </Button>
            </div>
            {validationError ? (
              <p className="text-xs text-red-600" role="alert">
                {validationError}
              </p>
            ) : null}
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
