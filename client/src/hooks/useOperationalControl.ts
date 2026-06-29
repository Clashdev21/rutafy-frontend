import {
  getOperationalControlList,
  type OperationalControlCounts,
  type OperationalControlKpis,
  type OperationalControlListParams,
  type OperationalControlListResult,
} from "@/api/operational-control";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 30_000;

export type UseOperationalControlState = {
  counts: OperationalControlCounts;
  kpis: OperationalControlKpis;
  containers: OperationalControlListResult["containers"];
  filterOptions: OperationalControlListResult["filter_options"];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdatedAt: Date | null;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
};

const EMPTY_COUNTS: OperationalControlCounts = {
  scheduled: 0,
  waiting_gps: 0,
  waiting_movement: 0,
  active: 0,
  completed: 0,
  manual_review: 0,
  alerts: 0,
  critical: 0,
};

const EMPTY_KPIS: OperationalControlKpis = {
  auto_match_pct: null,
  gps_online_pct: null,
  compliance_pct: null,
  delays_pct: null,
  no_signal_pct: null,
};

export function useOperationalControl(
  params?: OperationalControlListParams,
): UseOperationalControlState {
  const [counts, setCounts] = useState<OperationalControlCounts>(EMPTY_COUNTS);
  const [kpis, setKpis] = useState<OperationalControlKpis>(EMPTY_KPIS);
  const [containers, setContainers] = useState<OperationalControlListResult["containers"]>([]);
  const [filterOptions, setFilterOptions] =
    useState<OperationalControlListResult["filter_options"]>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const loadInFlightRef = useRef(false);
  const paramsKey = JSON.stringify(params ?? {});

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (loadInFlightRef.current) return;
      loadInFlightRef.current = true;

      const silent = options?.silent ?? false;
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      const parsedParams = paramsKey ? (JSON.parse(paramsKey) as OperationalControlListParams) : undefined;

      try {
        const result = await getOperationalControlList(parsedParams);
        setCounts(result.counts);
        setKpis(result.kpis);
        setContainers(result.containers);
        setFilterOptions(result.filter_options);
        setError(null);
        setLastUpdatedAt(new Date());
      } catch (e: unknown) {
        setError(
          e instanceof Error ? e.message : "No fue posible cargar el centro operacional",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        loadInFlightRef.current = false;
      }
    },
    [paramsKey],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return {
    counts,
    kpis,
    containers,
    filterOptions,
    isLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    refresh,
  };
}
