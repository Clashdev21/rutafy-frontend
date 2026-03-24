export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Base API URL (desde Vite env)
export const API_BASE = import.meta.env.VITE_RUTAFY_API_BASE || "";

// Debug rápido para confirmar que Vite está leyendo el env
console.log("Rutafy API BASE:", API_BASE);

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
const appId = import.meta.env.VITE_APP_ID;

// 🔒 Protección: si OAuth no está configurado aún,
// simplemente no redirigimos a ningún portal externo
if (!oauthPortalUrl || !appId) {
console.warn("OAuth no configurado, usando login local temporal.");
return "/login";
}

const redirectUri = `${window.location.origin}/api/oauth/callback`;
const state = btoa(redirectUri);

const url = new URL(`${oauthPortalUrl}/app-auth`);
url.searchParams.set("appId", appId);
url.searchParams.set("redirectUri", redirectUri);
url.searchParams.set("state", state);
url.searchParams.set("type", "signIn");

return url.toString();
};
