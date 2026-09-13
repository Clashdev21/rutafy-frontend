import { Badge } from "@/components/ui/badge";
import {
  etaSourceBadgeLabel,
  type EtaSourceKind,
} from "@/lib/operationalTwinContract";
import { cn } from "@/lib/utils";

type Props = {
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
  const badge = expired ? "ETA vencido" : etaSourceBadgeLabel(source);

  return (
    <div className={cn("space-y-1", className)}>
      <p
        className={cn(
          "uppercase tracking-wider text-gray-400 font-semibold",
          large ? "text-xs" : "text-xs",
        )}
      >
        ETA
      </p>
      <p
        className={cn(
          "font-bold tabular-nums leading-none transition-colors duration-500",
          large ? "text-4xl" : "text-xl",
          expired ? "text-orange-600" : "text-[#1E3A5F]",
        )}
      >
        {expired && time !== "ETA vencido" ? time : time}
      </p>
      {corridorName ? (
        <p className={cn("text-gray-500", large ? "text-sm" : "text-sm")}>{corridorName}</p>
      ) : null}
      <Badge
        variant="outline"
        className={cn(
          "text-xs font-medium border-[#2A9D8F]/30 text-[#2A9D8F] bg-[#2A9D8F]/5",
          expired && "border-orange-300 text-orange-700 bg-orange-50",
        )}
      >
        {badge}
      </Badge>
    </div>
  );
}
