#!/usr/bin/env node
// Proxy local para testar a API do EDUSP/SP sem passar pelo scrape.do.
// Uso:
//   node local-proxy.mjs
// Depois no navegador (DevTools > Console) ative:
//   localStorage.setItem('localProxyUrl', 'http://localhost:8787')
// Para desativar:
//   localStorage.removeItem('localProxyUrl')
//
// Requer Node 18+ (fetch nativo).

import http from "node:http";

const PORT = Number(process.env.PORT || 8787);
const UPSTREAM = process.env.UPSTREAM || "https://edusp-api.ip.tv";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-api-realm, x-api-platform",
  "Access-Control-Max-Age": "86400",
};

const FORWARD = ["content-type", "accept", "x-api-key", "x-api-realm", "x-api-platform", "authorization"];

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS);
      return res.end();
    }

    // Aceita tanto /api/proxy/<path> quanto /<path>
    let path = req.url || "/";
    if (path.startsWith("/api/proxy/")) path = path.slice("/api/proxy".length);
    if (!path.startsWith("/")) path = "/" + path;

    const target = UPSTREAM + path;

    const headers = {
      origin: "https://saladofuturo.educacao.sp.gov.br",
      referer: "https://saladofuturo.educacao.sp.gov.br/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    };
    for (const k of FORWARD) if (req.headers[k]) headers[k] = req.headers[k];

    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      body = Buffer.concat(chunks);
    }

    const upstream = await fetch(target, { method: req.method, headers, body, redirect: "follow" });
    const buf = Buffer.from(await upstream.arrayBuffer());

    const out = { ...CORS };
    const ct = upstream.headers.get("content-type");
    if (ct) out["Content-Type"] = ct;

    console.log(req.method, path, "→", upstream.status);
    res.writeHead(upstream.status, out);
    res.end(buf);
  } catch (e) {
    console.error("proxy error:", e);
    res.writeHead(502, { "Content-Type": "application/json", ...CORS });
    res.end(JSON.stringify({ error: String(e?.message || e) }));
  }
});

server.listen(PORT, () => {
  console.log(`\n✔ Local proxy rodando em http://localhost:${PORT}`);
  console.log(`  Upstream: ${UPSTREAM}`);
  console.log(`\nNo navegador (DevTools > Console) rode:`);
  console.log(`  localStorage.setItem('localProxyUrl', 'http://localhost:${PORT}')\n`);
});
