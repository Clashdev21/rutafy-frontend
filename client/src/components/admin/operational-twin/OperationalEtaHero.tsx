import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  time: string;
  corridorName?: string | null;
  source?: "ia" | "gps" | "programacion";
  expired?: boolean;
  size?: "sm" | "lg";
  className?: string;
};

const SOURCE_BADGE: Record<NonNullable<Props["source"]>, string> = {
  ia: "IA Rutafy",
  gps: "GPS",
  programacion: "Programación",
};

export function OperationalEtaHero({
  time,
  corridorName,
  source = "ia",
  expired,
  size = "sm",
  className,
}: Props) {
  const large = size === "lg";

  return (
    <div className={cn("space-y-1", className)}>
      <p
        className={cn(
          "uppercase tracking-wider text-gray-400 font-semibold",
          large ? "text-xs" : "text-[10px]",
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
        {time}
      </p>
      {corridorName ? (
        <p className={cn("text-gray-500", large ? "text-sm" : "text-xs")}>{corridorName}</p>
      ) : null}
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] font-medium border-[#2A9D8F]/30 text-[#2A9D8F] bg-[#2A9D8F]/5",
          large && "text-xs",
        )}
      >
        {SOURCE_BADGE[source]}
      </Badge>
    </div>
  );
}
