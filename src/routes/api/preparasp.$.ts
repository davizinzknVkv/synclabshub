import { createFileRoute } from "@tanstack/react-router";

const GRAPHQL_API = "https://ecs-em-graphql-api.jovensgenios.com/graphql";
const AUTH_API = "https://ecs-em-graphql-api.jovensgenios.com/api/external-integration/user-authentication-url";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

const JSON_HEADERS = { "Content-Type": "application/json", ...corsHeaders };

interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string }>;
}

function generateSessionId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string,
  session: string,
  retries = 2,
): Promise<GraphQLResponse<T>> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(GRAPHQL_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          session,
          Accept: "application/json",
          Origin: "https://preparasp.jovensgenios.com",
          Referer: "https://preparasp.jovensgenios.com/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
        body: JSON.stringify({ query, variables }),
      });

      const text = await response.text();
      if (text.includes("Suspicious activity")) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 3000));
        continue;
      }
      if (!response.ok) {
        return { errors: [{ message: `API error: ${response.status}` }] };
      }
      try {
        return JSON.parse(text);
      } catch {
        return { errors: [{ message: "Resposta inválida da API" }] };
      }
    } catch (err) {
      if (attempt === retries - 1) {
        return {
          errors: [{ message: err instanceof Error ? err.message : "Network error" }],
        };
      }
      await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
    }
  }
  return { errors: [{ message: "API bloqueada — tente novamente em alguns minutos" }] };
}

/** Troca: IP.TV authToken (do SED) → Prepara SP token → Jovens Gênios {token, session}. */
async function loginWithIPTV(
  iptvKey: string,
): Promise<{ token: string; session: string } | null> {
  // 1) Gerar token do Prepara SP usando a chave IP.TV
  const sedRes = await fetch(
    "https://edusp-api.ip.tv/mas/external-auth/seducsp_token/generate?card_label=Prepara+SP",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": iptvKey,
      },
    },
  );
  if (!sedRes.ok) return null;
  const sedData = await sedRes.json();
  if (!sedData?.token) return null;

  // 2) Trocar pelo token do Jovens Gênios
  const authRes = await fetch(
    `${AUTH_API}?userToken=${encodeURIComponent(sedData.token)}`,
    { method: "GET" },
  );
  if (!authRes.ok) return null;
  const authData = await authRes.json();
  if (!authData?.success || !authData?.redirectUrl) return null;

  try {
    const url = new URL(authData.redirectUrl);
    const externalToken = url.searchParams.get("externalToken");
    if (!externalToken) return null;
    return { token: externalToken, session: generateSessionId() };
  } catch {
    return null;
  }
}

// ── Queries ───────────────────────────────────────────────
const GET_CURRENT_USER = `query { getCurrentUser { id name email } }`;

const GET_USER_TOPICS = `query GetUserTopics($options: TopicOptions, $where: TopicWhere, $reportWhere: ContentRoundReportWhere) {
  topics(options: $options, where: $where) {
    id name imageUrl
    rootTopic { name }
    contentRounds {
      id contentType
      contents { id }
      report(where: $reportWhere) {
        isContentRoundCompleted
        contentsToComplete
        contentsCompletedAggregate { count }
      }
    }
  }
}`;

const GET_TOPIC_BY_ID = `query GetTopicById($topicsWhere: TopicWhere, $reportWhere: ContentRoundReportWhere) {
  topics(where: $topicsWhere) {
    id name
    contentRounds {
      id contentType
      contents { id }
      report(where: $reportWhere) {
        isContentRoundCompleted
        contentsToComplete
        contentsCompletedAggregate { count }
      }
    }
  }
}`;

const GET_QUESTION = `query GetQ($where: QuestionWhere) {
  questions(where: $where) {
    id text
    answers { id text fraction }
    solution { text }
  }
}`;

const CREATE_INTERACTION = `mutation create(
  $performance: Float!, $timeSpentInSeconds: Int!,
  $contentId: ID!, $contentRoundId: ID!, $userId: ID!
) {
  createUserInteraction(
    performance: $performance
    timeSpentInSeconds: $timeSpentInSeconds
    contentId: $contentId
    contentRoundId: $contentRoundId
    userId: $userId
  )
}`;

const GET_CR_CONTENTS = `query($where: ContentRoundWhere) {
  contentRounds(where: $where) {
    id contentType
    contents { id }
  }
}`;

interface ProxyBody {
  action: string;
  iptvKey?: string;
  token?: string;
  session?: string;
  [key: string]: unknown;
}

