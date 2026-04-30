// Simple client-side auth state (no persistence needed beyond session)
import { useState, useCallback, createContext, useContext } from "react";

export interface UserSession {
  ra: string;
  authToken: string;
  nick?: string;
  name?: string;
  rooms: Array<{ id: number; name: string }>;
}

let _session: UserSession | null = null;

export function getSession(): UserSession | null {
  return _session;
}

export function setSession(session: UserSession | null) {
  _session = session;
}

export function clearSession() {
  _session = null;
}

export function useSession() {
  const [session, _setSession] = useState<UserSession | null>(_session);

  const login = useCallback((s: UserSession) => {
    setSession(s);
    _setSession(s);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    _setSession(null);
  }, []);

  return { session, login, logout };
}
