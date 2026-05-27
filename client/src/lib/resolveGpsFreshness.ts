export type GpsFreshnessTier = "fresh" | "aging" | "stale" | "unknown";

const FRESH_MS = 30_000;
const STALE_MS = 90_000;

function parseUpdatedAtMs(updatedAt?: string | null): number | null {
  if (updatedAt == null || String(updatedAt).trim() === "") return null;
  const ms = Date.parse(String(updatedAt));
  return Number.isFinite(ms) ? ms : null;
}

export function resolveGpsFreshness(
  updatedAt?: string | null,
  now = Date.now(),
): GpsFreshnessTier {
  const ts = parseUpdatedAtMs(updatedAt);
  if (ts == null) return "unknown";

  const ageMs = now - ts;
  if (ageMs < FRESH_MS) return "fresh";
  if (ageMs <= STALE_MS) return "aging";
  return "stale";
}

export function formatGpsAge(updatedAt?: string | null, now = Date.now()): string | null {
  const ts = parseUpdatedAtMs(updatedAt);
  if (ts == null) return null;

  const minutes = (now - ts) / 60_000;
  if (minutes < 1) return "hace ~1 min";
  return `hace ~${Math.floor(minutes)} min`;
}
