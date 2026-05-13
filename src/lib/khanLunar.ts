// Khan Lunar integration — replica do auto-completer dentro do hub
// Usa o mesmo proxy público usado pelo khan.crimsonzerohub.xyz

export const KHAN_PROXY = "https://clever.crimsonzerohub.xyz";
export const EDUSP = "https://edusp-api.ip.tv";
export const TURNSTILE_SITEKEY = "0x4AAAAAADOL2ArgP6SQz0Ef";

const LS = {
  cookies: "khan_book_cookies",
  method: "khan_auth_method",
  captchaToken: "khan_captcha_token",
  captchaExpires: "khan_captcha_expires",
  captchaSession: "khan_captcha_session_id",
};

export type KhanCookies = Record<string, unknown>;

export function getStoredCookies(): KhanCookies | null {
  try {
    const raw = localStorage.getItem(LS.cookies);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (c && typeof c === "object" && Object.keys(c as object).length > 0) return c;
  } catch {}
  return null;
}

export function saveCookies(cookies: KhanCookies) {
  localStorage.setItem(LS.cookies, JSON.stringify(cookies));
  localStorage.setItem(LS.method, "bookmarklet");
}

export function clearKhanSession() {
  localStorage.removeItem(LS.cookies);
  localStorage.removeItem(LS.method);
  localStorage.removeItem(LS.captchaToken);
  localStorage.removeItem(LS.captchaExpires);
  localStorage.removeItem(LS.captchaSession);
}

export function getCaptchaToken(): string | null {
  const t = localStorage.getItem(LS.captchaToken);
  const exp = Number(localStorage.getItem(LS.captchaExpires) || 0);
  if (t && exp > Date.now() + 30_000) return t;
  return null;
}

function saveCaptcha(token: string, expiresInSec: number, sessionId?: string) {
  localStorage.setItem(LS.captchaToken, token);
  localStorage.setItem(LS.captchaExpires, String(Date.now() + expiresInSec * 1000));
  if (sessionId) localStorage.setItem(LS.captchaSession, sessionId);
}

// 1) Pega label token na SED
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

// 2) Valida o token do Turnstile no proxy → recebe authToken do servidor
export async function validateCaptcha(cfToken: string): Promise<{ token: string; sessionId: string }> {
  const sessionId = Math.random().toString(36).slice(2);
  const r = await fetch(`${KHAN_PROXY}/captcha`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: cfToken, session_id: sessionId }),
  });
  if (!r.ok) throw new Error(`Captcha falhou: HTTP ${r.status}`);
  const data = await r.json();
  saveCaptcha(data.token, data.expires_in || 21600, sessionId);
  return { token: data.token, sessionId };
}

