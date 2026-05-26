import { useState, useCallback } from "react";
import logoUrl from "@/assets/icons/logo.png";

export interface UserSession {
  ra: string;
  authToken: string;
  nick?: string;
  name?: string;
  externalId?: string;
  rooms: Array<{ id: number; name: string; icon: string; dark_icon: string }>;
}

// Logo usado como fallback quando a API não retorna icon/dark_icon
export const FALLBACK_ROOM_ICON: string = logoUrl;

const STORAGE_KEY = "sync_labs_session";
const CREDS_KEY = "sync_labs_creds";

function loadSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

let _session: UserSession | null = loadSession();

export function getSession(): UserSession | null {
  return _session;
}

export function setSession(session: UserSession | null) {
  _session = session;
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function clearSession() {
  _session = null;
  localStorage.removeItem(STORAGE_KEY);
}

// Save/load login identifier fields ONLY (never the password).
// Storing plaintext passwords in localStorage exposes them to XSS / browser
// extensions / compromised dependencies, so the password is intentionally
// omitted from persisted credentials.
export interface SavedCreds {
  raNumero: string;
  raDigito: string;
  raUf: string;
}

export function saveCreds(creds: SavedCreds) {
  const safe: SavedCreds = {
    raNumero: creds.raNumero,
    raDigito: creds.raDigito,
    raUf: creds.raUf,
  };
  localStorage.setItem(CREDS_KEY, JSON.stringify(safe));
}

export function loadCreds(): SavedCreds | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedCreds> & { pwd?: string };
    // Migration: strip any password that an older client may have stored.
    if (parsed && "pwd" in parsed) {
      const cleaned: SavedCreds = {
        raNumero: parsed.raNumero ?? "",
        raDigito: parsed.raDigito ?? "",
        raUf: parsed.raUf ?? "SP",
      };
      localStorage.setItem(CREDS_KEY, JSON.stringify(cleaned));
      return cleaned;
    }
    if (!parsed?.raNumero) return null;
    return {
      raNumero: parsed.raNumero,
      raDigito: parsed.raDigito ?? "",
      raUf: parsed.raUf ?? "SP",
    };
  } catch {}
  return null;
}

export function clearCreds() {
  localStorage.removeItem(CREDS_KEY);
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
