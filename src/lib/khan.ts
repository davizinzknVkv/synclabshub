// Khanto (khan.cupiditys.lol) auto-completer.
//
// Flow:
//   1. Solve altcha PoW captcha at khan.cupiditys.lol/captcha/challenge → captchaToken
//   2. GET edusp-api.ip.tv/mas/external-auth/seducsp_token/generate?card_label=Khan+Academy
//      with x-api-key = EDUSP authToken → Khan SSO token
//   3. POST /api/khan/sso { token, captchaToken } → { token: <Bearer> }
//   4. With Bearer:
//      POST /api/khan/profile
//      POST /api/khan/courses
//      POST /api/khan/units    { courseId }
//      POST /api/khan/unit     { unitId, unitPath }
//      POST /api/khan/lesson   { lessonId, unitId }
//      POST /api/khan/complete/exercise  { exerciseId, topicId }
//      POST /api/khan/complete/video     { videoId, videoSlug }
//      POST /api/khan/complete/quiz      { topicId, positionKey }
//      POST /api/khan/complete/unit-test { topicId }

const KHAN_KEY = "sync_labs_khan";
const khan = "https://khan.cupiditys.lol";

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

// Preview fallback for /api/khan/* until next publish.
const PREVIEW_HOST = "https://id-preview--6e0e5d0c-b095-4bbc-a9a0-4207603a8d3f.lovable.app";

async function khanFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let r = await fetch(url, init);
  if (
    r.status === 404 &&
    url.startsWith("/api/khan") &&
    typeof window !== "undefined" &&
    window.location.origin !== PREVIEW_HOST
  ) {
    r = await fetch(`${PREVIEW_HOST}${url}`, init);
  }
  return r;
}

// ===== Captcha (altcha PoW) =====
async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const captchaBase = "https://taskitos.cupiditys.lol";

export async function solveCaptcha(): Promise<string> {
  const r = await fetch(`${captchaBase}/captcha/challenge`);
  const c = await r.json();
  const max = c.maxNumber ?? 100000;
  let n = -1;
  for (let i = 0; i <= max; i++) {
    const h = await sha256Hex(c.salt + i);
    if (h === c.challenge) {
      n = i;
      break;
    }
  }
  if (n < 0) throw new Error("Não foi possível resolver o captcha");
  const payload = btoa(
    JSON.stringify({
      algorithm: c.algorithm,
      challenge: c.challenge,
      number: n,
      salt: c.salt,
      signature: c.signature,
    }),
  );
  const v = await fetch(`${captchaBase}/captcha/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  if (!v.ok) throw new Error(`Captcha verify HTTP ${v.status}`);
  const data = await v.json();
  if (!data?.token) throw new Error("Captcha sem token");
  return data.token as string;
}

// ===== Khan API =====
async function jpost<T = any>(
  path: string,
  body: unknown,
  bearer?: string,
  captchaToken?: string,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
  if (captchaToken) headers["X-Captcha-Token"] = captchaToken;
  const r = await khanFetch(path, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(text);
  } catch {
    return {} as T;
  }
}

/** Fetch Khan SSO token directly from EDUSP (CORS is open). */
export async function getKhanTokenFromEdusp(eduspAuthToken: string): Promise<string> {
  const r = await fetch(
    "https://edusp-api.ip.tv/mas/external-auth/seducsp_token/generate?card_label=Khan+Academy",
    {
      method: "GET",
      headers: { Accept: "application/json", "x-api-key": eduspAuthToken },
    },
  );
  const text = await r.text();
  if (!r.ok) throw new Error(`Khan token failed: HTTP ${r.status}: ${text.slice(0, 200)}`);
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {}
  const token =
    data?.token ||
    data?.access_token ||
    (typeof data?.redirect === "string" ? new URL(data.redirect).searchParams.get("token") : null) ||
    (typeof data?.url === "string" ? new URL(data.url).searchParams.get("token") : null);
  if (!token) throw new Error("Token Khan não encontrado na resposta da SED");
  return token;
}

/** SSO into khanto using SED token + altcha captcha. */
export async function khanSsoLogin(khanToken: string, captchaToken: string): Promise<KhanSession> {
  const data = await jpost<any>("/api/khan/sso", { token: khanToken, captchaToken }, undefined, captchaToken);
  const bearer = data?.token || data?.bearer || data?.access_token;
  if (!bearer) throw new Error("Bearer Khan não retornado pelo SSO");
  const session: KhanSession = { bearer, obtainedAt: Date.now() };
  saveKhanSession(session);
  return session;
}

/** Full login from EDUSP authToken (solves captcha automatically). */
export async function khanLogin(eduspAuthToken: string): Promise<KhanSession> {
  const captchaToken = await solveCaptcha();
  const t = await getKhanTokenFromEdusp(eduspAuthToken);
  return khanSsoLogin(t, captchaToken);
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
  type?: string;
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
