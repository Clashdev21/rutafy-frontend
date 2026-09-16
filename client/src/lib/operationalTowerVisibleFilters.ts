export type TowerFilterKey =
  | "client"
  | "program"
  | "status"
  | "port"
  | "driver"
  | "plate"
  | "date";

export type OperationalControlFiltersState = {
  client: string;
  program: string;
  status: string;
  port: string;
  driver: string;
  plate: string;
  date: string;
};

export const EMPTY_OPERATIONAL_FILTERS: OperationalControlFiltersState = {
  client: "all",
  program: "all",
  status: "all",
  port: "all",
  driver: "all",
  plate: "all",
  date: "",
};

export const ALL_TOWER_FILTER_KEYS: readonly TowerFilterKey[] = [
  "client",
  "program",
  "status",
  "port",
  "driver",
  "plate",
  // "date" retired from principal +Filtro (3D.4C Hoy/Ayer). Kept in type for 3D.4D.
] as const;

export const DEFAULT_VISIBLE_FILTERS: readonly TowerFilterKey[] = [
  "client",
  "status",
  "port",
] as const;

export const VISIBLE_FILTERS_STORAGE_KEY = "rutafy.controlTower.visibleFilters.v1";

export const TOWER_FILTER_LABELS: Record<TowerFilterKey, string> = {
  client: "Cliente",
  program: "Programa",
  status: "Estado",
  port: "Puerto",
  driver: "Conductor",
  plate: "Placa",
  date: "Fecha",
};

const ALLOWED = new Set<string>(ALL_TOWER_FILTER_KEYS);

export function sanitizeVisibleFilters(raw: unknown): TowerFilterKey[] {
  if (!Array.isArray(raw)) return [...DEFAULT_VISIBLE_FILTERS];
  const seen = new Set<TowerFilterKey>();
  const out: TowerFilterKey[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    if (item === "date") continue; // 3D.4C: Hoy/Ayer replaces simple date filter
    if (!ALLOWED.has(item)) continue;
    const key = item as TowerFilterKey;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out.length > 0 ? out : [...DEFAULT_VISIBLE_FILTERS];
}

/** Deduplicate and drop unknown keys; may return empty (unlike sanitize). */
export function cleanVisibleFilters(raw: unknown): TowerFilterKey[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<TowerFilterKey>();
  const out: TowerFilterKey[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    if (!ALLOWED.has(item)) continue;
    const key = item as TowerFilterKey;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function loadVisibleFilters(): TowerFilterKey[] {
  try {
    if (typeof localStorage === "undefined") return [...DEFAULT_VISIBLE_FILTERS];
    const raw = localStorage.getItem(VISIBLE_FILTERS_STORAGE_KEY);
    if (raw == null || raw.trim() === "") return [...DEFAULT_VISIBLE_FILTERS];
    return sanitizeVisibleFilters(JSON.parse(raw) as unknown);
  } catch {
    return [...DEFAULT_VISIBLE_FILTERS];
  }
}

export function saveVisibleFilters(filters: TowerFilterKey[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(VISIBLE_FILTERS_STORAGE_KEY, JSON.stringify(cleanVisibleFilters(filters)));
  } catch {
    // localStorage may be unavailable (private mode, SSR, quota)
  }
}

export function clearFilterValue(
  values: OperationalControlFiltersState,
  key: TowerFilterKey,
): OperationalControlFiltersState {
  if (key === "date") return { ...values, date: "" };
  return { ...values, [key]: "all" };
}

export function hasActiveFilterValues(values: OperationalControlFiltersState): boolean {
  return (
    values.client !== "all" ||
    values.program !== "all" ||
    values.status !== "all" ||
    values.port !== "all" ||
    values.driver !== "all" ||
    values.plate !== "all" ||
    Boolean(values.date.trim())
  );
}

export function resetFilterValues(): OperationalControlFiltersState {
  return { ...EMPTY_OPERATIONAL_FILTERS };
}

/** Remove a visible filter and clear its value (no hidden-active filters). */
export function removeVisibleFilter(
  visible: TowerFilterKey[],
  key: TowerFilterKey,
  values: OperationalControlFiltersState,
): { visibleFilters: TowerFilterKey[]; filterValues: OperationalControlFiltersState } {
  return {
    visibleFilters: visible.filter((k) => k !== key),
    filterValues: clearFilterValue(values, key),
  };
}

export function addVisibleFilter(
  visible: TowerFilterKey[],
  key: TowerFilterKey,
): TowerFilterKey[] {
  if (visible.includes(key)) return visible;
  return [...visible, key];
}

/** Keys still available in the +Filtro menu (never includes already-visible). */
export function availableTowerFilterKeys(visible: TowerFilterKey[]): TowerFilterKey[] {
  return ALL_TOWER_FILTER_KEYS.filter((k) => !visible.includes(k));
}
