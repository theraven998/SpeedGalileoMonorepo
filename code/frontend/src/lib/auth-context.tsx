"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, isRole, ROLE_HOME, type AuthUser } from "./api";

function readStoredUser(): AuthUser | null {
  const stored = localStorage.getItem("user");
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (parsed && isRole(parsed.role)) return parsed as AuthUser;
  } catch {
    /* JSON corrupto */
  }
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  return null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Guarda una sesión ya creada (ej. tras autorregistro de estudiante) y redirige a su home. */
  setSession: (token: string, sessionUser: AuthUser) => void;
  /** Aplica cambios parciales al usuario en sesión y los persiste en localStorage. */
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Lectura única de localStorage al montar: no hay forma de sincronizar esto durante el render (SSR no tiene window).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(readStoredUser());
    setLoading(false);
  }, []);

  function setSession(token: string, sessionUser: AuthUser) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(sessionUser));
    setUser(sessionUser);
    router.push(ROLE_HOME[sessionUser.role]);
  }

  async function login(email: string, password: string) {
    const { token, user: loggedUser } = await api.login(email, password);
    setSession(token, loggedUser);
  }

  function updateUser(patch: Partial<AuthUser>) {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, setSession, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
