import type { RouteNodeUi } from "@/lib/operationalTwinUx";
import { cn } from "@/lib/utils";

type Props = {
  nodes: RouteNodeUi[];
  className?: string;
};

export function OperationalRouteVertical({ nodes, className }: Props) {
  if (nodes.length === 0) {
    return <p className="text-sm text-gray-500">Sin ruta declarada.</p>;
  }

  return (
    <div className={cn("flex flex-col items-center py-2", className)}>
      {nodes.map((node, index) => (
        <div key={node.id} className="flex flex-col items-center w-full">
          <div
            className={cn(
              "px-3 py-2 rounded-lg text-[15px] font-medium text-center transition-all duration-500 max-w-full",
              node.kind === "current_location"
                ? "bg-sky-600 text-white shadow-md ring-2 ring-sky-300"
                : node.isCurrent
                  ? "bg-[#1E3A5F] text-white shadow-md scale-105"
                  : node.isDestination || node.kind === "destination"
                    ? "bg-[#2A9D8F]/15 text-[#1E3A5F] border border-[#2A9D8F]/30"
                    : "bg-gray-50 text-gray-700 border border-gray-100",
            )}
          >
            {node.isCurrent || node.kind === "current_location" ? (
              <span className="mr-1" aria-hidden>
                ●
              </span>
            ) : null}
            {node.name}
            {node.kind === "current_location" ? (
              <span className="block text-xs font-normal opacity-90 mt-0.5">Ubicación actual</span>
            ) : null}
          </div>
          {index < nodes.length - 1 ? (
            <span className="text-gray-300 py-1.5 text-lg leading-none" aria-hidden>
              ↓
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
