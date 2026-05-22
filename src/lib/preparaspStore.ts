import type { PreparaSpAuth } from "./preparasp";

const AUTH_KEY = "preparasp:auth";
const ACT_KEY = "preparasp:activities";

export type ActivityStatus = "pending" | "running" | "done" | "error";

export interface Activity {
  id: string;
  subject: string;       // ARTES, ESPANHOL, HISTÓRIA…
  title: string;         // Barroco
  weekday: number;       // 0=Dom … 6=Sáb
  quizId: string;
  questionIds: string[];
  status: ActivityStatus;
  lastMessage?: string;
}

export const SUBJECTS: { id: string; label: string; color: string; emoji: string }[] = [
  { id: "ARTES",      label: "Artes",      color: "#f59e0b", emoji: "🎨" },
  { id: "ESPANHOL",   label: "Espanhol",   color: "#a855f7", emoji: "🇪🇸" },
  { id: "HISTORIA",   label: "História",   color: "#8b5cf6", emoji: "📜" },
  { id: "FILOSOFIA",  label: "Filosofia",  color: "#06b6d4", emoji: "🏛️" },
  { id: "GEOGRAFIA",  label: "Geografia",  color: "#10b981", emoji: "🌎" },
  { id: "MATEMATICA", label: "Matemática", color: "#3b82f6", emoji: "📐" },
  { id: "PORTUGUES",  label: "Português",  color: "#ef4444", emoji: "📖" },
  { id: "BIOLOGIA",   label: "Biologia",   color: "#22c55e", emoji: "🧬" },
  { id: "QUIMICA",    label: "Química",    color: "#eab308", emoji: "⚗️" },
  { id: "FISICA",     label: "Física",     color: "#f43f5e", emoji: "🪐" },
  { id: "INGLES",     label: "Inglês",     color: "#0ea5e9", emoji: "🇬🇧" },
  { id: "SOCIOLOGIA", label: "Sociologia", color: "#ec4899", emoji: "👥" },
];

export function subjectMeta(id: string) {
  return SUBJECTS.find((s) => s.id === id) ?? { id, label: id, color: "#64748b", emoji: "📚" };
}

export function loadAuth(): PreparaSpAuth | null {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch { return null; }
}
export function saveAuth(a: PreparaSpAuth | null) {
  if (!a) localStorage.removeItem(AUTH_KEY);
  else localStorage.setItem(AUTH_KEY, JSON.stringify(a));
}

export function loadActivities(): Activity[] {
  try {
    const v = JSON.parse(localStorage.getItem(ACT_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
export function saveActivities(list: Activity[]) {
  localStorage.setItem(ACT_KEY, JSON.stringify(list));
}

export const WEEKDAYS = [
  { short: "DOM", long: "Domingo" },
  { short: "SEG", long: "Segunda-feira" },
  { short: "TER", long: "Terça-feira" },
  { short: "QUA", long: "Quarta-feira" },
  { short: "QUI", long: "Quinta-feira" },
  { short: "SEX", long: "Sexta-feira" },
  { short: "SÁB", long: "Sábado" },
];

/** Datas (números) da semana atual a partir de Domingo. */
export function currentWeek(base = new Date()): Date[] {
  const start = new Date(base);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
