import type { TowerKpis } from "@/hooks/useOperationalTwinTower";
import { Card, CardContent } from "@/components/ui/card";
import { formatCount } from "@/lib/operationalControlConstants";
import { AlertTriangle, Anchor, Clock, Timer, Truck } from "lucide-react";

type Props = {
  kpis: TowerKpis;
};

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Truck;
  accent?: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${accent ?? "text-[#1E3A5F]"}`}>
              {value}
            </p>
          </div>
          <Icon className="h-5 w-5 text-gray-400 shrink-0" aria-hidden />
        </div>
      </CardContent>
    </Card>
  );
}

export function OperationalTowerKpiStrip({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <KpiCard label="Contenedores activos" value={formatCount(kpis.active)} icon={Truck} />
      <KpiCard label="En puerto" value={formatCount(kpis.inPort)} icon={Anchor} accent="text-blue-700" />
      <KpiCard
        label="En tránsito"
        value={formatCount(kpis.inTransit)}
        icon={Timer}
        accent="text-[#2A9D8F]"
      />
      <KpiCard
        label="En riesgo"
        value={formatCount(kpis.atRisk)}
        icon={AlertTriangle}
        accent="text-red-700"
      />
      <KpiCard label="ETA promedio" value={kpis.avgEta} icon={Clock} accent="text-[#1E3A5F]" />
    </div>
  );
}
