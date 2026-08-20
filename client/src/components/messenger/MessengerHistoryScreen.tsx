import type { BackendService } from "@/hooks/useMessengerOperationalState";
import { MessengerHistoryCard } from "@/components/messenger/MessengerHistoryCard";
import { cn } from "@/lib/utils";
import { ArrowLeft, History } from "lucide-react";

type Props = {
  completedServices: BackendService[];
  terminalServices: BackendService[];
  onBack: () => void;
  className?: string;
};

export function MessengerHistoryScreen({
  completedServices,
  terminalServices,
  onBack,
  className,
}: Props) {
  const all = [...completedServices, ...terminalServices].sort((a, b) => {
    const ta = Date.parse(a.updated_at ?? a.created_at ?? "");
    const tb = Date.parse(b.updated_at ?? b.created_at ?? "");
    return tb - ta;
  });

  return (
    <div className={cn("min-h-screen bg-gray-50 flex flex-col", className)}>
      <header className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-2 hover:bg-gray-100"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-[#1E3A5F]" aria-hidden />
          <h1 className="text-lg font-semibold text-[#0F172A]">Historial</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {all.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500">Aún no hay servicios en tu historial.</p>
        ) : (
          all.map((service) => <MessengerHistoryCard key={service.service_id} service={service} />)
        )}
      </div>
    </div>
  );
}
