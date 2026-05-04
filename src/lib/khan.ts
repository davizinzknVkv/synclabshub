// Khan Academy auto-completer via CrimsonZero compatible endpoints.
// Login flow:
//   1. GET /api/proxy/mas/external-auth/seducsp_token/generate?card_label=Khan+Academy
//      with header X-Api-Key: <EDUSP authToken>  -> returns Khan token
//   2. POST /api/khan/sso  { token }            -> returns Khan Bearer (with KAAL cookies)
// Then with Bearer:
//   POST /api/khan/profile
//   POST /api/khan/courses
//   POST /api/khan/units    { courseId }
//   POST /api/khan/unit     { unitId, unitPath }
//   POST /api/khan/lesson   { lessonId, unitId }
//   POST /api/khan/complete/exercise  { exerciseId, topicId }
//   POST /api/khan/complete/video     { videoId, videoSlug }
//   POST /api/khan/complete/quiz      { topicId, positionKey }
//   POST /api/khan/complete/unit-test { topicId }

const KHAN_KEY = "sync_labs_khan";

export interface KhanSession {
  bearer: string;
  obtainedAt: number;
}

export function loadKhanSession(): KhanSession | null {
  try {
    const raw = localStorage.getItem(KHAN_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
export function saveKhanSession(s: KhanSession | null) {
  if (s) localStorage.setItem(KHAN_KEY, JSON.stringify(s));
  else localStorage.removeItem(KHAN_KEY);
}

async function jpost<T = any>(url: string, body: unknown, bearer?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { return {} as T; }
}

/** Get Khan SSO token from EDUSP using existing edusp authToken. */
export async function getKhanTokenFromEdusp(eduspAuthToken: string): Promise<string> {
  const r = await fetch(
    `/api/proxy/mas/external-auth/seducsp_token/generate?card_label=Khan+Academy`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": eduspAuthToken,
        "x-api-realm": "edusp",
        "x-api-platform": "webclient",
      },
    },
  );
  const text = await r.text();
  if (!r.ok) throw new Error(`Khan token failed: HTTP ${r.status}: ${text.slice(0, 200)}`);
  let data: any = {};
  try { data = JSON.parse(text); } catch {}
  // Possible fields: token, redirect, url
  const token =
    data?.token ||
    data?.access_token ||
    (typeof data?.redirect === "string" ? new URL(data.redirect).searchParams.get("token") : null) ||
    (typeof data?.url === "string" ? new URL(data.url).searchParams.get("token") : null);
  if (!token) throw new Error("Token Khan não encontrado na resposta da SED");
  return token;
}

/** Exchange Khan token for the CrimsonZero Bearer (with KAAL cookies). */
export async function khanSsoLogin(khanToken: string): Promise<KhanSession> {
  const data = await jpost<any>("/api/khan/sso", { token: khanToken });
  const bearer = data?.token || data?.bearer || data?.access_token;
  if (!bearer) throw new Error("Bearer Khan não retornado pelo SSO");
  const session: KhanSession = { bearer, obtainedAt: Date.now() };
  saveKhanSession(session);
  return session;
}

/** Convenience: full login from EDUSP authToken. */
export async function khanLogin(eduspAuthToken: string): Promise<KhanSession> {
  const t = await getKhanTokenFromEdusp(eduspAuthToken);
  return khanSsoLogin(t);
}

export async function khanProfile(bearer: string) {
  return jpost<any>("/api/khan/profile", {}, bearer);
}

export interface KhanCourse {
  id: string;
  title?: string;
  slug?: string;
  [k: string]: unknown;
}
export async function khanCourses(bearer: string): Promise<KhanCourse[]> {
  const data = await jpost<any>("/api/khan/courses", {}, bearer);
  return data?.courses || data?.data || (Array.isArray(data) ? data : []);
}

export interface KhanUnit {
  id: string;
  unitPath?: string;
  path?: string;
  title?: string;
  lessons?: Array<KhanLesson>;
  [k: string]: unknown;
}
export async function khanUnits(bearer: string, courseId: string): Promise<KhanUnit[]> {
  const data = await jpost<any>("/api/khan/units", { courseId }, bearer);
  return data?.units || data?.data || (Array.isArray(data) ? data : []);
}

export interface KhanLesson {
  id: string;
  title?: string;
  items?: Array<KhanItem>;
  [k: string]: unknown;
}
export async function khanUnit(
  bearer: string,
  unitId: string,
  unitPath: string,
): Promise<{ lessons: KhanLesson[]; quizzes?: any[]; unitTest?: any; raw: any }> {
  const data = await jpost<any>("/api/khan/unit", { unitId, unitPath }, bearer);
  const lessons = data?.lessons || data?.topics || [];
  return { lessons, quizzes: data?.quizzes, unitTest: data?.unitTest || data?.unit_test, raw: data };
}

export interface KhanItem {
  type?: string;        // "exercise" | "video" | "quiz" | ...
  id?: string;
  exerciseId?: string;
  videoId?: string;
  videoSlug?: string;
  positionKey?: string;
  topicId?: string;
  [k: string]: unknown;
}
export async function khanLesson(
  bearer: string,
  lessonId: string,
  unitId: string,
): Promise<{ items: KhanItem[]; raw: any }> {
  const data = await jpost<any>("/api/khan/lesson", { lessonId, unitId }, bearer);
  const items: KhanItem[] = data?.items || data?.contents || data?.children || [];
  return { items, raw: data };
}

export async function completeExercise(bearer: string, exerciseId: string, topicId: string) {
  return jpost<any>("/api/khan/complete/exercise", { exerciseId, topicId }, bearer);
}
export async function completeVideo(bearer: string, videoId: string, videoSlug: string) {
  return jpost<any>("/api/khan/complete/video", { videoId, videoSlug }, bearer);
}
export async function completeQuiz(bearer: string, topicId: string, positionKey: string) {
  return jpost<any>("/api/khan/complete/quiz", { topicId, positionKey }, bearer);
}
export async function completeUnitTest(bearer: string, topicId: string) {
  return jpost<any>("/api/khan/complete/unit-test", { topicId }, bearer);
}

export interface RunProgress {
  total: number;
  done: number;
  ok: number;
  failed: number;
}

/**
 * Complete every lesson item, every quiz and the unit-test of a single unit.
 * onProgress is called between requests.
 */
export async function completeUnit(
  bearer: string,
  course: KhanCourse,
  unit: KhanUnit,
  onLog: (msg: string) => void,
  delayMs = 400,
): Promise<RunProgress> {
  const progress: RunProgress = { total: 0, done: 0, ok: 0, failed: 0 };
  const unitPath = (unit.unitPath || unit.path || "") as string;
  const unitId = unit.id;
  onLog(`UNIDADE: ${unit.title || unitId}`);
  const { lessons, quizzes, unitTest } = await khanUnit(bearer, unitId, unitPath);

  // Pre-count by walking lessons
  const lessonItemBuckets: Array<{ lesson: KhanLesson; items: KhanItem[] }> = [];
  for (const lesson of lessons) {
    try {
      const { items } = await khanLesson(bearer, lesson.id, unitId);
      lessonItemBuckets.push({ lesson, items });
      progress.total += items.length;
    } catch (e) {
      onLog(`✗ Lição ${lesson.title || lesson.id}: ${(e as Error).message}`);
    }
    await sleep(delayMs);
  }
  if (Array.isArray(quizzes)) progress.total += quizzes.length;
  if (unitTest) progress.total += 1;

  for (const { lesson, items } of lessonItemBuckets) {
    for (const it of items) {
      try {
        const type = (it.type || "").toLowerCase();
        if (type.includes("video") || it.videoSlug) {
          await completeVideo(bearer, (it.videoId || it.id) as string, (it.videoSlug || "") as string);
        } else if (type.includes("exercise") || it.exerciseId) {
          await completeExercise(bearer, (it.exerciseId || it.id) as string, lesson.id);
        } else if (type.includes("quiz") && it.positionKey) {
          await completeQuiz(bearer, unitId, it.positionKey as string);
        } else if (it.exerciseId) {
          await completeExercise(bearer, it.exerciseId, lesson.id);
        } else {
          throw new Error(`Tipo desconhecido: ${type || "?"}`);
        }
        progress.ok++;
        onLog(`✓ ${lesson.title || lesson.id} → ${it.title || it.id || type}`);
      } catch (e) {
        progress.failed++;
        onLog(`✗ ${lesson.title || lesson.id} → ${(e as Error).message}`);
      }
      progress.done++;
      await sleep(delayMs);
    }
  }

  if (Array.isArray(quizzes)) {
    for (const q of quizzes) {
      try {
        await completeQuiz(bearer, unitId, q.positionKey || q.position_key);
        progress.ok++;
        onLog(`✓ Quiz ${q.title || q.positionKey}`);
      } catch (e) {
        progress.failed++;
        onLog(`✗ Quiz: ${(e as Error).message}`);
      }
      progress.done++;
      await sleep(delayMs);
    }
  }
  if (unitTest) {
    try {
      await completeUnitTest(bearer, unitId);
      progress.ok++;
      onLog(`✓ Teste de unidade`);
    } catch (e) {
      progress.failed++;
      onLog(`✗ Teste de unidade: ${(e as Error).message}`);
    }
    progress.done++;
  }

  onLog(`UNIDADE FINALIZADA: ${progress.ok}/${progress.total}`);
  return progress;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
