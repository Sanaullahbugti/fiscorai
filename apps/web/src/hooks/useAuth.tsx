import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi, subscriptionsApi } from "@/api";
import { STORAGE_KEYS, SESSION_IDLE_MS } from "@/constants";
import type { AuthUser } from "@/types/api";

type AuthState = {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, username: string, password: string, plan?: string) => Promise<void>;
  logout: () => void;
  touch: () => void;
  /** Re-fetch subscription from API and patch auth/localStorage so the shell plan updates. */
  refreshSubscription: () => Promise<AuthUser["userSubscription"] | null>;
};

const Ctx = createContext<AuthState | null>(null);

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function persistUser(next: AuthUser) {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(next));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadUser());

  const touch = () => localStorage.setItem(STORAGE_KEYS.lastActive, String(Date.now()));

  useEffect(() => {
    const last = Number(localStorage.getItem(STORAGE_KEYS.lastActive) || 0);
    if (last && Date.now() - last > SESSION_IDLE_MS) {
      localStorage.clear();
      setUser(null);
    }
    const onActivity = () => touch();
    window.addEventListener("mousedown", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      window.removeEventListener("mousedown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      touch,
      async login(email, password) {
        const { data } = await authApi.login(email, password);
        const payload = data.data!;
        localStorage.setItem(STORAGE_KEYS.accessToken, payload.jwtToken);
        if (payload.refreshToken) localStorage.setItem(STORAGE_KEYS.refreshToken, payload.refreshToken);
        const next = { ...payload, email };
        persistUser(next);
        touch();
        setUser(next);
        return next;
      },
      async register(email, username, password, plan) {
        await authApi.register({ email, username, password, plan });
      },
      logout() {
        localStorage.removeItem(STORAGE_KEYS.accessToken);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        localStorage.removeItem(STORAGE_KEYS.user);
        setUser(null);
      },
      async refreshSubscription() {
        const res = await subscriptionsApi.current();
        const sub = res.data.data;
        if (!sub) return null;
        setUser((prev) => {
          if (!prev) return prev;
          const next: AuthUser = {
            ...prev,
            userSubscription: {
              plan: sub.plan,
              price: sub.price,
              active: sub.active,
              expiresAt: sub.expiresAt ?? null,
            },
          };
          persistUser(next);
          return next;
        });
        return {
          plan: sub.plan,
          price: sub.price,
          active: sub.active,
          expiresAt: sub.expiresAt ?? null,
        };
      },
    }),
    [user],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
