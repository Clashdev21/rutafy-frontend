import type { OpsServiceLocation } from "@/api/admin-ops-service";
import { cn } from "@/lib/utils";

type OperationalLocationDisplayProps = {
  location: OpsServiceLocation | null | undefined;
  className?: string;
  emptyClassName?: string;
};

/** Muestra label como texto principal y sub_location como detalle operativo secundario. */
export function OperationalLocationDisplay({
  location,
  className,
  emptyClassName,
}: OperationalLocationDisplayProps) {
  const label = location?.label?.trim() ?? "";
  const sub = location?.sub_location?.trim() ?? "";

  if (!label && !sub) {
    return (
      <p className={cn("text-gray-800", emptyClassName ?? className)}>—</p>
    );
  }

  if (label && sub) {
    return (
      <div className={className}>
        <p className="text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
      </div>
    );
  }

  return (
    <p className={cn("text-gray-800", className)}>{label || sub}</p>
  );
}
