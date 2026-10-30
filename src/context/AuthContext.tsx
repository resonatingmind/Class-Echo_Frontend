import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as SecureStore from "../lib/secureStore";

import { login, getTeacherMe, getSchoolAdminMe } from "../lib/api";
import { setUnauthorizedHandler } from "../lib/authSession";
import { forgetClassReminders } from "../lib/classReminders";
import { UserRole } from "../types/api";

const TOKEN_KEY = "auth_token";
const ROLE_KEY = "auth_role";
const STATUS_KEY = "auth_status";

type Session = {
  token: string;
  role: UserRole;
  status: string;
};

type AuthContextValue = {
  isLoading: boolean;
  session: Session | null;
  signIn: (username: string, password: string) => Promise<void>;
  signInDirect: (token: string, role: UserRole, status?: string) => void;
  signOut: () => void;
  refreshStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const role = await SecureStore.getItemAsync(ROLE_KEY);
        const status = await SecureStore.getItemAsync(STATUS_KEY);
        if (token && role && status) {
          setSession({ token, role: role as UserRole, status });
        } else if (token && role) {
          setSession({ token, role: role as UserRole, status: "active" });
        }
      } catch {
        // ignore storage errors on load
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  const persistSession = useCallback(async (token: string, role: UserRole, status: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(ROLE_KEY, role);
    await SecureStore.setItemAsync(STATUS_KEY, status);
  }, []);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const response = await login(username, password);
      let status = "active";
      
      if (response.role === "teacher") {
        const me = await getTeacherMe(response.access_token);
        status = me.status;
      } else if (response.role === "school_admin") {
        const me = await getSchoolAdminMe(response.access_token);
        status = me.status;
      }

      const newSession = {
        token: response.access_token,
        role: response.role,
        status,
      };
      await persistSession(newSession.token, newSession.role, newSession.status);
      setSession(newSession);
    },
    [persistSession],
  );

  const refreshStatus = useCallback(async () => {
    if (!session) return;
    try {
      let status = "active";
      if (session.role === "teacher") {
        const me = await getTeacherMe(session.token);
        status = me.status;
      } else if (session.role === "school_admin") {
        const me = await getSchoolAdminMe(session.token);
        status = me.status;
      }
      
      await persistSession(session.token, session.role, status);
      setSession(prev => prev ? { ...prev, status } : null);
    } catch {
      // ignore check errors in background
    }
  }, [session, persistSession]);

  const signInDirect = useCallback(
    async (token: string, role: UserRole, status: string = "active") => {
      await persistSession(token, role, status);
      setSession({ token, role, status });
    },
    [persistSession],
  );

  const signOut = useCallback(async () => {
    await forgetClassReminders();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(ROLE_KEY);
    await SecureStore.deleteItemAsync(STATUS_KEY);
    setSession(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo(
    () => ({
      isLoading,
      session,
      signIn,
      signInDirect,
      signOut,
      refreshStatus,
    }),
    [isLoading, session, signIn, signInDirect, signOut, refreshStatus],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
