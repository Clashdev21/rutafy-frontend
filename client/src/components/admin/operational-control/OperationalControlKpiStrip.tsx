import type { OperationalControlCounts, OperationalControlKpis } from "@/api/operational-control";
import { Card, CardContent } from "@/components/ui/card";
import { formatCount, formatPercent } from "@/lib/operationalControlConstants";
import { AlertTriangle, Radio, Timer, Truck } from "lucide-react";

type Props = {
  counts: OperationalControlCounts;
  kpis: OperationalControlKpis;
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

export function OperationalControlKpiStrip({ counts, kpis }: Props) {
  const delays =
    kpis.delays_pct != null ? formatPercent(kpis.delays_pct) : formatCount(counts.manual_review);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <KpiCard label="Contenedores activos" value={formatCount(counts.active)} icon={Truck} />
      <KpiCard
        label="Esperando GPS"
        value={formatCount(counts.waiting_gps)}
        icon={Radio}
        accent="text-amber-700"
      />
      <KpiCard
        label="Alertas críticas"
        value={formatCount(counts.critical)}
        icon={AlertTriangle}
        accent="text-red-700"
      />
      <KpiCard label="Retrasos" value={delays} icon={Timer} accent="text-orange-700" />
      <KpiCard
        label="GPS Online %"
        value={formatPercent(kpis.gps_online_pct)}
        icon={Radio}
        accent="text-emerald-700"
      />
    </div>
  );
}
