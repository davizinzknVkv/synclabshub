/**
 * Redação Paulista — fetch, generate (Lovable AI), and submit essays
 */

const API_BASE_URL = "/api/proxy";

export interface RedacaoItem {
  id: number;
  title: string;
  status: "pending" | "draft";
  room_name_for_apply: string;
  answer_id?: string;
  answer_status?: string;
  tags: string[];
  publication_target?: string;
  [key: string]: unknown;
}

function getDefaultHeaders(authToken?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-realm": "edusp",
    "x-api-platform": "webclient",
  };
  if (authToken) headers["x-api-key"] = authToken;
  return headers;
}

async function makeRequest(
  url: string,
  method = "GET",
  headers: Record<string, string> = {},
  body?: unknown,
) {
  const options: RequestInit = { method, headers: { ...headers } };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function isRedacao(task: { tags?: string[]; title?: string }) {
  const tags = task.tags || [];
  return (
    tags.some((t: string) => t.toLowerCase().includes("redacao")) ||
    (task.title || "").toLowerCase().includes("redação")
  );
}


export async function fetchRedacoes(
  authToken: string,
  onNotify: (msg: string) => void,
  nick?: string,
): Promise<RedacaoItem[]> {
  onNotify("BUSCANDO REDAÇÕES...");

  const roomData = await makeRequest(
    `${API_BASE_URL}/room/user?list_all=true&with_cards=true`,
    "GET",
    getDefaultHeaders(authToken),
  );

  const rooms = roomData.rooms || [];
  if (rooms.length === 0) throw new Error("NENHUMA SALA ENCONTRADA");

  const uniqueTargets = new Set<string>();
  const roomIdToNameMap = new Map<string, string>();

  rooms.forEach((room: { name: string; id: number }) => {
    uniqueTargets.add(room.name);
    if (nick) uniqueTargets.add(`${room.name}:${nick}`);
    roomIdToNameMap.set(room.id.toString(), room.name);
  });

  const roomUserJsonString = JSON.stringify(roomData);
  const idMatches = roomUserJsonString.match(/"id"\s*:\s*(\d{3,4})(?!\d)/g) || [];
  idMatches.forEach((m: string) => {
    const id = m.match(/\d{3,4}/)?.[0];
    if (id) uniqueTargets.add(id);
  });

  const targetsArray = Array.from(uniqueTargets);

  const commonParams = `expired_only=false&limit=100&offset=0&filter_expired=true&is_exam=false&with_answer=true&is_essay=true&with_apply_moment=true`;
  const targetParams = targetsArray
    .map((t) => `publication_target=${encodeURIComponent(t)}`)
    .join("&");
  const statusParams = `answer_statuses=${encodeURIComponent("pending")}&answer_statuses=${encodeURIComponent("draft")}`;
  const url = `${API_BASE_URL}/tms/task/todo?${commonParams}&${targetParams}&${statusParams}`;

  let allTasks: any[] = [];
  try {
    allTasks = await makeRequest(url, "GET", getDefaultHeaders(authToken));
  } catch {
    allTasks = [];
  }

  if (!Array.isArray(allTasks)) allTasks = [];

  const redacoesMap = new Map<number, RedacaoItem>();

    allTasks.filter(isRedacao).forEach((task: any) => {
    const actualStatus: "pending" | "draft" = task.answer_status === "draft" ? "draft" : "pending";
    let roomName = "";

    // Prefer explicit room fields, then derive from publication_target.
    if (task.room_info?.name) {
      roomName = task.room_info.name;
    } else if (task.answer_executed_on && task.answer_executed_on.startsWith("r")) {
      roomName = task.answer_executed_on;
    } else if (task.publication_target) {
      if (task.publication_target.includes(":")) {
        roomName = task.publication_target.split(":")[0];
      } else if (roomIdToNameMap.has(task.publication_target)) {
        roomName = roomIdToNameMap.get(task.publication_target)!;
      } else if (task.publication_target.startsWith("r")) {
        roomName = task.publication_target;
      } else {
        roomName = rooms.length > 0 ? rooms[0].name : task.publication_target;
      }
    }

    if (redacoesMap.has(task.id)) {
      const existing = redacoesMap.get(task.id)!;
      if (existing.status === "draft" && actualStatus === "pending") {
        redacoesMap.set(task.id, {
          ...task,
          status: actualStatus,
          room_name_for_apply: roomName,
          answer_id: task.answer_id,
        });
      }
    } else {
      redacoesMap.set(task.id, {
        ...task,
        status: actualStatus,
        room_name_for_apply: roomName,
        answer_id: task.answer_id,
      });
    }
  });

  const result = Array.from(redacoesMap.values());
  onNotify(`${result.length} REDAÇÕES ENCONTRADAS`);
  return result;
}

// ---- Content fetching & parsing ----

async function fetchRedacaoContent(
  taskId: number,
  token: string,
  roomName: string,
  answerId?: string,
) {
  const answerParams = answerId
    ? `&answer_id=${answerId}&answer_fields=id&answer_fields=nick&answer_fields=status&answer_fields=task_id&answer_fields=answers&answer_fields=duration`
    : "";
  const url = `${API_BASE_URL}/tms/task/${taskId}/apply?preview_mode=false${answerParams}&token_code=null&room_name=${encodeURIComponent(roomName)}`;
  return makeRequest(url, "GET", { "x-api-key": token });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function removeUrls(text: string): string {
  return text
    .replace(/(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\/[^\s]*)/g, "")
    .trim();
}

function parseRedactionSections(rawHtml: string) {
  const sections: Record<string, { content: string; isImage: boolean }> = {
    ENUNCIADO: { content: "", isImage: false },
    "Texto I": { content: "", isImage: false },
    "Texto II": { content: "", isImage: false },
    "Texto III": { content: "", isImage: false },
  };
  const sectionIdentifiers = ["Texto I", "Texto II", "Texto III", "ENUNCIADO"];

  for (const id of sectionIdentifiers) {
    const regex = new RegExp(`<strong[^>]*>\\s*${id}\\s*</strong>([\\s\\S]*?)(?=<strong|$)`, "i");
    const match = rawHtml.match(regex);
    if (match) {
      const content = match[1];
      const hasImage = content.includes("<img");
      sections[id].isImage = hasImage;
      sections[id].content = hasImage ? "[IMAGEM]" : removeUrls(stripHtml(content)).trim();
    }
  }
  return sections;
}

// ---- Lovable AI ----

const promptsGeracao = [
  `Você é um professor de Língua Portuguesa especialista em redação do ENEM e do SARESP, com domínio absoluto da norma culta do português brasileiro. Sua tarefa é escrever uma redação dissertativo-argumentativa NOTA MÁXIMA (1000), perfeita em ortografia, sintaxe, semântica, coesão e coerência.

INFORMAÇÕES DA PROPOSTA:
{dadosRedacao}

REGRAS ABSOLUTAS DE QUALIDADE (zero tolerância a erros):
1. ORTOGRAFIA: siga rigorosamente o Acordo Ortográfico vigente. Revise acentuação (crase, agudo, circunflexo), hífen, ç, s/ss/x/ch, g/j. Não invente palavras.
2. SINTAXE: respeite concordância verbal e nominal, regência verbal e nominal, colocação pronominal e paralelismo sintático. Frases bem pontuadas, sem períodos truncados nem orações soltas.
3. SEMÂNTICA: use cada palavra no sentido correto. Não troque parônimos (ex: ratificar/retificar, tráfego/tráfico, eminente/iminente). Evite ambiguidades, redundâncias, pleonasmos viciosos e contradições.
4. COESÃO: use conectivos variados e adequados (portanto, contudo, ademais, outrossim, por conseguinte, nesse sentido, dessa forma) sem repetir o mesmo conector.
5. COERÊNCIA: argumentos encadeados logicamente, sem fugir ao tema nem contradizer dados.
6. REPERTÓRIO: traga ao menos uma referência sociocultural legítima e pertinente (filósofo, lei, dado, obra, fato histórico) integrada ao argumento — nunca decorativa nem inventada.
7. ESTRUTURA OBRIGATÓRIA (4 a 5 parágrafos):
   - Introdução: contextualização + tese clara.
   - 2 parágrafos de desenvolvimento: cada um com tópico frasal, argumentação e repertório.
   - Conclusão: proposta de intervenção detalhada (agente, ação, meio, finalidade, detalhamento).
8. EXTENSÃO: entre 25 e 30 linhas (aprox. 280 a 350 palavras). Nunca menos que 250 palavras.
9. LINGUAGEM: norma culta, impessoal (3ª pessoa). Proibido: gírias, abreviações, 1ª pessoa, clichês ("desde os primórdios", "nos dias de hoje"), perguntas retóricas, exclamações.
10. FORMATAÇÃO PROIBIDA: nada de **, negrito, itálico, emojis, hashtags, marcadores, listas, travessões "–" "—", reticências "...", aspas inglesas " ", parênteses explicativos longos. Use apenas vírgula, ponto, ponto e vírgula, dois-pontos e aspas simples se necessário.

ANTES DE RESPONDER, revise mentalmente o texto completo procurando: erros de acentuação, concordância, regência, palavras trocadas, repetições, frases ambíguas. Corrija TUDO antes de entregar.

FORMATO DE SAÍDA (exatamente assim, sem nenhum texto extra):
TITULO: [título curto, nominal, sem ponto final, sem aspas]
TEXTO: [redação completa em parágrafos separados por uma linha em branco]`,
];

const promptsHumanizacao = [
  `Você é um estudante brasileiro de ensino médio bem preparado, reescrevendo a própria redação para soar mais natural — SEM introduzir nenhum erro.

REGRAS ABSOLUTAS:
1. Mantenha 100% dos argumentos, tese, repertório e proposta de intervenção.
2. Mantenha a estrutura em parágrafos e a extensão (não encurte).
3. Continue em norma culta e 3ª pessoa. NÃO use 1ª pessoa, gírias nem coloquialismos.
4. NÃO introduza erros: a ortografia, a acentuação, a concordância, a regência e a pontuação devem permanecer impecáveis.
5. Apenas suavize: varie conectivos repetidos, troque uma ou outra palavra rebuscada por sinônimo mais comum, ajuste ritmo das frases (algumas mais curtas, outras mais longas).
6. Proibido: **, negrito, emojis, travessões "–" "—", reticências "...", listas, marcadores, comentários, explicações.
7. Revise mentalmente buscando qualquer erro de português antes de devolver — corrija tudo.

TEXTO ORIGINAL:
{textoRedacao}

Devolva APENAS o texto reescrito, sem título, sem rótulos, sem comentários.`,
];

async function callLovableAI(prompt: string): Promise<string> {
  const response = await fetch("/api/redacao/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error((errData as any).error || `Flux Redação error: ${response.status}`);
  }

  const data = await response.json();
  return (data as any).text || "";
}

// ---- Types ----

export interface GeneratedRedacao {
  title: string;
  body: string;
  questionId: string;
  questionType: string;
  redacao: RedacaoItem;
}

// ---- Generate (no submit) ----

export async function generateRedacao(
  redacao: RedacaoItem,
  authToken: string,
  onNotify: (msg: string) => void,
): Promise<GeneratedRedacao> {
  onNotify("BUSCANDO CONTEÚDO DA REDAÇÃO...");

  const data = await fetchRedacaoContent(
    redacao.id,
    authToken,
    redacao.room_name_for_apply,
    redacao.answer_id,
  );

  let questionId: string | null = null;
  let questionType: string | null = null;

  if (data.questions?.length > 0) {
    questionId = data.questions[0].id;
    questionType = data.questions[0].type;
  } else if (data.statements?.[0]?.questions?.length > 0) {
    questionId = data.statements[0].questions[0].id;
    questionType = data.statements[0].questions[0].type;
  }

  if (!questionId || !questionType) {
    throw new Error("ID ou Tipo da Questão não encontrado para esta redação.");
  }

  let fullContent = `Título da Redação: ${redacao.title}\n\n`;
  fullContent += `Descrição: ${stripHtml(data.description || "N/A")}\n\n`;

  let rawStatement = "";
  if (data.statements?.length > 0) {
    rawStatement = data.statements[0].statement || data.statements[0].text || "";
  } else if (data.questions?.length > 0) {
    rawStatement = data.questions[0].statement || data.questions[0].text || "";
  }

  const sections = parseRedactionSections(rawStatement);
  if (sections["ENUNCIADO"].content) {
    fullContent += `Enunciado:\n${sections["ENUNCIADO"].content}\n\n`;
  }
  const texts = ["Texto I", "Texto II", "Texto III"]
    .map((k) => sections[k])
    .filter((s) => s.content && s.content !== "[IMAGEM]")
    .map((s) => s.content);
  if (texts.length > 0) {
    fullContent += `Textos de Apoio:\n${texts.join("\n\n")}\n\n`;
  }

  // Generate with Lovable AI
  onNotify("GERANDO REDAÇÃO COM IA...");
  const prompt = promptsGeracao[0].replace("{dadosRedacao}", fullContent);
  const rawResponse = await callLovableAI(prompt);

  if (!rawResponse.includes("TITULO:") || !rawResponse.includes("TEXTO:")) {
    throw new Error("Resposta da IA inválida - formato inesperado");
  }

  const generatedTitle = rawResponse
    .split("TITULO:")[1]
    .split("TEXTO:")[0]
    .replace(/^Título:\s*/i, "")
    .replace(/#/g, "")
    .trim();
  const generatedText = rawResponse.split("TEXTO:")[1].trim();

  // Humanize
  onNotify("HUMANIZANDO TEXTO...");
  const humanizePrompt = promptsHumanizacao[0].replace("{textoRedacao}", generatedText);
  const humanizedText = await callLovableAI(humanizePrompt);
  if (!humanizedText) throw new Error("Humanização retornou texto vazio");

  onNotify("REDAÇÃO GERADA! REVISE ANTES DE ENVIAR.");

  return {
    title: generatedTitle,
    body: humanizedText,
    questionId,
    questionType,
    redacao,
  };
}

// ---- Submit ----

export async function submitRedacao(
  generated: GeneratedRedacao,
  authToken: string,
  onNotify: (msg: string) => void,
  editedTitle?: string,
  editedBody?: string,
  status: "draft" | "submitted" = "submitted",
): Promise<void> {
  const { redacao } = generated;
  const finalTitle = editedTitle ?? generated.title;
  const finalBody = editedBody ?? generated.body;

  onNotify(status === "draft" ? "SALVANDO RASCUNHO..." : "ENVIANDO REDAÇÃO...");

  const response = await fetch("/api/redacao/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generated,
      authToken,
      editedTitle: finalTitle,
      editedBody: finalBody,
      status,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(async () => ({ error: await response.text() }));
    throw new Error(errorData.error || `HTTP ${response.status}: falha ao enviar redação`);
  }

  const result = await response.json().catch(() => ({}));
  if (result.roomName && result.roomName !== redacao.room_name_for_apply) {
    onNotify(`Redação aceita pela sala "${result.roomName}"`);
  }
  onNotify(status === "draft" ? "RASCUNHO SALVO!" : "REDAÇÃO CONCLUÍDA E ENVIADA!");
}

