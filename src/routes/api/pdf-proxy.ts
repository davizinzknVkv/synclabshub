import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_HOSTS = [
  "r2.cupiditys.lol",
  "apostilas.cupiditys.lol",
  "pub-761ea6e47fa74db3a9b6ffc7656d8e73.r2.dev",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
} as const;

async function handle(request: Request) {
  const url = new URL(request.url);
  const target = url.searchParams.get("url");
  if (!target) {
    return new Response("Missing url", { status: 400, headers: corsHeaders });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("Invalid url", { status: 400, headers: corsHeaders });
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new Response("Host not allowed", { status: 403, headers: corsHeaders });
  }

  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) headers.set("range", range);
  headers.set(
    "user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  );

  try {
    const upstream = await fetch(parsed.toString(), { headers });
    const out = new Headers();
    for (const k of [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
      "etag",
      "last-modified",
    ]) {
      const v = upstream.headers.get(k);
      if (v) out.set(k, v);
    }
    if (!out.has("content-type")) out.set("content-type", "application/pdf");
    out.set("content-disposition", "inline");
    for (const [k, v] of Object.entries(corsHeaders)) out.set(k, v);

    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Proxy error" }),
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
}

export const Route = createFileRoute("/api/pdf-proxy")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => handle(request),
    },
  },
});
