import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { UserPublic } from "@workspace/api-client-react";

const TOKEN_KEY = "nc_token";
const USER_KEY = "nc_user";

interface AuthContextValue {
  token: string | null;
  user: UserPublic | null;
  setAuth: (token: string, user: UserPublic) => void;
  clearAuth: () => void;
  updateUser: (user: UserPublic) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<UserPublic | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserPublic) : null;
  });

  const setAuth = useCallback((t: string, u: UserPublic) => {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((u: UserPublic) => {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, setAuth, clearAuth, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
