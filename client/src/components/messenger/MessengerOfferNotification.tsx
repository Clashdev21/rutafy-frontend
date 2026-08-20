import { MessengerRouteVisual } from "@/components/messenger/MessengerRouteVisual";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  origin: string;
  destination: string;
  className?: string;
};

/** Banner compacto para oferta entrante (notificación visual limpia). */
export function MessengerOfferNotification({ origin, destination, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border border-[#2A9D8F]/20 bg-white p-4 shadow-lg shadow-[#1E3A5F]/8",
        className,
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2A9D8F]/12 text-lg">
          <Package className="h-5 w-5 text-[#2A9D8F]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0F172A]">Nuevo servicio</p>
          <MessengerRouteVisual
            origin={origin}
            destination={destination}
            size="sm"
            className="mt-2"
          />
        </div>
      </div>
    </motion.div>
  );
}
