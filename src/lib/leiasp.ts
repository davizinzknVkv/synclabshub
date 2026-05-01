const API_BASE_URL = '/api/proxy';

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

export interface ReadingItem {
  id: number;
  title: string;
  room: string;
  status: string;
  total_pages?: number;
  current_page?: number;
  book_id?: number;
  publication_target?: string;
  [key: string]: unknown;
}

export async function fetchReadings(
  authToken: string,
  onNotify: (msg: string) => void,
  nick?: string
): Promise<{ readings: ReadingItem[]; targets: string[] }> {
  onNotify('BUSCANDO LEITURAS...');

  const headers = { ...getDefaultHeaders(), 'x-api-key': authToken };

  // Get rooms first
  const roomData = await makeRequest(
    `${API_BASE_URL}/room/user?list_all=true&with_cards=true`,
    'GET',
    headers
  );

  if (!roomData.rooms || roomData.rooms.length === 0) {
    throw new Error('NENHUMA SALA ENCONTRADA');
  }

  const uniqueTargets = new Set<string>();
  const roomIdToNameMap = new Map<string, string>();
  const firstRoomName = roomData.rooms[0].name;

  roomData.rooms.forEach((room: { name: string; id: number }) => {
    uniqueTargets.add(room.name);
    if (nick) uniqueTargets.add(`${room.name}:${nick}`);
    roomIdToNameMap.set(room.id.toString(), room.name);
  });

  const targetsArray = Array.from(uniqueTargets);

  // Fetch reading tasks (Leia SP uses task type with is_reading or specific endpoints)
  const targetParams = targetsArray.map(t => `publication_target=${encodeURIComponent(t)}`).join('&');

  // Try fetching from reading-specific endpoint
  let readings: ReadingItem[] = [];

  try {
    // Fetch Leia SP books/readings
    const readingData = await makeRequest(
      `${API_BASE_URL}/lms/reading?${targetParams}&limit=100&offset=0`,
      'GET',
      headers
    );

    if (Array.isArray(readingData)) {
      readings = readingData.map((r: Record<string, unknown>) => ({
        ...r,
        id: r.id as number,
        title: (r.title || r.name || 'Leitura sem título') as string,
        room: (roomIdToNameMap.get(String(r.publication_target)) || firstRoomName),
        status: (r.status || 'pending') as string,
        total_pages: (r.total_pages || r.pages_count || 0) as number,
        current_page: (r.current_page || r.read_pages || 0) as number,
      }));
    }
  } catch {
    // Fallback: try fetching from tms/task with reading filter
    onNotify('TENTANDO ENDPOINT ALTERNATIVO...');
  }

  // Fallback: use tms/task/todo with reading-specific params
  if (readings.length === 0) {
    try {
      const taskData = await makeRequest(
        `${API_BASE_URL}/tms/task/todo?limit=100&offset=0&with_answer=true&with_apply_moment=true&expired_only=false&filter_expired=true&is_exam=false&is_essay=false&answer_statuses=pending&answer_statuses=draft&${targetParams}`,
        'GET',
        headers
      );

      if (Array.isArray(taskData)) {
        // Filter for reading-type tasks (Leia SP tasks often have specific patterns in title/type)
        readings = taskData
          .filter((t: Record<string, unknown>) => {
            const title = String(t.title || '').toLowerCase();
            const taskType = String(t.task_type || t.type || '').toLowerCase();
            return title.includes('leia') || title.includes('leitura') || title.includes('reading') ||
              taskType.includes('reading') || taskType.includes('leia');
          })
          .map((t: Record<string, unknown>) => ({
            ...t,
            id: t.id as number,
            title: (t.title || 'Leitura') as string,
            room: (roomIdToNameMap.get(String(t.publication_target)) || firstRoomName),
            status: 'pending',
          }));
      }
    } catch {
      // If both fail, try a third approach
    }
  }

  // If still nothing, fetch ALL tasks and let user see them
  if (readings.length === 0) {
    try {
      const allTasks = await makeRequest(
        `${API_BASE_URL}/tms/task/todo?limit=100&offset=0&with_answer=true&with_apply_moment=true&expired_only=false&filter_expired=true&is_exam=false&is_essay=false&answer_statuses=pending&answer_statuses=draft&${targetParams}`,
        'GET',
        headers
      );

      if (Array.isArray(allTasks)) {
        readings = allTasks.map((t: Record<string, unknown>) => ({
          ...t,
          id: t.id as number,
          title: (t.title || 'Atividade') as string,
          room: (roomIdToNameMap.get(String(t.publication_target)) || firstRoomName),
          status: 'pending',
        }));
        onNotify(`${readings.length} ATIVIDADES ENCONTRADAS (MOSTRANDO TODAS)`);
      }
    } catch (err) {
      throw new Error(`ERRO AO BUSCAR LEITURAS: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  }

  if (readings.length === 0) {
    throw new Error('NENHUMA LEITURA ENCONTRADA');
  }

  onNotify(`${readings.length} LEITURAS ENCONTRADAS`);
  return { readings, targets: targetsArray };
}

export async function completeReading(
  reading: ReadingItem,
  authToken: string,
  onNotify: (msg: string) => void
): Promise<boolean> {
  const headers = { ...getDefaultHeaders(), 'x-api-key': authToken };
  const roomName = reading.room;

  onNotify(`COMPLETANDO: ${reading.title.substring(0, 30)}...`);

  // Try to mark reading as complete by submitting answer
  const methods = ['POST', 'PUT', 'PATCH'];
  const roomParam = `room_name=${encodeURIComponent(roomName)}`;

  for (const method of methods) {
    try {
      const submitUrl = `${API_BASE_URL}/tms/task/${reading.id}/answer?${roomParam}`;
      const body = {
        content: '',
        score: 100,
        is_finished: true,
        completed: true,
        preview_mode: false,
      };

      await makeRequest(submitUrl, method, headers, body);
      onNotify(`✓ ${reading.title.substring(0, 30)}... CONCLUÍDA!`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('405') || msg.includes('404')) continue;
      // For other errors, try next method
      if (methods.indexOf(method) < methods.length - 1) continue;
      onNotify(`✗ ${reading.title.substring(0, 30)}... ERRO: ${msg}`);
      return false;
    }
  }

  onNotify(`✗ ${reading.title.substring(0, 30)}... TODOS OS MÉTODOS FALHARAM`);
  return false;
}

export async function completeAllReadings(
  readings: ReadingItem[],
  authToken: string,
  onNotify: (msg: string) => void
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const reading of readings) {
    const ok = await completeReading(reading, authToken, onNotify);
    if (ok) success++;
    else failed++;
    // Small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }

  onNotify(`CONCLUÍDO: ${success} OK, ${failed} FALHAS`);
  return { success, failed };
}
