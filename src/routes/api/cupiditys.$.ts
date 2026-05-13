// Proxy server-side para o stack do khanto (cupiditys.lol).
// Encaminha:
//   /api/cupiditys/khan/<rest>  -> https://khan.cupiditys.lol/<rest>
//   /api/cupiditys/task/<rest>  -> https://taskitos.cupiditys.lol/<rest>
// Adiciona o Origin oficial pro taskitos não bloquear.

import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Captcha-Token, X-Api-Key",
  "Access-Control-Max-Age": "86400",
};

const OFFICIAL_ORIGIN = "https://khan.cupiditys.lol";

function targetFor(splat: string): string | null {
  if (splat.startsWith("khan/")) return "https://khan.cupiditys.lol/" + splat.slice(5);
  if (splat.startsWith("task/")) return "https://taskitos.cupiditys.lol/" + splat.slice(5);
  return null;
}

async function handle(request: Request, splat: string): Promise<Response> {
  const target = targetFor(splat);
  if (!target) {
    return new Response(JSON.stringify({ error: "unknown target" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const url = new URL(request.url);
  const finalUrl = target + (url.search || "");

  // Reconstrói headers — só passa adiante o que importa
  const fwdHeaders = new Headers();
  for (const [k, v] of request.headers.entries()) {
    const key = k.toLowerCase();
    if (
      key === "host" ||
      key === "origin" ||
      key === "referer" ||
      key === "content-length" ||
      key.startsWith("cf-") ||
      key.startsWith("x-forwarded-")
    ) continue;
    fwdHeaders.set(k, v);
  }
  fwdHeaders.set("Origin", OFFICIAL_ORIGIN);
  fwdHeaders.set("Referer", OFFICIAL_ORIGIN + "/");

  const init: RequestInit = {
    method: request.method,
    headers: fwdHeaders,
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(finalUrl, init);
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const respHeaders = new Headers();
  const ct = upstream.headers.get("content-type");
  if (ct) respHeaders.set("Content-Type", ct);
  for (const [k, v] of Object.entries(CORS)) respHeaders.set(k, v);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

export const Route = createFileRoute("/api/cupiditys/$")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request, params }) => handle(request, params._splat || ""),
      POST: async ({ request, params }) => handle(request, params._splat || ""),
      PUT: async ({ request, params }) => handle(request, params._splat || ""),
      DELETE: async ({ request, params }) => handle(request, params._splat || ""),
    },
  },
});