async function handle(req: Request): Promise<Response> {
  let body: ProxyBody;
  try {
    body = (await req.json()) as ProxyBody;
  } catch {
    return new Response(JSON.stringify({ success: false, error: "JSON inválido" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const { action, iptvKey } = body;
  let token = body.token;
  let session = body.session;

  // Login via IP.TV (usa session.authToken do SYNC HUB)
  if (iptvKey && !token) {
    const auth = await loginWithIPTV(iptvKey);
    if (!auth) {
      return new Response(
        JSON.stringify({ success: false, error: "Falha ao autenticar no Prepara SP" }),
        { status: 401, headers: JSON_HEADERS },
      );
    }
    token = auth.token;
    session = auth.session;
  }

  if (!token || !session) {
    return new Response(
      JSON.stringify({ success: false, error: "Credenciais ausentes" }),
      { status: 401, headers: JSON_HEADERS },
    );
  }

  try {
    let data: unknown = null;

    switch (action) {
      case "login": {
        const r = await graphqlRequest<{ getCurrentUser: { id: string; name: string; email: string } }>(
          GET_CURRENT_USER,
          {},
          token,
          session,
        );
        data = r.data?.getCurrentUser ?? null;
        break;
      }

      case "getTopics": {
        const userRes = await graphqlRequest<{ getCurrentUser: { id: string } }>(
          GET_CURRENT_USER,
          {},
          token,
          session,
        );
        const userId = userRes.data?.getCurrentUser?.id;
        if (!userId) throw new Error("Sessão expirada");

        const limit = (body.limit as number) || 50;
        const offset = (body.offset as number) || 0;
        const search = (body.search as string) || "";

        const whereClause: Record<string, unknown> = { users_SOME: { id: userId } };
        if (search) whereClause.name_CONTAINS = search;

        const r = await graphqlRequest<{
          topics: Array<{
            id: string;
            name: string;
            imageUrl: string | null;
            rootTopic?: { name: string };
            contentRounds: Array<{
              id: string;
              contentType: string;
              contents: Array<{ id: string }>;
              report?:
                | Array<{
                    isContentRoundCompleted: boolean;
                    contentsToComplete: number;
                    contentsCompletedAggregate: { count: number };
                  }>
                | {
                    isContentRoundCompleted: boolean;
                    contentsToComplete: number;
                    contentsCompletedAggregate: { count: number };
                  };
            }>;
          }>;
        }>(
          GET_USER_TOPICS,
          {
            options: { limit, offset, sort: [{ name: "ASC" }] },
            where: whereClause,
            reportWhere: { user: { id: userId } },
          },
          token,
          session,
        );

        const topics = (r.data?.topics || []).map((t) => {
          const qRounds = t.contentRounds.filter((cr) => cr.contentType === "QUESTION");
          let totalQuestions = 0;
          let completedQuestions = 0;
          let allCompleted = qRounds.length > 0;
          for (const cr of t.contentRounds) {
            const rep = Array.isArray(cr.report) ? cr.report[0] : cr.report;
            totalQuestions += cr.contents?.length || 0;
            completedQuestions += rep?.contentsCompletedAggregate?.count || 0;
            if (cr.contentType === "QUESTION" && !rep?.isContentRoundCompleted) {
              allCompleted = false;
            }
          }
          return {
            id: t.id,
            name: t.name,
            imageUrl: t.imageUrl,
            category: t.rootTopic?.name,
            totalQuestions,
            completedQuestions,
            isCompleted: allCompleted,
            contentRoundsCount: t.contentRounds.length,
          };
        });

        data = { topics, userId };
        break;
      }

      case "getTopicDetails": {
        const userRes = await graphqlRequest<{ getCurrentUser: { id: string } }>(
          GET_CURRENT_USER,
          {},
          token,
          session,
        );
        const userId = userRes.data?.getCurrentUser?.id;
        if (!userId) throw new Error("Sessão expirada");

        const r = await graphqlRequest<{ topics: Array<unknown> }>(
          GET_TOPIC_BY_ID,
          {
            topicsWhere: { id: body.topicId },
            reportWhere: { user: { id: userId } },
          },
          token,
          session,
        );
        data = { topic: r.data?.topics?.[0] ?? null, userId };
        break;
      }

      case "getContentRoundContents": {
        const r = await graphqlRequest<{
          contentRounds: Array<{ contentType: string; contents: Array<{ id: string }> }>;
        }>(GET_CR_CONTENTS, { where: { id: body.contentRoundId } }, token, session);
        data = r.data?.contentRounds?.[0] ?? null;
        break;
      }

      case "getQuestion": {
        const r = await graphqlRequest<{
          questions: Array<{
            id: string;
            text: string;
            answers: Array<{ id: string; text: string; fraction: number }>;
            solution: { text: string };
          }>;
        }>(GET_QUESTION, { where: { id: body.questionId } }, token, session);
        const q = r.data?.questions?.[0];
        if (!q) throw new Error("Questão não encontrada");
        const correct = q.answers.find((a) => a.fraction === 1);
        data = {
          ...q,
          correctAnswer: correct,
          correctAnswerIndex: q.answers.findIndex((a) => a.fraction === 1),
        };
        break;
      }

      case "submitAnswer": {
        const r = await graphqlRequest<{ createUserInteraction: string }>(
          CREATE_INTERACTION,
          {
            performance: body.performance ?? 1,
            timeSpentInSeconds: body.timeSpentInSeconds ?? 5,
            contentId: body.contentId,
            contentRoundId: body.contentRoundId,
            userId: body.userId,
          },
          token,
          session,
        );
        if (r.errors?.length) {
          throw new Error(r.errors.map((e) => e.message).join(" | "));
        }
        data = { interactionId: r.data?.createUserInteraction };
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data, auth: { token, session } }),
      { headers: JSON_HEADERS },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
}

export const Route = createFileRoute("/api/preparasp/$")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => handle(request),
    },
  },
});
