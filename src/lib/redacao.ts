/**
 * Redação Paulista — fetch, generate (Lovable AI), and submit essays
 */

const API_BASE_URL = '/api/proxy';

export interface RedacaoItem {
  id: number;
  title: string;
  status: 'pending' | 'draft';
  room_name_for_apply: string;
  answer_id?: string;
  answer_status?: string;
  tags: string[];
  publication_target?: string;
  [key: string]: unknown;
}

function getDefaultHeaders(authToken?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-api-realm': 'edusp',
    'x-api-platform': 'webclient',
  };
  if (authToken) headers['x-api-key'] = authToken;
  return headers;
}

async function makeRequest(url: string, method = 'GET', headers: Record<string, string> = {}, body?: unknown) {
  const options: RequestInit = { method, headers: { ...headers } };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  try { return await response.json(); } catch { return {}; }
}

function isRedacao(task: { tags?: string[]; title?: string }) {
  const tags = task.tags || [];
  return tags.some((t: string) => t.toLowerCase().includes('redacao')) ||
    (task.title || '').toLowerCase().includes('redação');
}

export async function fetchRedacoes(
  authToken: string,
  onNotify: (msg: string) => void,
  nick?: string
): Promise<RedacaoItem[]> {
  onNotify('BUSCANDO REDAÇÕES...');

  const roomData = await makeRequest(
    `${API_BASE_URL}/room/user?list_all=true&with_cards=true`,
    'GET',
    getDefaultHeaders(authToken)
  );

  const rooms = roomData.rooms || [];
  if (rooms.length === 0) throw new Error('NENHUMA SALA ENCONTRADA');

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
  const targetParams = targetsArray.map(t => `publication_target=${encodeURIComponent(t)}`).join('&');
  const statusParams = `answer_statuses=${encodeURIComponent('pending')}&answer_statuses=${encodeURIComponent('draft')}`;
  const url = `${API_BASE_URL}/tms/task/todo?${commonParams}&${targetParams}&${statusParams}`;

  let allTasks: any[] = [];
  try {
    allTasks = await makeRequest(url, 'GET', getDefaultHeaders(authToken));
  } catch { allTasks = []; }

  if (!Array.isArray(allTasks)) allTasks = [];

  const redacoesMap = new Map<number, RedacaoItem>();

  allTasks.filter(isRedacao).forEach((task: any) => {
    const actualStatus: 'pending' | 'draft' = task.answer_status === 'draft' ? 'draft' : 'pending';
    let roomName = '';
    if (task.publication_target) {
      if (task.publication_target.includes(':')) {
        roomName = task.publication_target.split(':')[0];
      } else if (roomIdToNameMap.has(task.publication_target)) {
        roomName = roomIdToNameMap.get(task.publication_target)!;
      } else {
        roomName = task.publication_target;
      }
    }

    if (redacoesMap.has(task.id)) {
      const existing = redacoesMap.get(task.id)!;
      if (existing.status === 'draft' && actualStatus === 'pending') {
        redacoesMap.set(task.id, { ...task, status: actualStatus, room_name_for_apply: roomName, answer_id: task.answer_id });
      }
    } else {
      redacoesMap.set(task.id, { ...task, status: actualStatus, room_name_for_apply: roomName, answer_id: task.answer_id });
    }
  });

  const result = Array.from(redacoesMap.values());
  onNotify(`${result.length} REDAÇÕES ENCONTRADAS`);
  return result;
}

// ---- Content fetching & parsing ----

async function fetchRedacaoContent(taskId: number, token: string, roomName: string, answerId?: string) {
  const answerParams = answerId
    ? `&answer_id=${answerId}&answer_fields=id&answer_fields=nick&answer_fields=status&answer_fields=task_id&answer_fields=answers&answer_fields=duration`
    : '';
  const url = `${API_BASE_URL}/tms/task/${taskId}/apply?preview_mode=false${answerParams}&token_code=null&room_name=${roomName}`;
  return makeRequest(url, 'GET', { 'x-api-key': token });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function removeUrls(text: string): string {
  return text.replace(/(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\/[^\s]*)/g, '').trim();
}

function parseRedactionSections(rawHtml: string) {
  const sections: Record<string, { content: string; isImage: boolean }> = {
    'ENUNCIADO': { content: '', isImage: false },
    'Texto I': { content: '', isImage: false },
    'Texto II': { content: '', isImage: false },
    'Texto III': { content: '', isImage: false },
  };
  const sectionIdentifiers = ['Texto I', 'Texto II', 'Texto III', 'ENUNCIADO'];

  for (const id of sectionIdentifiers) {
    const regex = new RegExp(`<strong[^>]*>\\s*${id}\\s*</strong>([\\s\\S]*?)(?=<strong|$)`, 'i');
    const match = rawHtml.match(regex);
    if (match) {
      const content = match[1];
      const hasImage = content.includes('<img');
      sections[id].isImage = hasImage;
      sections[id].content = hasImage ? '[IMAGEM]' : removeUrls(stripHtml(content)).trim();
    }
  }
  return sections;
}

// ---- Lovable AI ----

const promptsGeracao = [
  `Olá! Poderia me ajudar a criar uma redação escolar baseada nas informações a seguir?
Por favor, inclua:
1. Um título para a redação
2. O texto completo da redação
3. Não adicione ** ou negrito no TÍTULO ou no TEXTO
4. Não adicione nenhum emoji nem símbolos no texto
5. Não use simbolos no texto! como "–" ou "—" ou qualquer outro e tambem não use 3 pontinhos "..."
Formate assim:
TITULO: [Título da redação]
TEXTO: [Texto da redação]
Informações: {dadosRedacao}
Lembre-se: devolva APENAS o texto reescrito, sem quaisquer comentários ou explicações adicionais.`,
];

const promptsHumanizacao = [
  `Olá! Reescreva o seguinte texto acadêmico de maneira mais natural, como se fosse escrito por um estudante.
Regras:
1. Mantenha o conteúdo e argumentos principais
2. Adicione imperfeições naturais
3. Use linguagem acessível
4. Preserve a estrutura
5. Use vocabulário simples de estudante
6. Não use simbolos como "–" ou "—" ou "..."
Texto: {textoRedacao}
Lembre-se: devolva APENAS o texto reescrito, sem quaisquer comentários ou explicações adicionais.`,
];

async function callLovableAI(prompt: string): Promise<string> {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error((errData as any).error || `AI error: ${response.status}`);
  }

  const data = await response.json();
  return (data as any).text || '';
}

