import {
  DISPATCH_STATUS_LABELS,
  OPERATIONAL_STATUS_LABELS,
  dispatchStatusBadgeClass,
  normalizeDispatchStatus,
  normalizeOperationalStatus,
  operationalStatusBadgeClass,
  type DispatchStatus,
  type OperationalStatus,
} from "@/lib/adminOpsConstants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type OperationalStatusBadgesProps = {
  status?: string | null;
  dispatchStatus?: string | null;
  className?: string;
  compact?: boolean;
};

export function OperationalStatusBadges({
  status,
  dispatchStatus,
  className,
  compact = false,
}: OperationalStatusBadgesProps) {
  const op = normalizeOperationalStatus(status);
  const dispatch = normalizeDispatchStatus(dispatchStatus);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {op ? (
        <Badge
          variant="outline"
          className={cn(
            compact ? "text-[10px] px-1.5 py-0" : "text-xs",
            operationalStatusBadgeClass(op),
          )}
          title="Estado operacional (services.status)"
        >
          <span className="font-semibold opacity-80 mr-1">OP</span>
          {OPERATIONAL_STATUS_LABELS[op]}
        </Badge>
      ) : status ? (
        <Badge variant="outline" className="text-xs text-gray-600">
          OP: {status}
        </Badge>
      ) : null}
      {dispatch ? (
        <Badge
          variant="outline"
          className={cn(
            compact ? "text-[10px] px-1.5 py-0" : "text-xs",
            dispatchStatusBadgeClass(dispatch),
          )}
          title="Estado de asignación (services.dispatch_status)"
        >
          <span className="font-semibold opacity-80 mr-1">DSP</span>
          {DISPATCH_STATUS_LABELS[dispatch]}
        </Badge>
      ) : dispatchStatus ? (
        <Badge variant="outline" className="text-xs text-gray-600">
          DSP: {dispatchStatus}
        </Badge>
      ) : null}
    </div>
  );
}

export function displayOperationalStatus(status?: string | null): string {
  const op = normalizeOperationalStatus(status);
  return op ? OPERATIONAL_STATUS_LABELS[op] : status?.trim() || "—";
}

export function displayDispatchStatus(status?: string | null): string {
  const d = normalizeDispatchStatus(status);
  return d ? DISPATCH_STATUS_LABELS[d] : status?.trim() || "—";
}
