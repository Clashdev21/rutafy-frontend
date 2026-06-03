import { adminHttp, adminRefreshHttp } from "@/api/adminHttp";
import {
  clearAdminSession,
  getAdminRefreshToken,
  setAdminAccessToken,
  setAdminRefreshToken,
  setAdminUser,
} from "@/authAdminStorage";

export type AdminUser = {
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
};

type LoginResponse = {
  access_token?: string;
  accessToken?: string;
  refresh_token?: string;
  refreshToken?: string;
  user?: Record<string, unknown>;
};

function pickStr(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

export function normalizeAdminUser(raw: unknown): AdminUser | null {
  if (!raw || typeof raw !== "object") return null;

  let o = raw as Record<string, unknown>;
  if (o.data && typeof o.data === "object") {
    o = o.data as Record<string, unknown>;
  }

  const u =
    o.user && typeof o.user === "object"
      ? (o.user as Record<string, unknown>)
      : o;

  const userId =
    pickStr(u.user_id) ?? pickStr(u.sub) ?? (u.id != null ? pickStr(u.id) : null);
  if (!userId) return null;

  const role = String(u.role ?? "").trim().toLowerCase();
  if (role !== "admin") return null;

  return {
    user_id: userId,
    name: pickStr(u.name),
    email: pickStr(u.email),
    phone: pickStr(u.phone),
    role: "admin",
  };
}

function persistTokensFromLogin(data: LoginResponse): string | null {
  const access = data.access_token ?? data.accessToken;
  if (typeof access !== "string" || !access.trim()) return null;

  setAdminAccessToken(access);
  const refresh = data.refresh_token ?? data.refreshToken;
  if (typeof refresh === "string" && refresh.trim()) {
    setAdminRefreshToken(refresh);
  }
  return access.trim();
}

export async function adminLogin(
  phone: string,
  password: string,
): Promise<AdminUser> {
  const { data } = await adminHttp.post<LoginResponse>(
    "/v1/admin/auth/login",
    { phone: phone.trim(), password },
    { skipAdminRefresh: true },
  );

  if (!persistTokensFromLogin(data)) {
    throw new Error("invalid_credentials");
  }

  const user = normalizeAdminUser(data.user);
  if (!user) {
    clearAdminSession();
    throw new Error("not_admin");
  }

  setAdminUser(user);
  return user;
}

export async function adminRefresh(
  refreshToken: string,
): Promise<{ access_token: string; refresh_token?: string }> {
  const { data } = await adminRefreshHttp.post<LoginResponse>(
    "/v1/admin/auth/refresh",
    { refresh_token: refreshToken },
  );

  const access = data.access_token ?? data.accessToken;
  if (typeof access !== "string" || !access.trim()) {
    throw new Error("invalid_refresh_token");
  }

  setAdminAccessToken(access);
  const refresh = data.refresh_token ?? data.refreshToken;
  if (typeof refresh === "string" && refresh.trim()) {
    setAdminRefreshToken(refresh);
  }

  return {
    access_token: access.trim(),
    refresh_token:
      typeof refresh === "string" && refresh.trim() ? refresh.trim() : undefined,
  };
}

export async function adminLogout(): Promise<void> {
  const refresh = getAdminRefreshToken();
  try {
    if (refresh) {
      await adminHttp.post(
        "/v1/admin/auth/logout",
        { refresh_token: refresh },
        { skipAdminRefresh: true },
      );
    }
  } catch {
    /* siempre limpiar sesión local */
  } finally {
    clearAdminSession();
  }
}

export async function adminMe(): Promise<AdminUser> {
  const { data } = await adminHttp.get<unknown>("/v1/admin/auth/me");
  const user = normalizeAdminUser(data);
  if (!user) {
    throw new Error("not_admin");
  }
  setAdminUser(user);
  return user;
}
