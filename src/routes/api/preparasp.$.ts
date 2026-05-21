import { createFileRoute } from "@tanstack/react-router";

const PRAXIS = "https://praxis.crimsonzerohub.xyz";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;
const JSON_HEADERS = { "Content-Type": "application/json", ...corsHeaders };

interface PraxisAuth {
  bearerToken: string;
  sessionToken: string;
  userId: string;
  analyticsSessionId?: string;
}

interface ProxyBody extends Partial<PraxisAuth> {
  action: string;
  [k: string]: unknown;
}

function authHeaders(a: PraxisAuth) {
  const h: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    "bearer-token": a.bearerToken,
    "session-token": a.sessionToken,
    "user-id": a.userId,
    origin: "https://crimsonzerohub.xyz",
    referer: "https://crimsonzerohub.xyz/",
  };
  if (a.analyticsSessionId) h["analytics-session-id"] = a.analyticsSessionId;
  return h;
}

async function praxis<T = unknown>(
  path: string,
  method: "GET" | "POST",
  auth: PraxisAuth,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: T | null; raw: string }> {
  const res = await fetch(`${PRAXIS}${path}`, {
    method,
    headers: authHeaders(auth),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const raw = await res.text();
  let data: T | null = null;
  try { data = JSON.parse(raw) as T; } catch { /* não-json */ }
  return { ok: res.ok, status: res.status, data, raw };
}

async function handle(req: Request): Promise<Response> {
  let body: ProxyBody;
  try {
    body = (await req.json()) as ProxyBody;
  } catch {
    return new Response(JSON.stringify({ success: false, error: "JSON inválido" }), {
      status: 400, headers: JSON_HEADERS,
    });
  }

  const { action, bearerToken, sessionToken, userId, analyticsSessionId } = body;
  if (!bearerToken || !sessionToken || !userId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Credenciais ausentes (bearer-token, session-token, user-id). Cole no interceptor e tente de novo.",
      }),
      { status: 401, headers: JSON_HEADERS },
    );
  }
  const auth: PraxisAuth = { bearerToken, sessionToken, userId, analyticsSessionId };

  try {
    let data: unknown = null;

    switch (action) {
      // ── Validação simples: só ecoa os tokens como "auth válido" ──
      case "login": {
        data = { userId, ok: true };
        break;
      }

      // ── Resolve UMA questão de um quiz ──
      // params: { quizId, questionId, isLast }
      case "solveQuiz": {
        const r = await praxis(
          "/solve-quiz",
          "POST",
          auth,
          {
            quiz_id: body.quizId,
            question_id: body.questionId,
            is_last: !!body.isLast,
          },
        );
        if (!r.ok) throw new Error(`praxis ${r.status}: ${r.raw.slice(0, 200)}`);
        data = r.data;
        break;
      }

      // ── Cria/abre um teste prático ──
      // params: { standardizedTestId }
      case "createPracticeTest": {
        const r = await praxis(
          `/testes-praticos/${encodeURIComponent(String(body.standardizedTestId || ""))}/create`,
          "POST",
          auth,
        );
        data = r.data ?? { status: r.status, raw: r.raw };
        break;
      }

      // ── Passa-through genérico: { path, method, body } ──
      case "raw": {
        const r = await praxis(
          String(body.path || ""),
          (body.method as "GET" | "POST") || "GET",
          auth,
          body.body,
        );
        data = { status: r.status, body: r.data ?? r.raw };
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data, auth }),
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
