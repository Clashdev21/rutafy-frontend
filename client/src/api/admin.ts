import { adminHttp, parseAdminApiError } from "@/api/adminHttp";
import axios from "axios";

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

function ensureApiBase(): void {
  const base = import.meta.env.VITE_RUTAFY_API_BASE;
  if (typeof base !== "string" || !base.trim()) {
    throw new Error("VITE_RUTAFY_API_BASE no está configurado");
  }
}

export async function getDispatchAlerts(
  options?: GetDispatchAlertsOptions,
): Promise<DispatchAlertsResponse> {
  ensureApiBase();

  const status = options?.status ?? "active";
  const limit = options?.limit ?? 50;

  try {
    const { data } = await adminHttp.get<DispatchAlertsResponse>(
      "/v1/admin/dispatch-alerts",
      { params: { status, limit } },
    );
    return {
      ...data,
      items: Array.isArray(data.items) ? data.items : [],
    };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar alertas (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}

export async function redispatchService(
  serviceId: string,
  note?: string,
): Promise<unknown> {
  ensureApiBase();
  const id = serviceId.trim();
  if (!id) {
    throw new Error("service_id inválido");
  }

  try {
    const { data } = await adminHttp.post(
      `/v1/admin/services/${encodeURIComponent(id)}/redispatch`,
      { note: note ?? "" },
    );
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error en redispatch (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}
