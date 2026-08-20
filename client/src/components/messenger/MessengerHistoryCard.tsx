import type { BackendService } from "@/hooks/useMessengerOperationalState";
import { MessengerRouteVisual } from "@/components/messenger/MessengerRouteVisual";
import {
  formatRelativeTimeEs,
  getCompletedHistoryLabel,
  getMessengerDestination,
  getMessengerOrigin,
  resolveServiceContainerRef,
} from "@/lib/messengerUx";
import { cn } from "@/lib/utils";

type Props = {
  service: BackendService;
  onClick?: () => void;
  className?: string;
};

function getServiceCode(service: BackendService): string {
  const container = resolveServiceContainerRef(service);
  if (container) return container;
  const raw = String(service.service_id || "")
    .replace(/-/g, "")
    .slice(0, 11)
    .toUpperCase();
  return raw ? `RTF-${raw.slice(0, 6)}` : "Servicio";
}

export function MessengerHistoryCard({ service, onClick, className }: Props) {
  const origin = getMessengerOrigin(service);
  const destination = getMessengerDestination(service);
  const when = formatRelativeTimeEs(service.updated_at ?? service.created_at);
  const statusLabel = getCompletedHistoryLabel(service.status);
  const isSuccess = service.status === "CLOSED";

  const inner = (
    <>
      <p className="font-mono text-sm font-semibold text-[#1E3A5F] tracking-tight">
        {getServiceCode(service)}
      </p>
      <MessengerRouteVisual
        origin={origin.split(/[·,]/)[0]?.trim() || origin}
        destination={destination.split(/[·,]/)[0]?.trim() || destination}
        size="sm"
        className="mt-3"
      />
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500">{when}</span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            isSuccess ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600",
          )}
        >
          {statusLabel}
        </span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:shadow-md active:scale-[0.99]",
          className,
        )}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-gray-100 bg-white p-4 shadow-sm", className)}>
      {inner}
    </div>
  );
}