// 3) Troca label token por cookies da Khan
export async function redeemCookies(labelToken: string, captchaAuth: string): Promise<KhanCookies> {
  const r = await fetch(`${KHAN_PROXY}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-captcha-auth": captchaAuth },
    body: JSON.stringify({ token: labelToken }),
  });
  if (r.status === 403) throw new Error("Captcha rejeitado");
  if (!r.ok) throw new Error(`/token HTTP ${r.status}`);
  const data = await r.json();
  if (!data.success || !data.cookies) throw new Error("Resposta inválida do /token");
  saveCookies(data.cookies);
  return data.cookies;
}

// Renova captcha (se sessão presente)
export async function renewCaptcha(cfToken: string): Promise<string> {
  const sessionId = localStorage.getItem(LS.captchaSession);
  const body = sessionId ? { token: cfToken, session_id: sessionId } : { token: cfToken };
  const r = await fetch(`${KHAN_PROXY}/renew-captcha`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`/renew-captcha HTTP ${r.status}`);
  const data = await r.json();
  saveCaptcha(data.token, data.expires_in || 21600);
  return data.token;
}

async function postProxy<T>(endpoint: string, payload: unknown): Promise<T> {
  const r = await fetch(`${KHAN_PROXY}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Language": "pt" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`${endpoint} HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export interface KhanUser {
  kaid: string;
  username?: string;
  nickname?: string;
}

export async function fetchProfile(cookies: KhanCookies): Promise<KhanUser> {
  const res: any = await postProxy("/UserProfile", cookies);
  const user = res?.data?.profile?.data?.user || res?.data?.data?.user;
  if (!user?.kaid) throw new Error("Perfil Khan não encontrado");
  return user;
}

export interface KhanCourseTopic {
  id: string;
  title: string;
  translatedTitle?: string;
  iconPath?: string;
  relativeUrl?: string;
}

export async function fetchClasses(cookies: KhanCookies, kaid: string) {
  const res: any = await postProxy("/course", { cookies, kaid });
  const classes = res?.data?.data?.user?.homepageModules?.navigation?.classes || [];
  const topics: KhanCourseTopic[] = [];
  for (const c of classes) {
    if (c.classroom?.topics) {
      for (const t of c.classroom.topics) {
        if (t.id) topics.push(t);
      }
    }
  }
  return topics;
}

export async function fetchCourseProgresses(cookies: KhanCookies, courseIds: string[]) {
  const res: any = await postProxy("/courseProgresses", { cookies, courseIds });
  return res?.data?.data?.user?.courseProgresses || [];
}

export async function fetchContentForPath(cookies: KhanCookies, relativeUrl: string) {
  const path = relativeUrl.startsWith("/") ? relativeUrl.slice(1) : relativeUrl;
  const res: any = await postProxy("/ContentForPath", {
    cookies,
    variables: { path, countryCode: "BR" },
  });
  return res?.data?.data?.contentRoute?.listedPathData?.course;
}

export async function fetchUnitMastery(cookies: KhanCookies, topicId: string) {
  const res: any = await postProxy("/getFpmMasteryForTopic", { cookies, topicId });
  return res?.data?.data?.user?.curationItemProgress?.masteryMap || [];
}

export interface KhanActivity {
  id: string;
  progressKey?: string;
  title: string;
  type: string;
  isTest: boolean;
  status?: string;
}

// Constrói lista de atividades para uma unidade
export function buildActivities(courseData: any, unitId: string, masteryMap: any[]): KhanActivity[] {
  const contentMap: Record<string, any> = {};
  function traverse(node: any) {
    if (!node) return;
    if (node.progressKey || node.id) {
      contentMap[node.progressKey || node.id] = {
        title: node.translatedTitle || node.title,
        type: node.__typename,
        id: node.id,
        progressKey: node.progressKey,
      };
    }
    node.unitChildren?.forEach(traverse);
    node.allOrderedChildren?.forEach(traverse);
    node.curatedChildren?.forEach(traverse);
  }
  traverse(courseData);

  const activities: KhanActivity[] = [];
  for (const item of masteryMap) {
    const info = contentMap[item.progressKey];
    if (info) activities.push({ ...info, status: item.status, isTest: false });
  }
  const unit = courseData?.unitChildren?.find((u: any) => u.id === unitId);
  unit?.allOrderedChildren?.forEach((item: any) => {
    if (item.__typename === "TopicUnitTest" && !activities.find((a) => a.id === item.id)) {
      const info = contentMap[item.progressKey || item.id];
      activities.push({
        id: item.id,
        progressKey: item.progressKey,
        title: info?.title || item.translatedTitle || item.title,
        type: "TopicUnitTest",
        isTest: true,
        status: "TESTE FINAL",
      });
    }
  });
  return activities;
}

export function getAncestorIds(courseData: any, exerciseId: string): string[] | null {
  function search(node: any, path: string[]): string[] | null {
    if (!node) return null;
    const newPath = node.id ? [...path, node.id] : path;
    if (node.id === exerciseId) return newPath;
    for (const k of ["unitChildren", "allOrderedChildren", "curatedChildren"]) {
      if (node[k]) {
        for (const child of node[k]) {
          const found = search(child, newPath);
          if (found) return found;
        }
      }
    }
    return null;
  }
  return search(courseData, []);
}

export async function startActivity(opts: {
  cookies: KhanCookies;
  exerciseId: string;
  ancestorIds: string[];
  isTest: boolean;
  captchaToken: string;
}): Promise<string> {
  const endpoint = opts.isTest ? "finaltest" : "lesson";
  const body = opts.isTest
    ? { cookies: opts.cookies, topicId: opts.exerciseId, ancestorIds: opts.ancestorIds, lang: "pt" }
    : { cookies: opts.cookies, exerciseId: opts.exerciseId, ancestorIds: opts.ancestorIds, lang: "pt" };
  const r = await fetch(`${KHAN_PROXY}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-captcha-auth": opts.captchaToken },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`/${endpoint} HTTP ${r.status}`);
  const data = await r.json();
  if (!data.jobId) throw new Error("Job não criado");
  return data.jobId as string;
}

export async function pollJob(jobId: string, intervalMs = 3000): Promise<any> {
  while (true) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch(`${KHAN_PROXY}/job/${jobId}`).then((r) => r.json());
    if (res.status === "done") return res.result;
    if (res.status === "error") throw new Error(res.result?.error || "Job falhou");
  }
}
