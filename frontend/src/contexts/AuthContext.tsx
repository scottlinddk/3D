import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { getApiBase } from "@/lib/apiBase";

export interface GarminUser {
  garmin_user_id: string;
  display_name: string;
}

interface AuthState {
  user: GarminUser | null;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: async () => {},
});

const SESSION_KEY = "garmin_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GarminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async (token: string): Promise<GarminUser | null> => {
    try {
      const res = await fetch(`${getApiBase()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as GarminUser;
    } catch {
      return null;
    }
  }, []);

  // On mount: check for session token in URL (post-OAuth redirect) or localStorage
  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const urlSession = params.get("session");
      const urlError = params.get("error");

      if (urlSession) {
        localStorage.setItem(SESSION_KEY, urlSession);
        // Clean the URL
        const clean = window.location.pathname;
        window.history.replaceState({}, "", clean);
      }

      if (urlError) {
        const clean = window.location.pathname;
        window.history.replaceState({}, "", clean);
      }

      const token = localStorage.getItem(SESSION_KEY);
      if (token) {
        const me = await fetchMe(token);
        if (me) {
          setUser(me);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }

      setIsLoading(false);
    }

    init();
  }, [fetchMe]);

  const login = useCallback(() => {
    window.location.href = `${getApiBase()}/api/auth/garmin/login`;
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(SESSION_KEY);
    if (token) {
      await fetch(`${getApiBase()}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
      localStorage.removeItem(SESSION_KEY);
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
