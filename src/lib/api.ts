const config = {
  API_BASE_URL: 'https://edusp-api.ip.tv',
  USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  CATALYST_API_URL: '/api/catalyst/complete',
  CATALYST_JOB_URL: '/api/catalyst/job',
  STATUS_SERVER_URL: '/api/status'
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

export interface FetchTasksResult {
  tasks: TaskItem[];
  targets: string[];
}

export async function fetchTasksWithToken(
  authToken: string,
  taskFilter: string,
  onNotify: (msg: string) => void,
  nick?: string
): Promise<FetchTasksResult> {
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
    // Add nick-based targets like CrimsonZero does
    if (nick) uniqueTargets.add(`${room.name}:${nick}`);
    roomIdToNameMap.set(room.id.toString(), room.name);
    // Add short numeric IDs (3-4 digits)
    const idStr = room.id.toString();
    if (/^\d{3,4}$/.test(idStr)) uniqueTargets.add(idStr);
  });

  const roomUserJsonString = JSON.stringify(roomData);
  const idMatches = roomUserJsonString.match(/"id"\s*:\s*(\d{3,4})(?!\d)/g) || [];
  idMatches.forEach((m: string) => {
    const id = m.match(/\d+/)?.[0];
    if (id) uniqueTargets.add(id);
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

  return { tasks: processed, targets: targetsArray };
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

export async function checkJobStatus(jobId: string): Promise<{ status: string; message?: string }> {
  try {
    const res = await fetch(`${config.CATALYST_JOB_URL}/${jobId}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.status === 404 || res.status === 410) return { status: 'not_found' };
    if (!res.ok) return { status: 'error', message: `HTTP ${res.status}` };
    return await res.json();
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function sendTasksToCatalyst(
  tasks: TaskItem[],
  isDraft: boolean,
  minTime: number,
  maxTime: number,
  ra: string,
  onNotify: (msg: string) => void,
  publicationTargets?: string[],
  userNick?: string
) {
  if (tasks.length === 0) { onNotify('NENHUMA ATIVIDADE VÁLIDA'); return; }

  onNotify(`${tasks.length} ATIVIDADES ENVIADAS PARA PROCESSAMENTO`);
  let successCount = 0;
  let errorCount = 0;

  for (const task of tasks) {
    try {
      onNotify(`ENVIANDO: ${task.title.substring(0, 25)}...`);
      const taskPayload = { ...task } as Record<string, unknown>;
      delete taskPayload.id;
      delete taskPayload.token;
      delete taskPayload.room;
      const payload = {
        tasks: [{ ...taskPayload, type: taskFilterToCatalystType(task.type), score: 100, is_prova: false, task_id: task.id }],
        auth_token: task.token,
        publication_targets: publicationTargets || [],
        room_name_for_apply: task.room || task.publication_target,
        time_min: minTime, time_max: maxTime,
        is_draft: isDraft, salvar_rascunho: isDraft,
        user_nick: userNick || '',
      };
      const result = await makeRequest(config.CATALYST_API_URL, 'POST', { 'Content-Type': 'application/json' }, payload);
      
      if (result?.success) {
        successCount++;
        const jobId = result.job_ids?.[String(task.id)] || null;
        const estimatedMsg = result.message || '';
        onNotify(`✓ ${task.title.substring(0, 25)}... ${estimatedMsg}`);
        
        // Start polling if we got a job ID
        if (jobId) {
          pollJobStatus(jobId, task.title, onNotify);
        }
      } else {
        throw new Error(result?.message || result?.error || 'Resposta inválida');
      }
    } catch (err) {
      errorCount++;
      onNotify(`ERRO: '${task.title.substring(0, 20)}...' - ${err instanceof Error ? err.message : 'Erro'}`);
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

function taskFilterToCatalystType(type: string) {
  return type === 'expired' ? 'expired' : 'task';
}

async function pollJobStatus(jobId: string, taskTitle: string, onNotify: (msg: string) => void) {
  // Wait 90 seconds before first check, then every 30s
  await new Promise(r => setTimeout(r, 90000));
  
  for (let i = 0; i < 20; i++) {
    const result = await checkJobStatus(jobId);
    
    if (result.status === 'concluido') {
      onNotify(`✓ "${taskTitle}" — Concluída!`);
      return;
    }
    if (result.status === 'erro' || result.status === 'not_found') {
      onNotify(`✗ "${taskTitle}" — ${result.message || 'Erro no processamento'}`);
      return;
    }
    
    // Still pending, wait 30s
    await new Promise(r => setTimeout(r, 30000));
  }
  
  onNotify(`⏳ "${taskTitle}" — Tempo esgotado, verifique manualmente`);
}
