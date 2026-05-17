// Khan integration usando o stack do khanto (cupiditys.lol):
//   - Captcha: Altcha (proof-of-work, sem secret externa)
//   - Auth: JWT retornado por /api/sso quando usamos token da SED
//   - Conclusão de atividades: chamadas síncronas em /api/complete/*
// Todas as requests externas passam pelo proxy server-side em /api/cupiditys/*

export const PROXY = "/api/cupiditys";
export const EDUSP = "https://edusp-api.ip.tv";

const LS = {
  jwt: "khan_cup_jwt",
  kaid: "khan_cup_kaid",
  profile: "khan_cup_profile",
};

export interface KhanProfile {
  kaid: string;
  username?: string;
  nickname?: string;
  [k: string]: any;
}

// ----------------- Storage helpers -----------------

export function getStoredJwt(): string | null {
  try { return localStorage.getItem(LS.jwt); } catch { return null; }
}
export function getStoredKaid(): string | null {
  try { return localStorage.getItem(LS.kaid); } catch { return null; }
}
export function getStoredProfile(): KhanProfile | null {
  try { const r = localStorage.getItem(LS.profile); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveAuth(jwt: string, kaid: string) {
  localStorage.setItem(LS.jwt, jwt);
  localStorage.setItem(LS.kaid, kaid);
}
function saveProfile(p: KhanProfile) {
  localStorage.setItem(LS.profile, JSON.stringify(p));
}
export function clearKhanSession() {
  localStorage.removeItem(LS.jwt);
  localStorage.removeItem(LS.kaid);
  localStorage.removeItem(LS.profile);
}

// ----------------- SED label token -----------------

export async function fetchSedLabelToken(authToken: string): Promise<string> {
  const r = await fetch(
    `${EDUSP}/mas/external-auth/seducsp_token/generate?card_label=Khan+Academy`,
    { headers: { "x-api-key": authToken, Accept: "application/json" } },
  );
  if (!r.ok) throw new Error(`SED HTTP ${r.status}`);
  const data = await r.json();
  const token =
    data?.token ||
    data?.access_token ||
    (typeof data?.redirect === "string"
      ? new URL(data.redirect).searchParams.get("token")
      : null);
  if (!token) throw new Error("SED não retornou token");
  return token as string;
}

// ----------------- Altcha -----------------

export const ALTCHA_CHALLENGE_URL = `${PROXY}/task/captcha/challenge`;

// Verifica payload do altcha-widget e devolve token usável no /api/token
export async function verifyAltcha(payload: string): Promise<string> {
  const r = await fetch(`${PROXY}/task/captcha/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  if (!r.ok) throw new Error(`Altcha verify HTTP ${r.status}`);
  const data = await r.json();
  if (!data?.token) throw new Error("Altcha não retornou token");
  return data.token as string;
}

// ----------------- Auth (token swap) -----------------

export async function loginCupiditys(
  labelToken: string,
  captchaToken: string,
): Promise<{ jwt: string; kaid: string }> {
  const r = await fetch(`${PROXY}/khan/api/sso`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: labelToken,
      captchaToken,
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data?.success) {
    throw new Error(data?.error || `Login HTTP ${r.status}`);
  }
  saveAuth(data.jwt, data.kaid);
  return { jwt: data.jwt, kaid: data.kaid };
}

// ----------------- Authed API helper -----------------

async function api<T = any>(jwt: string, path: string, payload: unknown = {}): Promise<T> {
  const r = await fetch(`${PROXY}/khan/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || `${path} HTTP ${r.status}`);
  return data as T;
}

export async function fetchProfile(jwt: string): Promise<KhanProfile> {
  const data = await api<any>(jwt, "/profile", {});
  const profile: KhanProfile = data?.profile || data?.user || data;
  if (!profile?.kaid) throw new Error("Perfil sem kaid");
  saveProfile(profile);
  return profile;
}

// ----------------- Cursos / Unidades / Lições -----------------

export interface CupCourse {
  id: string;
  title: string;
  iconPath?: string;
  relativeUrl?: string;
  percentage?: number;
  [k: string]: any;
}
export interface CupUnit {
  id: string;
  title: string;
  relativeUrl?: string;
  percentage?: number;
  [k: string]: any;
}
export interface CupLessonItem {
  id: string;
  title: string;
  type?: string; // "Lesson" | "Quiz" | "UnitTest" | "CourseChallenge"
  relativeUrl?: string;
  positionKey?: string;
  completionStatus?: string;
  [k: string]: any;
}
export interface CupContentItem {
  id: string;
  title: string;
  type?: string; // "Exercise" | "Video" | "Article"
  slug?: string;
  videoSlug?: string;
  articleSlug?: string;
  topicId?: string;
  completionStatus?: string;
  [k: string]: any;
}

export async function fetchCourses(jwt: string): Promise<CupCourse[]> {
  const data = await api<any>(jwt, "/courses", {});
  return (data?.courses || data?.list || data || []) as CupCourse[];
}

export async function fetchUnits(jwt: string, courseId: string): Promise<CupUnit[]> {
  const data = await api<any>(jwt, "/units", { courseId });
  return (data?.units || []) as CupUnit[];
}

export async function fetchUnit(
  jwt: string,
  unitId: string,
  unitPath?: string,
): Promise<{
  lessons: CupLessonItem[];
  quizzes: CupLessonItem[];
  unitTests: CupLessonItem[];
}> {
  const data = await api<any>(jwt, "/unit", { unitId, unitPath: unitPath || "" });
  return {
    lessons: (data?.lessons || []) as CupLessonItem[],
    quizzes: (data?.quizzes || []) as CupLessonItem[],
    unitTests: (data?.unitTests || []) as CupLessonItem[],
  };
}

export async function fetchLesson(
  jwt: string,
  lessonId: string,
  unitId: string,
): Promise<{
  exercises: CupContentItem[];
  videos: CupContentItem[];
  articles: CupContentItem[];
}> {
  const data = await api<any>(jwt, "/lesson", { lessonId, unitId });
  return {
    exercises: (data?.exercises || []) as CupContentItem[],
    videos: (data?.videos || []) as CupContentItem[],
    articles: (data?.articles || []) as CupContentItem[],
  };
}

// ----------------- Conclusão (síncrono) -----------------

export async function completeExercise(jwt: string, exerciseId: string, topicId: string) {
  return api(jwt, "/complete/exercise", { exerciseId, topicId });
}
export async function completeVideo(jwt: string, videoId: string, videoSlug: string) {
  return api(jwt, "/complete/video", { videoId, videoSlug });
}
export async function completeArticle(jwt: string, articleId: string, articleSlug: string, topicId: string) {
  return api(jwt, "/complete/article", { articleId, articleSlug, topicId });
}
export async function completeQuiz(jwt: string, topicId: string, positionKey: string) {
  return api(jwt, "/complete/quiz", { topicId, positionKey });
}
export async function completeUnitTest(jwt: string, topicId: string) {
  return api(jwt, "/complete/unit-test", { topicId });
}
export async function completeCourseChallenge(jwt: string, courseId: string) {
  return api(jwt, "/complete/course-challenge", { courseId });
}
