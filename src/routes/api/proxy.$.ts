import { createFileRoute } from "@tanstack/react-router";

const UPSTREAM = "https://edusp.crimsonzerohub.xyz";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-api-realm, x-api-platform",
  "Access-Control-Max-Age": "86400",
} as const;

async function proxyRequest(request: Request, splat: string) {
  const url = new URL(request.url);
  const upstreamUrl = `${UPSTREAM}/${splat}${url.search}`;

  const headers = new Headers();
  // Forward relevant headers
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

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "follow",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(upstreamUrl, init);
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
