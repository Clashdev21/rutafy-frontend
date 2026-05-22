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

function ensureAdminConfig(): { apiBase: string; adminKey: string } {
  const apiBase = getApiBase();
  const adminKey = getAdminKey();
  if (!apiBase) {
    throw new Error("VITE_RUTAFY_API_BASE no está configurado");
  }
  if (!adminKey) {
    throw new Error("VITE_RUTAFY_ADMIN_KEY no está configurado");
  }
  return { apiBase, adminKey };
}

function parseErrorMessage(
  data: { error?: string; message?: string } | null,
  fallback: string,
): string {
  return data?.error || data?.message || fallback;
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
  const { apiBase, adminKey } = ensureAdminConfig();
  const limit = options?.limit ?? 100;
  const isActive = options?.is_active ?? "all";

  const url = new URL(`${apiBase}/v1/admin/mensajeros`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("is_active", isActive);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
  });

  const data = (await response.json()) as AdminMessengersListResponse & {
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      parseErrorMessage(data, `Error al cargar mensajeros (${response.status})`),
    );
  }

  return normalizeMessengersList(data);
}

export async function createAdminMessenger(
  payload: CreateAdminMessengerPayload,
): Promise<unknown> {
  const { apiBase, adminKey } = ensureAdminConfig();

  const body: Record<string, string> = {
    full_name: payload.full_name.trim(),
    phone: payload.phone.trim(),
    password: payload.password,
  };
  if (payload.doc_type?.trim()) body.doc_type = payload.doc_type.trim();
  if (payload.doc_number?.trim()) body.doc_number = payload.doc_number.trim();
  if (payload.vehicle_type?.trim()) body.vehicle_type = payload.vehicle_type.trim();
  if (payload.plate?.trim()) body.plate = payload.plate.trim();

  const response = await fetch(`${apiBase}/v1/admin/mensajeros`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as { error?: string; message?: string };

  if (!response.ok) {
    throw new Error(
      parseErrorMessage(data, `Error al crear mensajero (${response.status})`),
    );
  }

  return data;
}

export async function updateAdminMessenger(
  id: string,
  payload: UpdateAdminMessengerPayload,
): Promise<unknown> {
  const { apiBase, adminKey } = ensureAdminConfig();
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

  const response = await fetch(
    `${apiBase}/v1/admin/mensajeros/${encodeURIComponent(messengerId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify(body),
    },
  );

  const data = (await response.json()) as { error?: string; message?: string };

  if (!response.ok) {
    throw new Error(
      parseErrorMessage(
        data,
        `Error al actualizar mensajero (${response.status})`,
      ),
    );
  }

  return data;
}
