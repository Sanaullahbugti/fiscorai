import { STORAGE_KEYS } from "@/constants";

const BUILD_ID_KEY = STORAGE_KEYS.buildId;

export function currentBuildId(): string {
  return String(import.meta.env.VITE_BUILD_ID || "dev");
}

function expireCookie(name: string, domain?: string) {
  const base = `${encodeURIComponent(name)}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;max-age=0;path=/`;
  document.cookie = domain ? `${base};domain=${domain}` : base;
}

/** Drop non-HttpOnly cookies on this host and parent domain. */
export function clearBrowserCookies() {
  if (typeof document === "undefined") return;
  const host = window.location.hostname;
  const names = document.cookie
    .split(";")
    .map((part) => part.split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name));

  for (const name of names) {
    expireCookie(name);
    expireCookie(name, host);
    if (host.includes(".")) expireCookie(name, `.${host}`);
    const parts = host.split(".");
    if (parts.length >= 2) expireCookie(name, `.${parts.slice(-2).join(".")}`);
  }
}

async function dropServiceWorkersAndCaches() {
  if (typeof navigator !== "undefined" && navigator.serviceWorker?.getRegistrations) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
  }
  if (typeof caches !== "undefined") {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

/**
 * When a new web build is live, wipe cookies and stored auth so the next
 * paint cannot reuse a stale session. Returns true if a reload was triggered
 * so the caller can skip mounting React on the old bundle.
 */
export function applyFreshClientBuild(): boolean {
  if (typeof window === "undefined") return false;
  const buildId = currentBuildId();
  const previous = window.localStorage.getItem(BUILD_ID_KEY);
  if (previous === buildId) return false;

  const hadSession = Boolean(previous) || Boolean(window.localStorage.getItem(STORAGE_KEYS.accessToken));
  clearBrowserCookies();
  window.sessionStorage.clear();
  window.localStorage.clear();
  window.localStorage.setItem(BUILD_ID_KEY, buildId);
  void dropServiceWorkersAndCaches();

  if (hadSession) {
    window.location.reload();
    return true;
  }
  return false;
}
