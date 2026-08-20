import { Button } from "@/components/ui/button";
import type { BackendService } from "@/hooks/useMessengerOperationalState";
import { MessengerRouteVisual } from "@/components/messenger/MessengerRouteVisual";
import {
  formatMessengerFare,
  getMessengerDestination,
  getMessengerOrigin,
  getShortRouteLabel,
  resolveMessengerEtaMinutes,
  resolveMessengerRouteDistance,
} from "@/lib/messengerUx";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  offer: BackendService;
  messengerLat: number | null;
  messengerLng: number | null;
  locationFresh: boolean;
  onAccept: () => Promise<void> | void;
  isAccepting: boolean;
  onOmit?: () => void;
  className?: string;
};

export function MessengerOfferScreen({
  offer,
  messengerLat,
  messengerLng,
  locationFresh,
  onAccept,
  isAccepting,
  onOmit,
  className,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const origin = getShortRouteLabel(offer, "origin");
  const destination = getShortRouteLabel(offer, "destination");
  const distance = resolveMessengerRouteDistance(
    offer,
    messengerLat,
    messengerLng,
    locationFresh,
  );
  const eta = resolveMessengerEtaMinutes(offer);
  const fare = formatMessengerFare(offer);

  const expiresAtRaw = offer.expires_at;
  const expiresAtMs =
    expiresAtRaw != null && String(expiresAtRaw).trim() !== ""
      ? Date.parse(String(expiresAtRaw))
      : NaN;
  const hasValidExpiry = Number.isFinite(expiresAtMs);
  const remainingMs = hasValidExpiry ? Math.max(0, expiresAtMs - now) : 0;

  const offerTimerKey = `${offer.service_id}\0${offer.expires_at ?? ""}`;
  const totalMsRef = useRef<number | null>(null);
  const offerTimerKeyRef = useRef("");
  if (offerTimerKeyRef.current !== offerTimerKey) {
    offerTimerKeyRef.current = offerTimerKey;
    totalMsRef.current = null;
  }
  if (totalMsRef.current === null && hasValidExpiry) {
    const createdRaw = offer.created_at;
    const createdAtMs =
      createdRaw != null && String(createdRaw).trim() !== ""
        ? Date.parse(String(createdRaw))
        : NaN;
    totalMsRef.current =
      Number.isFinite(createdAtMs) && createdAtMs < expiresAtMs
        ? Math.max(1, expiresAtMs - createdAtMs)
        : Math.max(1, expiresAtMs - Date.now());
  }
  const totalMs = totalMsRef.current ?? 1;
  const progress = hasValidExpiry ? Math.min(100, Math.max(0, (remainingMs / totalMs) * 100)) : 100;

  if (hasValidExpiry && remainingMs <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -24, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-[#0f2744]",
        className,
      )}
    >
      {hasValidExpiry ? (
        <div className="px-6 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
            <motion.div
              className="h-full rounded-full bg-[#2A9D8F]"
              style={{ width: `${progress}%` }}
              layout
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-36">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60 mb-8">
          Recoger
        </p>

        <MessengerRouteVisual
          origin={origin}
          destination={destination}
          size="lg"
          className="text-white [&_p]:text-white [&_span]:text-white/50"
        />

        <div className="mt-10 flex items-center gap-8 text-white">
          {distance ? (
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums">{distance}</p>
            </div>
          ) : null}
          {distance && eta ? <span className="text-white/30 text-2xl">·</span> : null}
          {eta ? (
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums">{eta}</p>
            </div>
          ) : null}
        </div>

        {fare ? (
          <p className="mt-8 text-4xl font-bold text-[#2A9D8F] tabular-nums">{fare}</p>
        ) : null}

        <p className="sr-only">
          {getMessengerOrigin(offer)} hacia {getMessengerDestination(offer)}
        </p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-3">
        <Button
          type="button"
          disabled={isAccepting}
          onClick={() => void onAccept()}
          className="h-14 w-full rounded-2xl bg-[#2A9D8F] text-lg font-semibold text-white hover:bg-[#238b7e] disabled:opacity-70"
        >
          {isAccepting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
              Aceptando...
            </>
          ) : (
            "Aceptar"
          )}
        </Button>
        <button
          type="button"
          disabled={isAccepting}
          onClick={() => onOmit?.()}
          className="w-full py-2 text-sm font-medium text-white/60 disabled:opacity-50"
        >
          Omitir
        </button>
      </div>
    </motion.div>
  );
}
