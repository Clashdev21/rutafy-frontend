import type { OpsMapMessenger } from "@/api/admin-ops-map";
import {
  OPS_MESSENGER_STATE_LABELS,
  type OpsMessengerState,
} from "@/lib/adminOpsConstants";
import { Card, CardContent } from "@/components/ui/card";

type MessengerOpsSummaryBarProps = {
  messengers: OpsMapMessenger[];
};

function countByOpsState(
  messengers: OpsMapMessenger[],
  state: OpsMessengerState,
): number {
  return messengers.filter((m) => m.ops_state === state).length;
}

const SUMMARY_ITEMS: {
  state: OpsMessengerState;
  label: string;
  valueClass: string;
}[] = [
  { state: "AVAILABLE", label: "Disponibles", valueClass: "text-green-700" },
  { state: "ASSIGNED", label: "Asignados", valueClass: "text-blue-700" },
  { state: "IN_SERVICE", label: "En servicio", valueClass: "text-purple-700" },
  { state: "OFFLINE", label: "Offline", valueClass: "text-gray-600" },
];

export function MessengerOpsSummaryBar({ messengers }: MessengerOpsSummaryBarProps) {
  const busyIdle = countByOpsState(messengers, "BUSY_IDLE");

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
      {SUMMARY_ITEMS.map((item) => (
        <Card key={item.state} className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className={`text-xl font-bold ${item.valueClass}`}>
              {countByOpsState(messengers, item.state)}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {OPS_MESSENGER_STATE_LABELS[item.state]}
            </p>
          </CardContent>
        </Card>
      ))}
      {busyIdle > 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">Busy idle</p>
            <p className="text-xl font-bold text-amber-700">{busyIdle}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {OPS_MESSENGER_STATE_LABELS.BUSY_IDLE}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
