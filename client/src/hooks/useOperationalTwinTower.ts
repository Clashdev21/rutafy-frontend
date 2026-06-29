import {
  getOperationalControlList,
  type OperationalControlListParams,
} from "@/api/operational-control";
import { listOperationalDigitalTwins, type OperationalDigitalTwin } from "@/api/operational-digital-twin";
import {
  buildContainerLiveState,
  computeTowerKpis,
  mergeLiveStatesForAnimation,
  type ContainerLiveState,
} from "@/lib/operationalTwinUx";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UseOperationalControlState } from "@/hooks/useOperationalControl";

const POLL_INTERVAL_MS = 30_000;

export type TowerKpis = {
  active: number;
  inPort: number;
  inTransit: number;
  atRisk: number;
  avgEta: string;
};

export type UseOperationalTwinTowerState = UseOperationalControlState & {
  liveStates: ContainerLiveState[];
  towerKpis: TowerKpis;
  twinsLoaded: boolean;
};

export function useOperationalTwinTower(
  params?: OperationalControlListParams,
): UseOperationalTwinTowerState {
  const base = useOperationalControlBase(params);
  const [liveStates, setLiveStates] = useState<ContainerLiveState[]>([]);
  const [twinsLoaded, setTwinsLoaded] = useState(false);
  const twinsRef = useRef<Map<string, OperationalDigitalTwin>>(new Map());

  const rebuildLiveStates = useCallback(
    (silent: boolean) => {
      const twinsMap = twinsRef.current;
      const next = base.containers.map((row) =>
        buildContainerLiveState(row, twinsMap.get(row.container_id) ?? null),
      );
      setLiveStates((prev) => (silent ? mergeLiveStatesForAnimation(prev, next) : next));
    },
    [base.containers],
  );

  const loadTwins = useCallback(
    async (silent: boolean) => {
      const programCode = params?.program?.trim();
      try {
        const twins = await listOperationalDigitalTwins({
          program_code: programCode || undefined,
          client: params?.client,
          port: params?.port,
          limit: 500,
        });
        const map = new Map<string, (typeof twins)[number]>();
        for (const twin of twins) map.set(twin.container_id, twin);
        twinsRef.current = map;
        setTwinsLoaded(true);
      } catch {
        if (!silent) setTwinsLoaded(false);
      } finally {
        rebuildLiveStates(silent);
      }
    },
    [params?.client, params?.port, params?.program, rebuildLiveStates],
  );

  useEffect(() => {
    rebuildLiveStates(false);
  }, [rebuildLiveStates]);

  useEffect(() => {
    void loadTwins(false);
  }, [loadTwins]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void base.refresh({ silent: true });
      void loadTwins(true);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [base, loadTwins]);

  const towerKpis = computeTowerKpis(liveStates, base.counts.active);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      await base.refresh({ silent });
      await loadTwins(silent);
    },
    [base, loadTwins],
  );

  return {
    ...base,
    refresh,
    liveStates,
    twinsLoaded,
    towerKpis,
  };
}

function useOperationalControlBase(params?: OperationalControlListParams) {
  const [counts, setCounts] = useState<UseOperationalControlState["counts"]>({
    scheduled: 0,
    waiting_gps: 0,
    waiting_movement: 0,
    active: 0,
    completed: 0,
    manual_review: 0,
    alerts: 0,
    critical: 0,
  });
  const [kpis, setKpis] = useState<UseOperationalControlState["kpis"]>({
    auto_match_pct: null,
    gps_online_pct: null,
    compliance_pct: null,
    delays_pct: null,
    no_signal_pct: null,
  });
  const [containers, setContainers] = useState<UseOperationalControlState["containers"]>([]);
  const [filterOptions, setFilterOptions] =
    useState<UseOperationalControlState["filterOptions"]>();
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
      const parsedParams = paramsKey
        ? (JSON.parse(paramsKey) as OperationalControlListParams)
        : undefined;
      try {
        const result = await getOperationalControlList(parsedParams);
        setCounts(result.counts);
        setKpis(result.kpis);
        setContainers(result.containers);
        setFilterOptions(result.filter_options);
        setError(null);
        setLastUpdatedAt(new Date());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "No fue posible cargar el centro operacional");
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
