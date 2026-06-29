import { cn } from "@/lib/utils";
import {
  Anchor,
  CircleDot,
  Clock,
  MapPin,
  Package,
  Ship,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type TimelineItem = {
  at?: string | null;
  title: string;
  detail?: string | null;
};

type Props = {
  items: TimelineItem[];
  className?: string;
};

function pickIcon(title: string): LucideIcon {
  const t = title.toLowerCase();
  if (/program/.test(t)) return Clock;
  if (/corredor|entr/.test(t)) return MapPin;
  if (/spia|spb|puerto|port/.test(t)) return Anchor;
  if (/operaci|módulo|modulo|carg/.test(t)) return Package;
  if (/salió|salio|exit/.test(t)) return Ship;
  if (/vijes|yumbo|cisneros|lobo|córdoba|zaragoza|ruta/.test(t)) return Truck;
  if (/cdr|entreg/.test(t)) return CircleDot;
  return MapPin;
}

function formatTime(at?: string | null): string {
  if (!at?.trim()) return "—";
  const ms = Date.parse(at);
  if (!Number.isFinite(ms)) return at;
  return new Date(ms).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function OperationalVisualTimeline({ items, className }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Sin eventos en timeline.</p>;
  }

  return (
    <div className={cn("relative pl-6 space-y-4", className)}>
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#2A9D8F]/30" aria-hidden />
      {items.map((item, index) => {
        const Icon = pickIcon(item.title);
        return (
          <div key={`${item.title}-${index}`} className="relative flex gap-3">
            <div className="absolute -left-6 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 border-[#2A9D8F]/40 shadow-sm">
              <Icon className="h-3 w-3 text-[#2A9D8F]" aria-hidden />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-xs font-mono text-gray-500 tabular-nums">{formatTime(item.at)}</p>
              <p className="text-sm font-semibold text-[#1E3A5F]">{item.title}</p>
              {item.detail ? <p className="text-xs text-gray-500">{item.detail}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
