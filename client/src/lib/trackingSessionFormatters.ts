export function truncateUuid(id?: string | null, head = 8, tail = 4): string {
  const s = String(id ?? "").trim();
  if (!s) return "—";
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function formatTrackingDateTime(iso?: string | null): string {
  if (iso == null || String(iso).trim() === "") return "—";
  const ms = Date.parse(String(iso));
  if (!Number.isFinite(ms)) return String(iso);
  return new Date(ms).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatHeartbeatAge(iso?: string | null, now = Date.now()): string {
  if (iso == null || String(iso).trim() === "") return "—";
  const ms = Date.parse(String(iso));
  if (!Number.isFinite(ms)) return "—";
  const diffSec = Math.max(0, Math.floor((now - ms) / 1000));
  if (diffSec < 60) return "hace <1 min";
  if (diffSec < 3600) return `hace ${Math.floor(diffSec / 60)} min`;
  const hours = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  if (mins === 0) return `hace ${hours} h`;
  return `hace ${hours} h ${mins} min`;
}

/** Segundos → "4 h 6 min" o "14 min 31 s" */
export function formatDurationSeconds(totalSeconds?: number | null): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "—";
  }
  const sec = Math.round(totalSeconds);
  if (sec === 0) return "0 s";

  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  if (hours > 0) {
    if (minutes > 0) return `${hours} h ${minutes} min`;
    return `${hours} h`;
  }
  if (minutes > 0) {
    if (seconds > 0) return `${minutes} min ${seconds} s`;
    return `${minutes} min`;
  }
  return `${seconds} s`;
}

export function formatAccuracyMeters(meters?: number | null): string {
  if (meters == null || !Number.isFinite(meters)) return "—";
  const rounded = Math.round(meters * 10) / 10;
  return `${rounded} m`;
}

export function formatSpeedMps(mps?: number | null): string {
  if (mps == null || !Number.isFinite(mps)) return "—";
  const kmh = Math.round(mps * 3.6 * 10) / 10;
  return `${kmh} km/h`;
}

export function formatPercent(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 100) / 100;
  return `${rounded}%`;
}

/** Cobertura GPS con un decimal: 6.21 → 6.2% */
export function formatCoveragePct(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
}

export function formatPointCount(count?: number | null): string {
  if (count == null || !Number.isFinite(count)) return "—";
  return String(Math.round(count));
}

/** Minutos → "18 min" o "4 h 6 min" */
export function formatDurationMinutes(minutes?: number | null): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return "—";
  const totalMin = Math.round(minutes);
  if (totalMin === 0) return "0 min";
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) {
    if (mins > 0) return `${hours} h ${mins} min`;
    return `${hours} h`;
  }
  return `${mins} min`;
}

export function formatSpeedKmh(kmh?: number | null): string {
  if (kmh == null || !Number.isFinite(kmh)) return "—";
  const rounded = Math.round(kmh * 10) / 10;
  return `${rounded} km/h`;
}

export function formatDistanceKm(km?: number | null): string {
  if (km == null || !Number.isFinite(km)) return "—";
  const rounded = Math.round(km * 100) / 100;
  return `${rounded} km`;
}
