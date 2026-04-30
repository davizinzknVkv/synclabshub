const config = {
  API_BASE_URL: 'https://edusp-api.ip.tv',
  USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
  CATALYST_API_URL: 'https://catalyst.crimsonstrauss.xyz/complete',
  STATUS_SERVER_URL: 'https://statusbis.biscurim.space'
};

export interface TaskItem {
  id: number;
  title: string;
  token: string;
  room: string;
  type: string;
  publication_target?: string;
  room_info?: { name: string };
  score?: number;
  [key: string]: unknown;
}

function getDefaultHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-api-realm': 'edusp',
    'x-api-platform': 'webclient',
    'User-Agent': config.USER_AGENT,
    'Connection': 'keep-alive',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
  };
}

async function makeRequest(url: string, method = 'GET', headers: Record<string, string> = {}, body?: unknown) {
  const options: RequestInit = { method, headers: { ...headers } };
  if (body && typeof body === 'object' && Object.keys(body as object).length > 0) {
    options.body = JSON.stringify(body);
  }
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

async function sendStatusToServer(endpoint: string, data: unknown) {
  try {
    await fetch(`${config.STATUS_SERVER_URL}/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.log('Status server error:', error);
  }
}

export async function fetchTasksWithToken(
  authToken: string,
  taskFilter: string,
  onNotify: (msg: string) => void
): Promise<TaskItem[]> {
  onNotify('BUSCANDO LIÇÕES...');

  const roomData = await makeRequest(
    `${config.API_BASE_URL}/room/user?list_all=true&with_cards=true`,
    'GET',
    { ...getDefaultHeaders(), 'x-api-key': authToken }
  );

  if (!roomData.rooms || roomData.rooms.length === 0) {
    throw new Error('NENHUMA SALA ENCONTRADA');
  }

  const uniqueTargets = new Set<string>();
  const roomIdToNameMap = new Map<string, string>();
  const firstRoomName = roomData.rooms[0].name;

  roomData.rooms.forEach((room: { name: string; id: number }) => {
    uniqueTargets.add(room.name);
    roomIdToNameMap.set(room.id.toString(), room.name);
  });

  const roomUserJsonString = JSON.stringify(roomData);
  const idMatches = roomUserJsonString.match(/"id"\s*:\s*(\d+)(?!\d)/g) || [];
  idMatches.forEach((m: string) => {
    const id = m.match(/\d+/)?.[0];
    if (id && !roomIdToNameMap.has(id) && !uniqueTargets.has(id)) {
      uniqueTargets.add(id);
    }
  });

  const targetsArray = Array.from(uniqueTargets);
  const allTasks = await fetchTasks(authToken, targetsArray, taskFilter);

  if (allTasks.length === 0) throw new Error('NENHUMA ATIVIDADE ENCONTRADA');

  const processed: TaskItem[] = allTasks.map((task) => {
    let effectiveRoom: string | null = null;
    if (task.room_info?.name) {
      effectiveRoom = task.room_info.name;
    } else {
      const pubTarget = task.publication_target as string;
      if (roomIdToNameMap.has(pubTarget)) {
        effectiveRoom = roomIdToNameMap.get(pubTarget)!;
      } else if (pubTarget?.includes(':')) {
        effectiveRoom = pubTarget.split(':')[0];
      } else if (pubTarget?.startsWith('r')) {
        effectiveRoom = pubTarget;
      }
    }
    if (!effectiveRoom || !effectiveRoom.startsWith('r')) effectiveRoom = firstRoomName;
    return { ...task, token: authToken, room: effectiveRoom ?? firstRoomName, type: taskFilter } as TaskItem;
  });

  return processed;
}

export interface DashboardStats {
  pendencias: number;
  faltas: number;
  frequencia: number;
  turma?: string;
}

export async function fetchDashboardStats(authToken: string): Promise<DashboardStats> {
  const headers = { ...getDefaultHeaders(), 'x-api-key': authToken };

  // Fetch rooms to get targets
  const roomData = await makeRequest(
    `${config.API_BASE_URL}/room/user?list_all=true&with_cards=true`,
    'GET',
    headers
  );

  const rooms = roomData.rooms || [];
  const uniqueTargets = new Set<string>();
  let turma = '';

  rooms.forEach((room: { name: string; id: number }) => {
    uniqueTargets.add(room.name);
    if (!turma && room.name) turma = room.name;
  });

  const targetsArray = Array.from(uniqueTargets);

  // Fetch pending tasks count
  let pendencias = 0;
  try {
    const pendingTasks = await fetchTasks(authToken, targetsArray, 'pending');
    pendencias = pendingTasks.length;
  } catch {
    pendencias = 0;
  }

  // Fetch attendance/frequency data
  let faltas = 0;
  let frequencia = 100;
  try {
    const freqData = await makeRequest(
      `${config.API_BASE_URL}/school_class/frequency`,
      'GET',
      headers
    );
    if (freqData && typeof freqData === 'object') {
      if (Array.isArray(freqData)) {
        let totalClasses = 0;
        let totalAbsences = 0;
        freqData.forEach((entry: { absences?: number; total_classes?: number }) => {
          totalAbsences += entry.absences || 0;
          totalClasses += entry.total_classes || 0;
        });
        faltas = totalAbsences;
        frequencia = totalClasses > 0 ? Math.round(((totalClasses - totalAbsences) / totalClasses) * 100) : 100;
      } else if (freqData.frequency !== undefined) {
        frequencia = Math.round(freqData.frequency);
        faltas = freqData.absences || 0;
      } else if (freqData.total_absences !== undefined) {
        faltas = freqData.total_absences;
        const total = freqData.total_classes || 0;
        frequencia = total > 0 ? Math.round(((total - faltas) / total) * 100) : 100;
      }
    }
  } catch {
    // Frequency endpoint may not be available
  }

  return { pendencias, faltas, frequencia, turma };
}

async function fetchTasks(token: string, targetPublications: string[], taskFilter: string) {
  const params: Record<string, unknown> = {
    limit: 100, offset: 0, with_answer: true, with_apply_moment: true,
  };
  if (taskFilter === 'expired') {
    params.expired_only = true; params.filter_expired = false;
    params.is_exam = false; params.is_essay = false;
  } else {
    params.expired_only = false; params.filter_expired = true;
    params.is_exam = false; params.is_essay = false;
  }

  const statusParams = `answer_statuses=${encodeURIComponent('pending')}&answer_statuses=${encodeURIComponent('draft')}`;
  const targetParams = targetPublications.map(t => `publication_target=${encodeURIComponent(t)}`).join('&');
  const queryStr = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
  const url = `${config.API_BASE_URL}/tms/task/todo?${queryStr}&${targetParams}&${statusParams}`;

  try {
    const data = await makeRequest(url, 'GET', { ...getDefaultHeaders(), 'x-api-key': token });
    return (data as TaskItem[]).map(task => ({ ...task, token, room: task.publication_target, type: taskFilter }));
  } catch {
    return [];
  }
}

export async function sendTasksToCatalyst(
  tasks: TaskItem[],
  isDraft: boolean,
  minTime: number,
  maxTime: number,
  ra: string,
  onNotify: (msg: string) => void
) {
  if (tasks.length === 0) { onNotify('NENHUMA ATIVIDADE VÁLIDA'); return; }

  onNotify(`${tasks.length} ATIVIDADES ENVIADAS PARA PROCESSAMENTO`);
  let successCount = 0;
  let errorCount = 0;

  for (const task of tasks) {
    try {
      onNotify(`ENVIANDO: ${task.title.substring(0, 25)}...`);
      const payload = {
        tasks: [{ ...task, score: task.score, is_prova: false, task_id: task.id, id: undefined }],
        auth_token: task.token,
        room_name_for_apply: task.room,
        time_min: minTime, time_max: maxTime,
        is_draft: isDraft, salvar_rascunho: isDraft,
      };
      await makeRequest(config.CATALYST_API_URL, 'POST', { 'Content-Type': 'application/json' }, payload);
      successCount++;
    } catch {
      errorCount++;
      onNotify(`ERRO: '${task.title.substring(0, 20)}...'`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  if (successCount > 0) {
    onNotify(`${successCount} DE ${tasks.length} PROCESSADAS COM SUCESSO`);
    await sendStatusToServer('task-status', { ra, taskCount: successCount, taskType: isDraft ? 'rascunhos' : 'lições', status: 'success', message: `${successCount} tarefas processadas` });
  }
  if (errorCount > 0) {
    onNotify(`${errorCount} ATIVIDADES FALHARAM`);
    await sendStatusToServer('task-status', { ra, taskCount: errorCount, taskType: isDraft ? 'rascunhos' : 'lições', status: 'error', message: `${errorCount} tarefas falharam` });
  }
}
