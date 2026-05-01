import { createFileRoute } from "@tanstack/react-router";

const UPSTREAM = "https://read.crimsonzerohub.xyz";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

async function proxyRequest(request: Request, splat: string) {
  const url = new URL(request.url);
  const upstreamUrl = `${UPSTREAM}/${splat}${url.search}`;

  const headers = new Headers();
  headers.set("content-type", request.headers.get("content-type") || "application/json");
  headers.set("accept", "application/json");
  headers.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
  headers.set("origin", "https://leiasp.crimsonzerohub.xyz");
  headers.set("referer", "https://leiasp.crimsonzerohub.xyz/");

  const init: RequestInit = {
    method: request.method,
    headers,
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  try {
    const upstream = await fetch(upstreamUrl, init);
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Proxy error" }),
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
}

export const Route = createFileRoute("/api/leiasp/$")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request, params }) => proxyRequest(request, params._splat!),
      POST: async ({ request, params }) => proxyRequest(request, params._splat!),
    },
  },
});
