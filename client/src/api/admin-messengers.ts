import { adminHttp, parseAdminApiError } from "@/api/adminHttp";
import axios from "axios";

export type AdminMessenger = {
  id: string;
  user_id?: string | null;
  full_name: string;
  phone: string;
  plate?: string | null;
  vehicle_type?: string | null;
  doc_type?: string | null;
  doc_number?: string | null;
  availability_status?: string | null;
  is_active: boolean;
  current_node_name?: string | null;
  created_at?: string | null;
};

export type AdminMessengersListResponse = {
  trace_id?: string;
  items?: AdminMessenger[];
  mensajeros?: AdminMessenger[];
  limit?: number;
};

export type GetAdminMessengersOptions = {
  limit?: number;
  is_active?: "all" | "true" | "false";
};

export type CreateAdminMessengerPayload = {
  full_name: string;
  phone: string;
  password: string;
  doc_type?: string;
  doc_number?: string;
  vehicle_type?: string;
  plate?: string;
};

export type UpdateAdminMessengerPayload = {
  full_name?: string;
  is_active?: boolean;
  doc_type?: string;
  doc_number?: string;
  vehicle_type?: string;
  plate?: string;
};

function ensureApiBase(): void {
  const base = import.meta.env.VITE_RUTAFY_API_BASE;
  if (typeof base !== "string" || !base.trim()) {
    throw new Error("VITE_RUTAFY_API_BASE no está configurado");
  }
}

function normalizeMessengersList(
  data: AdminMessengersListResponse,
): AdminMessenger[] {
  const raw = data.items ?? data.mensajeros ?? [];
  return Array.isArray(raw) ? raw : [];
}

export async function getAdminMessengers(
  options?: GetAdminMessengersOptions,
): Promise<AdminMessenger[]> {
  ensureApiBase();
  const limit = options?.limit ?? 100;
  const isActive = options?.is_active ?? "all";

  try {
    const { data } = await adminHttp.get<AdminMessengersListResponse>(
      "/v1/admin/mensajeros",
      { params: { limit, is_active: isActive } },
    );
    return normalizeMessengersList(data);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al cargar mensajeros (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}

export async function createAdminMessenger(
  payload: CreateAdminMessengerPayload,
): Promise<unknown> {
  ensureApiBase();

  const body: Record<string, string> = {
    full_name: payload.full_name.trim(),
    phone: payload.phone.trim(),
    password: payload.password,
  };
  if (payload.doc_type?.trim()) body.doc_type = payload.doc_type.trim();
  if (payload.doc_number?.trim()) body.doc_number = payload.doc_number.trim();
  if (payload.vehicle_type?.trim()) body.vehicle_type = payload.vehicle_type.trim();
  if (payload.plate?.trim()) body.plate = payload.plate.trim();

  try {
    const { data } = await adminHttp.post("/v1/admin/mensajeros", body);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al crear mensajero (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}

export async function updateAdminMessenger(
  id: string,
  payload: UpdateAdminMessengerPayload,
): Promise<unknown> {
  ensureApiBase();
  const messengerId = id.trim();
  if (!messengerId) {
    throw new Error("id de mensajero inválido");
  }

  const body: Record<string, string | boolean> = {};
  if (payload.full_name !== undefined) body.full_name = payload.full_name.trim();
  if (payload.is_active !== undefined) body.is_active = payload.is_active;
  if (payload.doc_type !== undefined) body.doc_type = payload.doc_type.trim();
  if (payload.doc_number !== undefined) body.doc_number = payload.doc_number.trim();
  if (payload.vehicle_type !== undefined) {
    body.vehicle_type = payload.vehicle_type.trim();
  }
  if (payload.plate !== undefined) body.plate = payload.plate.trim();

  try {
    const { data } = await adminHttp.patch(
      `/v1/admin/mensajeros/${encodeURIComponent(messengerId)}`,
      body,
    );
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        parseAdminApiError(
          err.response.data as { error?: string; message?: string },
          `Error al actualizar mensajero (${err.response.status})`,
        ),
      );
    }
    throw err;
  }
}
