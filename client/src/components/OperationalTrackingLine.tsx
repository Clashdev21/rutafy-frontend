import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type OperationalTrackingLineProps = {
  resolveLine: (now: number) => string | null;
  className?: string;
  variant?: "onColor" | "default";
};

export function OperationalTrackingLine({
  resolveLine,
  className,
  variant = "default",
}: OperationalTrackingLineProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const line = resolveLine(now);
  if (!line) return null;

  return (
    <p
      className={cn(
        "text-sm font-semibold tabular-nums leading-snug",
        variant === "onColor" ? "text-white/95" : "text-gray-900",
        className,
      )}
      aria-live="polite"
    >
      {line}
    </p>
  );
}
