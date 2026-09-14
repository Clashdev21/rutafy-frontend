import { Badge } from "@/components/ui/badge";
import {
  etaSourceBadgeLabel,
  etaSourceExpiredBadgeLabel,
  type EtaSourceKind,
} from "@/lib/operationalTwinContract";
import { cn } from "@/lib/utils";

type Props = {
  /** Current ETA clock, or historical reference time when expired. */
  time: string;
  corridorName?: string | null;
  source?: EtaSourceKind | null;
  expired?: boolean;
  size?: "sm" | "lg";
  className?: string;
};

export function OperationalEtaHero({
  time,
  corridorName,
  source = null,
  expired,
  size = "sm",
  className,
}: Props) {
  const large = size === "lg";
  const hasHistorical =
    Boolean(time?.trim()) &&
    time !== "—" &&
    time !== "ETA vencido" &&
    time !== "Sin ETA" &&
    time !== "Sin estimación vigente";

  if (expired) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <p className="uppercase tracking-wider text-gray-400 font-semibold text-xs">ETA</p>
        <p
          className={cn(
            "font-bold leading-snug text-orange-700",
            large ? "text-xl" : "text-lg",
          )}
        >
          Sin estimación vigente
        </p>
        {hasHistorical ? (
          <p className={cn("text-gray-600", large ? "text-sm" : "text-sm")}>
            Última referencia:{" "}
            <span className="font-semibold tabular-nums text-[#1E3A5F]">{time}</span>
          </p>
        ) : null}
        {corridorName ? (
          <p className={cn("text-gray-500", large ? "text-sm" : "text-sm")}>{corridorName}</p>
        ) : null}
        <Badge
          variant="outline"
          className="text-xs font-medium border-orange-300 text-orange-700 bg-orange-50"
        >
          {etaSourceExpiredBadgeLabel(source)}
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <p className="uppercase tracking-wider text-gray-400 font-semibold text-xs">ETA</p>
      <p
        className={cn(
          "font-bold tabular-nums leading-none transition-colors duration-500",
          large ? "text-4xl" : "text-xl",
          "text-[#1E3A5F]",
        )}
      >
        {time}
      </p>
      {corridorName ? (
        <p className={cn("text-gray-500", large ? "text-sm" : "text-sm")}>{corridorName}</p>
      ) : null}
      <Badge
        variant="outline"
        className="text-xs font-medium border-[#2A9D8F]/30 text-[#2A9D8F] bg-[#2A9D8F]/5"
      >
        {etaSourceBadgeLabel(source)}
      </Badge>
    </div>
  );
}
