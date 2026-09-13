import { cn } from "@/lib/utils";

type Props = {
  current: string;
  next: string;
  minutesToNext?: string | null;
  vertical?: boolean;
  className?: string;
};

export function OperationalNodeFlow({
  current,
  next,
  minutesToNext,
  vertical,
  className,
}: Props) {
  if (vertical) {
    return (
      <div className={cn("space-y-1 text-sm", className)}>
        <p className="text-xs uppercase tracking-wide text-gray-500">Ubicación actual</p>
        <p className="font-bold text-[#1E3A5F] text-lg leading-snug">{current}</p>
        <p className="text-gray-300 text-center py-0.5" aria-hidden>
          ↓
        </p>
        <p className="text-xs uppercase tracking-wide text-gray-500">Siguiente</p>
        <p className="font-semibold text-gray-800 text-[15px]">{next}</p>
        {minutesToNext ? (
          <p className="text-sm font-medium text-[#2A9D8F] tabular-nums">{minutesToNext}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("text-sm space-y-0.5", className)}>
      <p className="font-bold text-[#1E3A5F] text-[15px]">{current}</p>
      <p className="text-gray-300 leading-none" aria-hidden>
        ↓
      </p>
      <p className="text-gray-700 font-medium">{next}</p>
      {minutesToNext ? (
        <p className="text-sm font-semibold text-[#2A9D8F] tabular-nums">{minutesToNext}</p>
      ) : null}
    </div>
  );
}
