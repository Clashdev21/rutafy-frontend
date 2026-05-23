import {
  displayParticipantValue,
  hasOperationalParticipant,
  type OperationalParticipant,
} from "@/lib/operationalParticipant";
import { cn } from "@/lib/utils";

type OperationalParticipantCardProps = {
  title: string;
  participant: OperationalParticipant | null | undefined;
  variant?: "default" | "onColor";
  className?: string;
};

export function OperationalParticipantCard({
  title,
  participant,
  variant = "default",
  className,
}: OperationalParticipantCardProps) {
  if (!hasOperationalParticipant(participant)) return null;

  const onColor = variant === "onColor";

  return (
    <div
      className={cn(
        "rounded-xl border p-3 space-y-2 text-sm",
        onColor
          ? "border-white/15 bg-white/10 text-white/95"
          : "border-slate-200 bg-slate-50/90 text-slate-800",
        className,
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wide",
          onColor ? "text-white/70" : "text-slate-500",
        )}
      >
        {title}
      </p>
      <div className="grid gap-1.5 text-xs sm:text-sm">
        <Row label="Nombre" value={participant?.name} onColor={onColor} />
        <Row label="Placa" value={participant?.plate} onColor={onColor} mono />
        <Row label="Vehículo" value={participant?.vehicle_type} onColor={onColor} />
        {participant?.vehicle_reference ? (
          <Row
            label="Referencia"
            value={participant.vehicle_reference}
            onColor={onColor}
          />
        ) : null}
        {participant?.company_name ? (
          <Row label="Empresa" value={participant.company_name} onColor={onColor} />
        ) : null}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  onColor,
  mono,
}: {
  label: string;
  value?: string | null;
  onColor: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className={onColor ? "text-white/70 shrink-0" : "text-slate-500 shrink-0"}>
        {label}
      </span>
      <span
        className={cn(
          "font-medium text-right",
          mono && "font-mono",
          onColor ? "text-white" : "text-slate-900",
        )}
      >
        {displayParticipantValue(value)}
      </span>
    </div>
  );
}
