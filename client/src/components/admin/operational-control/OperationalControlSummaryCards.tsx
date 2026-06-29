import type { OperationalControlCounts, OperationalControlKpis } from "@/api/operational-control";
import { Card, CardContent } from "@/components/ui/card";
import { formatCount, formatPercent } from "@/lib/operationalControlConstants";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Navigation,
  Radio,
  ShieldAlert,
  Truck,
} from "lucide-react";

function CountCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  icon: typeof Truck;
  className?: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
            <p className={`text-xl font-bold tabular-nums mt-0.5 text-[#1E3A5F] ${className ?? ""}`}>
              {value}
            </p>
          </div>
          <Icon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-0 shadow-sm bg-[#1E3A5F]/[0.03]">
      <CardContent className="p-3">
        <p className="text-[11px] text-gray-500">{label}</p>
        <p className="text-lg font-semibold tabular-nums text-[#1E3A5F] mt-0.5">{value}</p>
      </CardContent>
    </Card>
  );
}

type Props = {
  counts: OperationalControlCounts;
  kpis: OperationalControlKpis;
};

export function OperationalControlSummaryCards({ counts, kpis }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
        <CountCard label="Programados" value={formatCount(counts.scheduled)} icon={Clock} />
        <CountCard label="Esperando GPS" value={formatCount(counts.waiting_gps)} icon={Radio} />
        <CountCard
          label="Esperando Movimiento"
          value={formatCount(counts.waiting_movement)}
          icon={Navigation}
        />
        <CountCard label="Activos" value={formatCount(counts.active)} icon={Truck} />
        <CountCard label="Finalizados" value={formatCount(counts.completed)} icon={CheckCircle2} />
        <CountCard label="Manual Review" value={formatCount(counts.manual_review)} icon={Eye} />
        <CountCard
          label="Alertas"
          value={formatCount(counts.alerts)}
          icon={AlertTriangle}
          className="text-amber-700"
        />
        <CountCard
          label="Críticos"
          value={formatCount(counts.critical)}
          icon={ShieldAlert}
          className="text-red-700"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <KpiCard label="Auto Match %" value={formatPercent(kpis.auto_match_pct)} />
        <KpiCard label="GPS Online %" value={formatPercent(kpis.gps_online_pct)} />
        <KpiCard label="Cumplimiento %" value={formatPercent(kpis.compliance_pct)} />
        <KpiCard label="Retrasos %" value={formatPercent(kpis.delays_pct)} />
        <KpiCard label="Sin señal %" value={formatPercent(kpis.no_signal_pct)} />
      </div>
    </div>
  );
}
