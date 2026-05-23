import type { OpsServiceLocation } from "@/api/admin-ops-service";

export function formatOperationalLocation(
  location: OpsServiceLocation | null | undefined,
): string {
  if (!location) return "—";
  const label = location.label?.trim() ?? "";
  const sub = location.sub_location?.trim() ?? "";
  if (label && sub) return `${label} · ${sub}`;
  if (label) return label;
  if (sub) return sub;
  return "—";
}

export function formatOperationalLocationBlock(
  location: OpsServiceLocation | null | undefined,
): string {
  if (!location) return "—";
  const main = formatOperationalLocation(location);
  if (main === "—") return "—";
  const lat = location.lat;
  const lng = location.lng;
  const coords =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
      ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      : null;
  return coords ? `${main} · ${coords}` : main;
}

function toOptionalString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

export function locationFromUnknown(value: unknown): OpsServiceLocation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  const label =
    toOptionalString(rec.label) ??
    toOptionalString(rec.name) ??
    toOptionalString(rec.address_text);
  const sub_location =
    toOptionalString(rec.sub_location) ?? toOptionalString(rec.subLocation);
  if (!label && !sub_location) return null;
  return { label, sub_location, lat: null, lng: null, node: null };
}

export function formatLabelWithSubLocation(
  label: string | null | undefined,
  subLocation: string | null | undefined,
  fallback: string,
): string {
  const l = label?.trim() ?? "";
  const s = subLocation?.trim() ?? "";
  if (l && s) return `${l} · ${s}`;
  if (l) return l;
  if (s) return s;
  return fallback;
}

const ORIGIN_SUB_META_KEYS = [
  "origin_sub_location",
  "originSubLocation",
  "pickup_sub_location",
  "pickupSubLocation",
] as const;

const DEST_SUB_META_KEYS = [
  "destination_sub_location",
  "destinationSubLocation",
  "dropoff_sub_location",
  "dropoffSubLocation",
] as const;

const ORIGIN_LABEL_META_KEYS = [
  "origin",
  "origin_node_name",
  "origin_label",
  "originName",
  "pickup_address",
  "pickupAddress",
  "from",
] as const;

const DEST_LABEL_META_KEYS = [
  "destination",
  "destination_node_name",
  "destination_label",
  "destinationName",
  "dropoff_address",
  "dropoffAddress",
  "to",
] as const;

function pickFirstMetaString(
  meta: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): string | null {
  if (!meta) return null;
  for (const key of keys) {
    const v = toOptionalString(meta[key]);
    if (v) return v;
  }
  return null;
}

export function pickRouteSubLocation(
  meta: Record<string, unknown> | null | undefined,
  which: "origin" | "destination",
): string | null {
  const keys = which === "origin" ? ORIGIN_SUB_META_KEYS : DEST_SUB_META_KEYS;
  return pickFirstMetaString(meta, keys);
}

export function formatServiceRouteEndpoint(
  primary: unknown,
  meta: Record<string, unknown> | null | undefined,
  which: "origin" | "destination",
  fallback: string,
): string {
  const fromObj = locationFromUnknown(primary);
  if (fromObj) {
    const formatted = formatOperationalLocation(fromObj);
    if (formatted !== "—") return formatted;
  }

  const label =
    typeof primary === "string"
      ? primary.trim() || null
      : toOptionalString(primary);
  const labelKeys = which === "origin" ? ORIGIN_LABEL_META_KEYS : DEST_LABEL_META_KEYS;
  const resolvedLabel = label ?? pickFirstMetaString(meta, labelKeys);
  const sub = pickRouteSubLocation(meta, which);

  return formatLabelWithSubLocation(resolvedLabel, sub, fallback);
}
