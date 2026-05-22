export type DispatchAlertItem = {
  alert_id: string;
  service_id: string;
  alert_type: string;
  service_status?: string | null;
  sla_deadline_at?: string | null;
  eta_at?: string | null;
  detected_at?: string | null;
  resolved_at?: string | null;
  current_status?: string | null;
  dispatch_status?: string | null;
  service_type?: string | null;
  requester_company_id?: string | null;
  mensajero_id?: string | null;
  assigned_messenger_id?: string | null;
};

export type DispatchAlertsResponse = {
  trace_id?: string;
  status?: string;
  limit?: number;
  items: DispatchAlertItem[];
};

export type GetDispatchAlertsOptions = {
  status?: string;
  limit?: number;
};

function getApiBase(): string {
  const base = import.meta.env.VITE_RUTAFY_API_BASE;
  if (typeof base === "string" && base.trim()) {
    return base.trim().replace(/\/$/, "");
  }
  return "";
}

function getAdminKey(): string {
  const key = import.meta.env.VITE_RUTAFY_ADMIN_KEY;
  return typeof key === "string" ? key.trim() : "";
}

export async function getDispatchAlerts(
  options?: GetDispatchAlertsOptions,
): Promise<DispatchAlertsResponse> {
  const apiBase = getApiBase();
  const adminKey = getAdminKey();

  if (!apiBase) {
    throw new Error("VITE_RUTAFY_API_BASE no está configurado");
  }
  if (!adminKey) {
    throw new Error("VITE_RUTAFY_ADMIN_KEY no está configurado");
  }

  const status = options?.status ?? "active";
  const limit = options?.limit ?? 50;

  const url = new URL(`${apiBase}/v1/admin/dispatch-alerts`);
  url.searchParams.set("status", status);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
  });

  const data = (await response.json()) as DispatchAlertsResponse & {
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      `Error al cargar alertas (${response.status})`;
    throw new Error(message);
  }

  return {
    ...data,
    items: Array.isArray(data.items) ? data.items : [],
  };
}
