import { createFileRoute } from "@tanstack/react-router";

const UPSTREAM = "https://sedintegracoes.educacao.sp.gov.br/saladofuturobffapi";
const SUBSCRIPTION_KEY = "d701a2043aa24d7ebb37e9adf60d043b";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

async function proxyRequest(request: Request, splat: string) {
  const url = new URL(request.url);
  const upstreamUrl = `${UPSTREAM}/${splat}${url.search}`;

  const headers = new Headers();
  const auth = request.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  headers.set("Ocp-Apim-Subscription-Key", SUBSCRIPTION_KEY);
  headers.set("X-Product-Name", "SalaDoFuturo");
  headers.set("Accept", "application/json, text/plain, */*");
  headers.set("origin", "https://saladofuturo.educacao.sp.gov.br");
  headers.set("referer", "https://saladofuturo.educacao.sp.gov.br/");
  headers.set(
    "user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  );

  try {
    const upstream = await fetch(upstreamUrl, { method: request.method, headers, redirect: "follow" });
    const body = await upstream.arrayBuffer();
    const respHeaders = new Headers(corsHeaders);
    const ct = upstream.headers.get("content-type");
    if (ct) respHeaders.set("Content-Type", ct);
    return new Response(body, { status: upstream.status, headers: respHeaders });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Proxy error" }),
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
}

export const Route = createFileRoute("/api/boletim/$")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request, params }) => proxyRequest(request, params._splat!),
    },
  },
});
