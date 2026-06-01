import {
  GEOFENCE_BADGE_CLASS,
  GEOFENCE_STATE_LABELS,
  normalizeGeofenceState,
} from "@/lib/adminOpsConstants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type GeofenceBadgeProps = {
  geofenceState?: string | null;
  className?: string;
  compact?: boolean;
};

/**
 * Muestra geofence_state cuando el backend lo entrega.
 * Si el contrato aún no incluye el campo, no renderiza nada.
 */
export function GeofenceBadge({
  geofenceState,
  className,
  compact = false,
}: GeofenceBadgeProps) {
  const state = normalizeGeofenceState(geofenceState);
  if (!state) {
    if (geofenceState?.trim()) {
      return (
        <Badge variant="outline" className={cn("text-xs", className)}>
          Geofence: {geofenceState}
        </Badge>
      );
    }
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        compact ? "text-[10px] px-1.5 py-0" : "text-xs",
        GEOFENCE_BADGE_CLASS[state],
        className,
      )}
      title="Geofence operativo"
    >
      <span className="font-semibold opacity-80 mr-1">GF</span>
      {GEOFENCE_STATE_LABELS[state]}
    </Badge>
  );
}