// ---- Main process ----

export async function processRedacao(
  redacao: RedacaoItem,
  authToken: string,
  onNotify: (msg: string) => void
): Promise<void> {
  onNotify('BUSCANDO CONTEÚDO DA REDAÇÃO...');

  const data = await fetchRedacaoContent(redacao.id, authToken, redacao.room_name_for_apply, redacao.answer_id);

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
    throw new Error('ID ou Tipo da Questão não encontrado para esta redação.');
  }

  let fullContent = `Título da Redação: ${redacao.title}\n\n`;
  fullContent += `Descrição: ${stripHtml(data.description || 'N/A')}\n\n`;

  let rawStatement = '';
  if (data.statements?.length > 0) {
    rawStatement = data.statements[0].statement || data.statements[0].text || '';
  } else if (data.questions?.length > 0) {
    rawStatement = data.questions[0].statement || data.questions[0].text || '';
  }

  const sections = parseRedactionSections(rawStatement);
  if (sections['ENUNCIADO'].content) {
    fullContent += `Enunciado:\n${sections['ENUNCIADO'].content}\n\n`;
  }
  const texts = ['Texto I', 'Texto II', 'Texto III']
    .map(k => sections[k])
    .filter(s => s.content && s.content !== '[IMAGEM]')
    .map(s => s.content);
  if (texts.length > 0) {
    fullContent += `Textos de Apoio:\n${texts.join('\n\n')}\n\n`;
  }

  // Generate with Lovable AI
  onNotify('GERANDO REDAÇÃO COM IA...');
  const prompt = promptsGeracao[0].replace('{dadosRedacao}', fullContent);
  const rawResponse = await callLovableAI(prompt);

  if (!rawResponse.includes('TITULO:') || !rawResponse.includes('TEXTO:')) {
    throw new Error('Resposta da IA inválida - formato inesperado');
  }

  const generatedTitle = rawResponse.split('TITULO:')[1].split('TEXTO:')[0].replace(/^Título:\s*/i, '').replace(/#/g, '').trim();
  const generatedText = rawResponse.split('TEXTO:')[1].trim();

  // Humanize
  onNotify('HUMANIZANDO TEXTO...');
  const humanizePrompt = promptsHumanizacao[0].replace('{textoRedacao}', generatedText);
  const humanizedText = await callLovableAI(humanizePrompt);
  if (!humanizedText) throw new Error('Humanização retornou texto vazio');

  // Submit as draft
  onNotify('ENVIANDO REDAÇÃO...');
  const submitUrl = redacao.status === 'draft' && redacao.answer_id
    ? `${API_BASE_URL}/tms/task/${redacao.id}/answer/${redacao.answer_id}`
    : `${API_BASE_URL}/tms/task/${redacao.id}/answer`;
  const submitMethod = redacao.status === 'draft' && redacao.answer_id ? 'PUT' : 'POST';

  const requestBody = {
    status: 'draft',
    accessed_on: 'room',
    executed_on: redacao.room_name_for_apply,
    duration: Math.floor(Math.random() * (40 * 60 * 1000 - 30 * 60 * 1000 + 1)) + 30 * 60 * 1000,
    answers: {
      [questionId]: {
        question_id: questionId,
        question_type: questionType,
        answer: {
          title: generatedTitle,
          body: humanizedText,
        },
      },
    },
  };

  await makeRequest(submitUrl, submitMethod, {
    'accept': 'application/json',
    'content-type': 'application/json',
    'referer': 'https://saladofuturo.educacao.sp.gov.br/',
    'x-api-key': authToken,
    'x-api-platform': 'webclient',
    'x-api-realm': 'edusp',
  }, requestBody);

  onNotify('REDAÇÃO CONCLUÍDA E ENVIADA!');
}
