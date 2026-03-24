/**
 * Shape estable expuesto a la UI tras GET /v1/auth/me (y normalización defensiva).
 */

export type AuthUser = {
  id: string | number;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  /** Compatible con AdminLayout: "admin" | "user" */
  role: string;
  appRole: "ADMIN" | "TRANSPORTISTA" | "MENSAJERO";
  actor_id: string | null;
  actor_type: string | null;
};

function pickStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function upper(v: string | null): string {
  return (v || "").toUpperCase();
}

/** Clave usada por useAuth para persistir el usuario en runtime (devtools / hidratación). */
export const RUNTIME_USER_INFO_KEY = "manus-runtime-user-info";

/**
 * Lee y normaliza el usuario cacheado en localStorage (misma clave que escribe useAuth).
 * Útil para hidratar estado antes de que GET /v1/auth/me responda.
 */
export function readCachedAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RUNTIME_USER_INFO_KEY);
    if (raw == null || raw === "" || raw === "null") return null;
    const parsed: unknown = JSON.parse(raw);
    return normalizeAuthUser(parsed);
  } catch {
    return null;
  }
}

/**
 * Convierte la respuesta de /v1/auth/me (o objeto análogo) a AuthUser.
 * Shape real típico: { user: { user_id, role, actor_type, actor_id, ... } } (sin `session`).
 * También acepta raíz plana o envoltorio `data`.
 */
export function normalizeAuthUser(raw: unknown): AuthUser | null {
  if (!raw || typeof raw !== "object") return null;

  let o = raw as Record<string, unknown>;
  if (
    o.data &&
    typeof o.data === "object" &&
    !pickStr(o.sub) &&
    o.id === undefined &&
    !(o.user && typeof o.user === "object")
  ) {
    o = o.data as Record<string, unknown>;
  }

  const u =
    o.user && typeof o.user === "object"
      ? (o.user as Record<string, unknown>)
      : o;

  const subLike =
    pickStr(u.user_id) ??
    pickStr(u.sub) ??
    (u.id != null ? pickStr(u.id) : null);

  if (!subLike) return null;

  const user_id = subLike;
  const idVal = u.id !== undefined && u.id !== null ? u.id : user_id;

  const name = pickStr(u.name);
  const email = pickStr(u.email);
  const phone = pickStr(u.phone);
  const actor_id = pickStr(u.actor_id);
  const actor_type = pickStr(u.actor_type);

  const roleRaw = upper(pickStr(u.role));
  const appRoleRaw = upper(pickStr(u.appRole));
  const actorTypeU = upper(actor_type);

  let appRole: AuthUser["appRole"] = "TRANSPORTISTA";
  if (
    appRoleRaw === "ADMIN" ||
    roleRaw === "ADMIN" ||
    actorTypeU === "ADMIN"
  ) {
    appRole = "ADMIN";
  } else if (
    appRoleRaw === "MENSAJERO" ||
    roleRaw === "MENSAJERO" ||
    actorTypeU === "MENSAJERO" ||
    actorTypeU === "MESSENGER"
  ) {
    appRole = "MENSAJERO";
  } else if (
    appRoleRaw === "TRANSPORTISTA" ||
    roleRaw === "TRANSPORTISTA" ||
    actorTypeU === "TRANSPORTISTA" ||
    actorTypeU === "TRANSPORTER"
  ) {
    appRole = "TRANSPORTISTA";
  }

  const roleForLayout =
    appRole === "ADMIN" || roleRaw === "ADMIN" ? "admin" : "user";

  return {
    id: idVal as string | number,
    user_id,
    name,
    email,
    phone,
    role: roleForLayout,
    appRole,
    actor_id,
    actor_type,
  };
}
