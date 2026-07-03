import { createFileRoute } from "@tanstack/react-router";

const UPSTREAMS = ["https://edusp-api.ip.tv"];
const RETRYABLE_UPSTREAM_STATUSES = new Set([520, 521, 522, 523, 524, 530]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-api-realm, x-api-platform",
  "Access-Control-Max-Age": "86400",
} as const;

function buildProxyHeaders(request: Request) {
  const headers = new Headers();

  for (const key of ["content-type", "accept", "x-api-key", "x-api-realm", "x-api-platform", "authorization"]) {
    const val = request.headers.get(key);
    if (val) headers.set(key, val);
  }

  headers.set("origin", "https://saladofuturo.educacao.sp.gov.br");
  headers.set("referer", "https://saladofuturo.educacao.sp.gov.br/");
  headers.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
  headers.set("accept-language", "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7");
  headers.set("sec-ch-ua", '"Chromium";v="131", "Not_A Brand";v="24"');
  headers.set("sec-ch-ua-mobile", "?0");
  headers.set("sec-ch-ua-platform", '"Windows"');
  headers.set("sec-fetch-dest", "empty");
  headers.set("sec-fetch-mode", "cors");
  headers.set("sec-fetch-site", "cross-site");

  return headers;
}

function responseWithCors(body: BodyInit | null, status: number, contentType = "application/json") {
  return new Response(body, {
    status,
    headers: { "Content-Type": contentType, ...corsHeaders },
  });
}

async function fetchWithUpstreamFallback(pathWithSearch: string, init: RequestInit) {
  let upstream: Response | null = null;

  for (const baseUrl of UPSTREAMS) {
    upstream = await fetch(`${baseUrl}/${pathWithSearch}`, init);
    if (!RETRYABLE_UPSTREAM_STATUSES.has(upstream.status)) break;
  }

  return upstream;
}

async function proxyTaskTodoByTarget(request: Request, splat: string, init: RequestInit) {
  const url = new URL(request.url);
  const targets = Array.from(new Set(url.searchParams.getAll("publication_target").filter(Boolean)));
  if (request.method !== "GET" || splat !== "tms/task/todo" || targets.length <= 1) return null;

  const merged = new Map<string, unknown>();
  let sawSuccessfulRequest = false;
  let authFailure: { status: number; body: string } | null = null;
  let lastFailure: { status: number; body: string; contentType?: string } | null = null;

  for (const target of targets) {
    const params = new URLSearchParams(url.searchParams);
    params.delete("publication_target");
    params.append("publication_target", target);

    const upstream = await fetchWithUpstreamFallback(`${splat}?${params.toString()}`, init);
    if (!upstream) continue;

    const contentType = upstream.headers.get("content-type") || "application/json";
    const text = await upstream.text();

    if (!upstream.ok) {
      const normalized = text.toLowerCase();
      if (upstream.status === 401 || normalized.includes("wrong credentials") || normalized.includes("x-api-key")) {
        authFailure = { status: upstream.status, body: text };
        break;
      }

      lastFailure = { status: upstream.status, body: text, contentType };
      if (upstream.status === 403 || normalized.includes("forbidden")) continue;
      continue;
    }

    sawSuccessfulRequest = true;
    const data = JSON.parse(text || "[]");
    if (!Array.isArray(data)) continue;

    for (const item of data) {
      const record = item as Record<string, unknown>;
      const key = `${String(record.id ?? crypto.randomUUID())}:${String(record.publication_target ?? target)}`;
      merged.set(key, item);
    }
  }

  if (authFailure) return responseWithCors(authFailure.body, authFailure.status);
  if (sawSuccessfulRequest || merged.size > 0 || lastFailure?.status === 403) {
    return responseWithCors(JSON.stringify(Array.from(merged.values())), 200);
  }
  if (lastFailure) return responseWithCors(lastFailure.body, lastFailure.status, lastFailure.contentType);

  return responseWithCors(JSON.stringify([]), 200);
}

async function proxyRequest(request: Request, splat: string) {
  const url = new URL(request.url);
  const upstreamUrls = UPSTREAMS.map((upstream) => `${upstream}/${splat}${url.search}`);

  const headers = buildProxyHeaders(request);

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "follow",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const taskTodoResponse = await proxyTaskTodoByTarget(request, splat, init);
    if (taskTodoResponse) return taskTodoResponse;

    let upstream: Response | null = null;

    for (const upstreamUrl of upstreamUrls) {
      upstream = await fetch(upstreamUrl, init);
      if (!RETRYABLE_UPSTREAM_STATUSES.has(upstream.status)) break;
    }

    if (!upstream || RETRYABLE_UPSTREAM_STATUSES.has(upstream.status)) {
      return new Response(
        JSON.stringify({ error: "Serviço externo temporariamente indisponível" }),
        { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const body = await upstream.arrayBuffer();
    const respHeaders = new Headers(corsHeaders);
    const ct = upstream.headers.get("content-type");
    if (ct) respHeaders.set("Content-Type", ct);
    const cc = upstream.headers.get("cache-control");
    if (cc) respHeaders.set("Cache-Control", cc);
    return new Response(body, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Proxy error" }),
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
}

export const Route = createFileRoute("/api/proxy/$")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, { status: 204, headers: corsHeaders });
      },
      GET: async ({ request, params }) => proxyRequest(request, params._splat!),
      POST: async ({ request, params }) => proxyRequest(request, params._splat!),
      PUT: async ({ request, params }) => proxyRequest(request, params._splat!),
      DELETE: async ({ request, params }) => proxyRequest(request, params._splat!),
      PATCH: async ({ request, params }) => proxyRequest(request, params._splat!),
    },
  },
});
