const EDUSP_PROXY = '/api/proxy';
const LEIASP_PROXY = '/api/leiasp';

function getEduspHeaders(authToken?: string) {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-api-realm': 'edusp',
    'x-api-platform': 'webclient',
  };
  if (authToken) h['x-api-key'] = authToken;
  return h;
}

async function post(url: string, body: unknown, headers?: Record<string, string>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: headers || { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { return {}; }
}

async function get(url: string, headers?: Record<string, string>) {
  const res = await fetch(url, { method: 'GET', headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { return {}; }
}

// ─── Step 1: Generate LeiaSP token from authToken ─────────────────────
export async function generateLeiaSpToken(authToken: string): Promise<string> {
  const data = await get(
    `${EDUSP_PROXY}/mas/external-auth/seducsp_token/generate?card_label=LeiaSP%2B`,
    getEduspHeaders(authToken)
  );
  if (!data.token) throw new Error('Falha ao gerar token LeiaSP');
  return data.token;
}

// ─── Step 2: Exchange LeiaSP token for bearer token ───────────────────
export interface ElefanteSession {
  bearerToken: string;
  refreshToken: string;
  expiresAt: string;
}

export async function loginElefante(leiaSpToken: string): Promise<ElefanteSession> {
  const data = await post(`${LEIASP_PROXY}/token`, {
    source: 'elefante',
    token_leia: leiaSpToken,
  });
  if (!data.success) throw new Error(data.message || 'Falha ao autenticar no Elefante');
  return {
    bearerToken: data.bearer_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  };
}

// ─── Step 3: Get books ────────────────────────────────────────────────
export interface BookItem {
  slug: string;
  title: string;
  author?: string;
  reading_percent: number;
  total_pages?: number;
  image_url_thumb?: string;
  imageUrlThumb?: string;
  [key: string]: unknown;
}

export async function getBooks(bearerToken: string): Promise<BookItem[]> {
  const data = await post(`${LEIASP_PROXY}/livros`, {
    source: 'elefante',
    bearer_token: bearerToken,
    search: '',
    action: 'all',
  });
  if (data.success === false && data.message?.includes('401')) {
    throw new Error('Token expirado (401)');
  }
  const books: BookItem[] = data.books || [];
  // Normalize reading_percent from 0-1 to 0-100
  books.forEach(b => {
    if (b.reading_percent > 0 && b.reading_percent <= 1) {
      b.reading_percent = b.reading_percent * 100;
    }
  });
  return books;
}

// ─── Step 4: Get book details ─────────────────────────────────────────
export async function getBookDetails(bearerToken: string, bookSlug: string) {
  const data = await post(`${LEIASP_PROXY}/bookdetails`, {
    bearer_token: bearerToken,
    book_slug: bookSlug,
    source: 'elefante',
  });
  return data;
}

// ─── Step 5: Get preview (recommended timing) ─────────────────────────
export async function getPreview(bearerToken: string, bookSlug: string) {
  const data = await post(`${LEIASP_PROXY}/preview`, {
    bearer_token: bearerToken,
    book_slug: bookSlug,
    source: 'elefante',
  });
  return data;
}

// ─── Step 6: Start background reading ─────────────────────────────────
export interface ReadJobResult {
  success: boolean;
  job_id?: string;
  message?: string;
}

export async function startBackgroundRead(
  bearerToken: string,
  refreshToken: string,
  bookSlug: string,
  timeMinutes: number
): Promise<ReadJobResult> {
  const data = await post(`${LEIASP_PROXY}/read/background`, {
    bearer_token: bearerToken,
    refresh_token: refreshToken,
    book_slug: bookSlug,
    time: timeMinutes,
  });
  return data;
}

// ─── Step 7: Check job status ─────────────────────────────────────────
export async function checkJobStatus(bearerToken: string, jobId: string) {
  const data = await post(`${LEIASP_PROXY}/read/job-status`, {
    bearer_token: bearerToken,
    job_id: jobId,
  });
  return data;
}

// ─── Step 8: Refresh token ────────────────────────────────────────────
export async function refreshElefanteToken(refreshTokenValue: string): Promise<ElefanteSession> {
  const data = await post(`${LEIASP_PROXY}/refresh_token`, {
    refresh_token: refreshTokenValue,
    source: 'elefante',
  });
  if (!data.success) throw new Error(data.message || 'Falha ao renovar token');
  return {
    bearerToken: data.bearer_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  };
}
