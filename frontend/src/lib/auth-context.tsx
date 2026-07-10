"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api, clearToken, getToken, setToken } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // starts true so consumers can show a neutral state until the token check resolves
  const [loading, setLoading] = useState(true);

  // On mount: if we have a stored token, resolve it to the current user.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.auth.me();
        if (active) setUser(me);
      } catch {
        // token invalid/expired — drop it
        clearToken();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await api.auth.login({ email, password });
    setToken(access_token);
    setUser(await api.auth.me());
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { access_token } = await api.auth.register({ name, email, password });
    setToken(access_token);
    setUser(await api.auth.me());
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
