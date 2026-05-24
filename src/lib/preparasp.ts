const PROXY = "/api/preparasp/call";

export interface PreparaSpAuth {
  bearerToken: string;
  sessionToken: string;
  userId: string;
  analyticsSessionId?: string;
}

export interface SolveQuizResult {
  success: boolean;
  question_id: string;
  answer_id: string;
  is_last_question: boolean;
  result?: {
    performance: number;
    points: number;
    bonusPoints: number;
    timeSpentInSeconds: number;
  };
  finalize_result?: unknown;
}

interface ProxyResponse<T> {
  success: boolean;
  data?: T;
  auth?: PreparaSpAuth;
  error?: string;
}

async function call<T>(
  action: string,
  params: Record<string, unknown>,
  auth: PreparaSpAuth,
): Promise<{ data: T; auth?: PreparaSpAuth }> {
  const res = await fetch(PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...auth, ...params }),
  });
  const json = (await res.json()) as ProxyResponse<T>;
  if (!json.success || json.data === undefined) {
    throw new Error(json.error || "Erro no Prepara SP");
  }
  return { data: json.data as T, auth: json.auth };
}

export async function loginPraxis(auth: PreparaSpAuth) {
  return call<{ userId: string; ok: boolean }>("login", {}, auth);
}

export async function solveQuizQuestion(
  auth: PreparaSpAuth,
  params: { quizId: string; questionId: string; isLast?: boolean },
) {
  return call<SolveQuizResult>("solveQuiz", params, auth);
}

export async function createPracticeTest(
  auth: PreparaSpAuth,
  standardizedTestId: string,
) {
  return call<unknown>("createPracticeTest", { standardizedTestId }, auth);
}

/** Resolve um quiz inteiro dado a lista de question_ids (a última recebe is_last=true). */
export async function autoSolveQuiz(
  auth: PreparaSpAuth,
  quizId: string,
  questionIds: string[],
  onProgress?: (current: number, total: number) => void,
): Promise<{ ok: number; fail: number; lastResult?: SolveQuizResult }> {
  let ok = 0;
  let fail = 0;
  let lastResult: SolveQuizResult | undefined;
  for (let i = 0; i < questionIds.length; i++) {
    onProgress?.(i + 1, questionIds.length);
    try {
      const r = await solveQuizQuestion(auth, {
        quizId,
        questionId: questionIds[i],
        isLast: i === questionIds.length - 1,
      });
      lastResult = r.data;
      ok++;
    } catch {
      fail++;
    }
    if (i < questionIds.length - 1) {
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
    }
  }
  return { ok, fail, lastResult };
}
