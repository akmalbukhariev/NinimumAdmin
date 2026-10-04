import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAdminMe, loginAdmin } from '../api/adminApi';
import { ADMIN_SESSION_EVENT, ApiError } from '../api/client';
import type { AdminUser } from '../api/types';

const SESSION_STORAGE_KEY = 'ninimum_admin_session';

interface StoredSession {
  accessToken: string;
  admin: AdminUser;
}

interface AuthContextValue {
  admin: AdminUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => void;
  sessionMessage: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.accessToken || !parsed.admin) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = readStoredSession();
  const [admin, setAdmin] = useState<AdminUser | null>(stored?.admin ?? null);
  const [accessToken, setAccessToken] = useState<string | null>(stored?.accessToken ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setAdmin(null);
    setAccessToken(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function validateSession() {
      if (!accessToken) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const currentAdmin = await getAdminMe(accessToken);
        if (cancelled) return;
        const session = { accessToken, admin: currentAdmin };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        setAdmin(currentAdmin);
      } catch (error) {
        if (!cancelled) {
          const authCodes = new Set(['ADMIN_SESSION_REPLACED', 'ADMIN_INACTIVE', '141', '200', '201', '250', '253', '410']);
          if (error instanceof ApiError && (error.message === 'NETWORK_ERROR' || !authCodes.has(error.resultCode ?? ''))) {
            // Keep the saved session during a temporary backend/network problem.
            // Protected API calls will show their own retry state.
          } else {
            clearSession();
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void validateSession();
    return () => {
      cancelled = true;
    };
  }, []); // Validate the persisted session once when the app starts.

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    let checking = false;
    const invalidate = (event: Event) => {
      const detail = (event as CustomEvent<{ token: string; code: string }>).detail;
      if (detail.token !== accessToken || cancelled) return;
      setSessionMessage(detail.code);
      clearSession();
    };
    const refresh = async () => {
      if (checking || document.visibilityState !== 'visible') return;
      checking = true;
      try {
        const profile = await getAdminMe(accessToken);
        if (!cancelled) {
          setAdmin(profile);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ accessToken, admin: profile }));
        }
      } catch { /* Network errors keep the session; explicit invalidation is handled above. */ }
      finally { checking = false; }
    };
    const onFocus = () => { void refresh(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_STORAGE_KEY) return;
      const session = readStoredSession();
      setAccessToken(session?.accessToken ?? null);
      setAdmin(session?.admin ?? null);
    };
    window.addEventListener(ADMIN_SESSION_EVENT, invalidate);
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onFocus);
    const interval = window.setInterval(onFocus, 30000);
    void refresh();
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener(ADMIN_SESSION_EVENT, invalidate);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [accessToken, clearSession]);

  const login = useCallback(async (loginId: string, password: string) => {
    const result = await loginAdmin(loginId, password);
    const currentAdmin: AdminUser = {
      id: result.id,
      login_id: result.login_id,
      name: result.name,
      role: result.role,
      status: result.status,
    };

    const session: StoredSession = {
      accessToken: result.access_token,
      admin: currentAdmin,
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    setSessionMessage(null);
    setAccessToken(result.access_token);
    setAdmin(currentAdmin);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      accessToken,
      isAuthenticated: Boolean(admin && accessToken),
      isLoading,
      login,
      logout: clearSession,
      sessionMessage,
    }),
    [admin, accessToken, isLoading, login, clearSession, sessionMessage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
