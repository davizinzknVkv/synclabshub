const PROXY = "/api/preparasp/call";

export interface PreparaSpAuth {
  token: string;
  session: string;
}

export interface PreparaSpUser {
  id: string;
  name: string;
  email: string;
}

export interface TopicSummary {
  id: string;
  name: string;
  imageUrl: string | null;
  category?: string;
  totalQuestions: number;
  completedQuestions: number;
  isCompleted: boolean;
  contentRoundsCount: number;
}

export interface ContentRoundDetail {
  id: string;
  contentType: string;
  contents: Array<{ id: string }>;
  report?: {
    isContentRoundCompleted: boolean;
    contentsToComplete: number;
    contentsCompletedAggregate: { count: number };
  };
}

export interface TopicDetail {
  id: string;
  name: string;
  contentRounds: ContentRoundDetail[];
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
  auth: PreparaSpAuth | null,
  iptvKey?: string,
): Promise<{ data: T; auth: PreparaSpAuth }> {
  const res = await fetch(PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      ...(auth || {}),
      ...(iptvKey && !auth ? { iptvKey } : {}),
      ...params,
    }),
  });
  const json = (await res.json()) as ProxyResponse<T>;
  if (!json.success || !json.data || !json.auth) {
    throw new Error(json.error || "Erro no Prepara SP");
  }
  return { data: json.data, auth: json.auth };
}

export async function loginPreparaSp(iptvKey: string) {
  return call<PreparaSpUser>("login", {}, null, iptvKey);
}

export async function getTopics(auth: PreparaSpAuth, search = "") {
  return call<{ topics: TopicSummary[]; userId: string }>(
    "getTopics",
    { search, limit: 100 },
    auth,
  );
}

export async function getTopicDetails(auth: PreparaSpAuth, topicId: string) {
  return call<{ topic: TopicDetail; userId: string }>(
    "getTopicDetails",
    { topicId },
    auth,
  );
}

export async function getQuestion(auth: PreparaSpAuth, questionId: string) {
  return call<{
    id: string;
    correctAnswer?: { id: string; text: string; fraction: number };
    answers: Array<{ id: string; text: string; fraction: number }>;
  }>("getQuestion", { questionId }, auth);
}

export async function submitAnswer(
  auth: PreparaSpAuth,
  params: {
    contentId: string;
    contentRoundId: string;
    userId: string;
    performance?: number;
    timeSpentInSeconds?: number;
  },
) {
  return call<{ interactionId: string }>("submitAnswer", params, auth);
}

/** Auto-resolve um content round inteiro client-side, respeitando delays. */
export async function autoAnswerContentRound(
  auth: PreparaSpAuth,
  contentRound: ContentRoundDetail,
  userId: string,
  onProgress?: (current: number, total: number) => void,
): Promise<{ ok: number; fail: number }> {
  const contents = contentRound.contents || [];
  let ok = 0;
  let fail = 0;
  const isQuestion = contentRound.contentType === "QUESTION";

  for (let i = 0; i < contents.length; i++) {
    const c = contents[i];
    onProgress?.(i + 1, contents.length);
    try {
      // Para QUESTION: precisamos buscar a resposta correta (não usada agora pq performance=1 já marca certo)
      // Para FLASHCARD/INFOGRAPHIC: só registra a interação
      const timeSpent = isQuestion
        ? Math.floor(Math.random() * 4) + 4
        : Math.floor(Math.random() * 3) + 3;

      await submitAnswer(auth, {
        contentId: c.id,
        contentRoundId: contentRound.id,
        userId,
        performance: 1,
        timeSpentInSeconds: timeSpent,
      });
      ok++;
    } catch {
      fail++;
    }
    // Delay aleatório 2-4s entre questões
    if (i < contents.length - 1) {
      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));
    }
  }

  return { ok, fail };
}
