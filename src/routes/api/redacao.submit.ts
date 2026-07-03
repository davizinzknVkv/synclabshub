import { createFileRoute } from "@tanstack/react-router";

const EDUSP_UPSTREAMS = ["https://edusp-api.ip.tv", "https://edusp.crimsonzerohub.xyz"];
const OFFICIAL_ORIGIN = "https://saladofuturo.educacao.sp.gov.br";
const RETRYABLE_UPSTREAM_STATUSES = new Set([500, 502, 503, 504, 520, 521, 522, 523, 524, 530]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

type RedacaoSubmitPayload = {
  authToken?: string;
  status?: "draft" | "submitted";
  editedTitle?: string;
  editedBody?: string;
  generated?: {
    title?: string;
    body?: string;
    questionId?: string;
    questionType?: string;
    redacao?: Record<string, unknown> & {
      id?: number;
      answer_id?: string;
      room_name_for_apply?: string;
      publication_target?: string;
      answer_executed_on?: string;
      room_info?: { name?: string };
    };
  };
};

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { ...corsHeaders, ...(init?.headers || {}) },
  });
}

function buildHeaders(authToken: string) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-api-key": authToken,
    "x-api-platform": "webclient",
    "x-api-realm": "edusp",
    Origin: OFFICIAL_ORIGIN,
    Referer: `${OFFICIAL_ORIGIN}/`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  };
}

async function readJsonFromUpstream(path: string, authToken: string) {
  let lastError: Error | null = null;
  for (const upstream of EDUSP_UPSTREAMS) {
    try {
      const response = await fetch(`${upstream}${path}`, {
        method: "GET",
        headers: buildHeaders(authToken),
      });
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}: ${await response.text()}`);
        continue;
      }
      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Falha no proxy");
    }
  }
  throw lastError ?? new Error("Falha ao consultar salas");
}

function buildRoomCandidates(redacao: NonNullable<RedacaoSubmitPayload["generated"]>["redacao"], roomData: any) {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const roomIdToName = new Map<string, string>();
  const rooms = Array.isArray(roomData?.rooms) ? roomData.rooms : [];

  for (const room of rooms) {
    if (room?.id && room?.name) roomIdToName.set(String(room.id), String(room.name));
  }

  const push = (value?: unknown) => {
    const name = typeof value === "string" ? value.trim() : "";
    if (!name || seen.has(name)) return;
    seen.add(name);
    candidates.push(name);
  };

  const publicationTarget = typeof redacao?.publication_target === "string" ? redacao.publication_target : "";

  push(redacao?.room_name_for_apply);
  push(redacao?.room_info?.name);
  push(redacao?.answer_executed_on);

  if (publicationTarget) {
    push(publicationTarget);
    if (publicationTarget.includes(":")) push(publicationTarget.split(":")[0]);
    push(roomIdToName.get(publicationTarget));
  }

  for (const room of rooms) push(room?.name);
  return candidates;
}

async function submitToUpstream(
  payload: RedacaoSubmitPayload,
  roomName: string,
  upstream: string,
) {
  const generated = payload.generated!;
  const redacao = generated.redacao!;
  const authToken = payload.authToken!;
  const questionId = generated.questionId!;
  const questionType = generated.questionType!;
  const status = payload.status || "submitted";
  const hasExistingAnswer = Boolean(redacao.answer_id);
  const method = hasExistingAnswer ? "PUT" : "POST";
  const answerParam = hasExistingAnswer ? `&answer_id=${encodeURIComponent(String(redacao.answer_id))}` : "";
  const submitUrl = `${upstream}/tms/task/${redacao.id}/answer?room_name=${encodeURIComponent(roomName)}${answerParam}`;
  const numericQuestionId = Number(questionId);
  const requestBody: Record<string, unknown> = {
    status,
    accessed_on: "room",
    executed_on: roomName,
    duration: Math.floor(Math.random() * (40 * 60 * 1000 - 30 * 60 * 1000 + 1)) + 30 * 60 * 1000,
    answers: {
      [questionId]: {
        question_id: Number.isNaN(numericQuestionId) ? questionId : numericQuestionId,
        question_type: questionType,
        answer: {
          title: payload.editedTitle ?? generated.title ?? "Redação",
          body: payload.editedBody ?? generated.body ?? "",
        },
      },
    },
  };

  if (hasExistingAnswer) requestBody.id = redacao.answer_id;

  return fetch(submitUrl, {
    method,
    headers: buildHeaders(authToken),
    body: JSON.stringify(requestBody),
  });
}

async function submitWithFallback(payload: RedacaoSubmitPayload, roomName: string) {
  let lastResponse: Response | null = null;

  for (const upstream of EDUSP_UPSTREAMS) {
    const response = await submitToUpstream(payload, roomName, upstream);
    lastResponse = response;
    if (!RETRYABLE_UPSTREAM_STATUSES.has(response.status)) return response;
  }

  return lastResponse!;
}

function validatePayload(payload: RedacaoSubmitPayload) {
  if (!payload.authToken) return "Sessão inválida. Faça login novamente.";
  if (!payload.generated?.redacao?.id) return "Redação sem ID de tarefa.";
  if (!payload.generated.questionId || !payload.generated.questionType) return "Questão da redação não encontrada.";
  if (!payload.editedBody && !payload.generated.body) return "Texto da redação vazio.";
  return null;
}

export const Route = createFileRoute("/api/redacao/submit")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const payload = (await request.json()) as RedacaoSubmitPayload;
          const validationError = validatePayload(payload);
          if (validationError) return json({ error: validationError }, { status: 400 });

          const roomData = await readJsonFromUpstream("/room/user?list_all=true&with_cards=true", payload.authToken!);
          const candidates = buildRoomCandidates(payload.generated!.redacao!, roomData);
          if (candidates.length === 0) return json({ error: "Nenhuma sala encontrada para esta redação." }, { status: 400 });

          let lastStatus = 403;
          let lastBody = "";

          for (const roomName of candidates) {
            const response = await submitWithFallback(payload, roomName);
            const responseText = await response.text();
            if (response.ok) return json({ success: true, roomName });

            lastStatus = response.status;
            lastBody = responseText;
            const retryableRoomError = response.status === 403 || responseText.toLowerCase().includes("forbidden");
            if (!retryableRoomError) {
              return json({ error: `HTTP ${response.status}: ${responseText}` }, { status: response.status });
            }
          }

          return json(
            {
              error: `HTTP ${lastStatus}: ${lastBody || "A tarefa foi negada para todas as salas encontradas."}`,
            },
            { status: lastStatus },
          );
        } catch (error) {
          return json(
            { error: error instanceof Error ? error.message : "Erro no proxy da redação" },
            { status: 502 },
          );
        }
      },
    },
  },
});