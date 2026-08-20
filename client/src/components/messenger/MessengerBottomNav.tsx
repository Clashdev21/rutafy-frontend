import { cn } from "@/lib/utils";
import { History, Home } from "lucide-react";

export type MessengerTab = "home" | "history";

type Props = {
  active: MessengerTab;
  onChange: (tab: MessengerTab) => void;
  className?: string;
};

export function MessengerBottomNav({ active, onChange, className }: Props) {
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 bg-white/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        className,
      )}
      aria-label="Navegación mensajero"
    >
      <div className="mx-auto flex max-w-md">
        <button
          type="button"
          onClick={() => onChange("home")}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
            active === "home" ? "text-[#2A9D8F]" : "text-gray-400",
          )}
        >
          <Home className="h-5 w-5" aria-hidden />
          Inicio
        </button>
        <button
          type="button"
          onClick={() => onChange("history")}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
            active === "history" ? "text-[#2A9D8F]" : "text-gray-400",
          )}
        >
          <History className="h-5 w-5" aria-hidden />
          Historial
        </button>
      </div>
    </nav>
  );
}
