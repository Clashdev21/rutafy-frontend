import type { OpsMapMessenger } from "@/api/admin-ops-map";
import type { OpsMapService, OpsMapServiceFlags } from "@/api/admin-ops-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type OpsIncident = {
  id: string;
  kind:
    | "sla_breach"
    | "service_stopped"
    | "heartbeat_stale"
    | "offline_with_active"
    | "operational_inconsistency";
  title: string;
  detail: string;
  serviceId?: string;
  messengerId?: string;
};

function flagsFromService(service: OpsMapService): OpsMapServiceFlags | null {
  return service.operational_flags ?? null;
}

function isLocationStale(updatedAt?: string | null, maxAgeMs = 120_000): boolean {
  if (!updatedAt?.trim()) return true;
  const ms = Date.parse(updatedAt);
  if (!Number.isFinite(ms)) return true;
  return Date.now() - ms > maxAgeMs;
}

export function buildOpsIncidents(
  services: OpsMapService[],
  messengers: OpsMapMessenger[],
): OpsIncident[] {
  const out: OpsIncident[] = [];

  for (const service of services) {
    const flags = flagsFromService(service);
    if (flags?.sla_pickup_breach || flags?.sla_delivery_breach) {
      out.push({
        id: `sla-${service.service_id}`,
        kind: "sla_breach",
        title: "SLA vencido",
        detail: `${service.service_short || service.service_id} · revisar recogida/entrega`,
        serviceId: service.service_id,
      });
    }
    if (flags?.service_stopped) {
      out.push({
        id: `stopped-${service.service_id}`,
        kind: "service_stopped",
        title: "Servicio detenido",
        detail: service.company_name || service.service_id,
        serviceId: service.service_id,
      });
    } else {
      const stuck = String(flags?.stuck_level ?? "").toUpperCase();
      if (stuck === "ALERT" || stuck === "WARN") {
        out.push({
          id: `stopped-stuck-${service.service_id}`,
          kind: "service_stopped",
          title: "Servicio detenido",
          detail: `Nivel ${stuck} · ${service.company_name || service.service_id}`,
          serviceId: service.service_id,
        });
      }
    }
    if (flags?.heartbeat_stale) {
      out.push({
        id: `hb-svc-${service.service_id}`,
        kind: "heartbeat_stale",
        title: "Heartbeat desactualizado",
        detail: service.service_short || service.service_id,
        serviceId: service.service_id,
      });
    }
    if (flags?.operational_inconsistency) {
      out.push({
        id: `inconsistency-${service.service_id}`,
        kind: "operational_inconsistency",
        title: "Posible inconsistencia operacional",
        detail: service.service_id,
        serviceId: service.service_id,
      });
    }
  }

  for (const m of messengers) {
    if (m.is_online === false && isLocationStale(m.location_updated_at)) {
      out.push({
        id: `hb-${m.messenger_id}`,
        kind: "heartbeat_stale",
        title: "Heartbeat desactualizado",
        detail: getMessengerLabel(m),
        messengerId: m.messenger_id,
      });
    }
    if (
      m.ops_state === "OFFLINE" &&
      m.active_service?.service_id
    ) {
      out.push({
        id: `offline-active-${m.messenger_id}`,
        kind: "offline_with_active",
        title: "Mensajero offline con servicio activo",
        detail: `${getMessengerLabel(m)} · ${m.active_service.service_id}`,
        messengerId: m.messenger_id,
        serviceId: m.active_service.service_id,
      });
    }
  }

  return out;
}

function getMessengerLabel(m: OpsMapMessenger): string {
  return m.full_name?.trim() || m.phone?.trim() || m.messenger_id;
}

type OpsIncidentsPanelProps = {
  services: OpsMapService[];
  messengers: OpsMapMessenger[];
  onSelectService?: (serviceId: string) => void;
  onSelectMessenger?: (messengerId: string) => void;
  className?: string;
};

export function OpsIncidentsPanel({
  services,
  messengers,
  onSelectService,
  onSelectMessenger,
  className,
}: OpsIncidentsPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const incidents = useMemo(
    () => buildOpsIncidents(services, messengers),
    [services, messengers],
  );

  return (
    <Card className={cn("border border-amber-200/80 shadow-sm", className)}>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base text-[#1E3A5F] flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-amber-600" />
          Incidentes
          <span className="text-xs font-normal text-gray-500">
            ({incidents.length})
          </span>
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expandir incidentes" : "Colapsar incidentes"}
        >
          {collapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      {!collapsed ? (
        <CardContent className="pt-0 px-4 pb-4">
          {incidents.length === 0 ? (
            <p className="text-sm text-gray-500">Sin incidentes detectados en el snapshot.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {incidents.map((inc) => (
                <li
                  key={inc.id}
                  className="rounded-md border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-amber-950">{inc.title}</p>
                  <p className="text-xs text-amber-900/80 mt-0.5">{inc.detail}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {inc.serviceId && onSelectService ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-[#1E3A5F] underline"
                        onClick={() => onSelectService(inc.serviceId!)}
                      >
                        Ver servicio
                      </button>
                    ) : null}
                    {inc.messengerId && onSelectMessenger ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-[#1E3A5F] underline"
                        onClick={() => onSelectMessenger(inc.messengerId!)}
                      >
                        Ver mensajero
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}
