// ============================================
// ⚡ FLUX HUB — Interceptor ZetaZero
// Cole TUDO isso no console (F12) do site
// https://zetazerohub.xyz/ após fazer login
// ============================================

(function () {
  const _logs = [];
  const _origFetch = window.fetch;

  // ---------- fetch ----------
  window.fetch = async function (...args) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    const method = (args[1]?.method || (args[0] instanceof Request ? args[0].method : "GET")).toUpperCase();
    const rawHeaders = args[1]?.headers || (args[0] instanceof Request ? args[0].headers : {});
    const headers = {};
    try {
      if (rawHeaders instanceof Headers) rawHeaders.forEach((v, k) => (headers[k] = v));
      else if (Array.isArray(rawHeaders)) rawHeaders.forEach(([k, v]) => (headers[k] = v));
      else Object.assign(headers, rawHeaders);
    } catch {}
    const body = args[1]?.body ?? null;

    const entry = { url, method, headers, body: null, response: null, timestamp: new Date().toISOString() };
    try { entry.body = body ? JSON.parse(body) : null; } catch { entry.body = body; }

    let res;
    try {
      res = await _origFetch.apply(this, args);
      try {
        const clone = res.clone();
        const text = await clone.text();
        try { entry.response = JSON.parse(text); } catch { entry.response = text?.slice(0, 500); }
        entry.status = res.status;
      } catch {}
    } catch (err) {
      entry.error = String(err);
      _logs.push(entry);
      throw err;
    }
    _logs.push(entry);
    console.log(`[ZETA] ${method} ${url} → ${res.status}`, entry);
    return res;
  };

  // ---------- XHR ----------
  const _origOpen = XMLHttpRequest.prototype.open;
  const _origSend = XMLHttpRequest.prototype.send;
  const _origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._z = { method, url, headers: {} };
    return _origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
    if (this._z) this._z.headers[k] = v;
    return _origSetHeader.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    const entry = { ...this._z, body: null, timestamp: new Date().toISOString() };
    try { entry.body = body ? JSON.parse(body) : null; } catch { entry.body = body; }
    this.addEventListener("loadend", () => {
      entry.status = this.status;
      try { entry.response = JSON.parse(this.responseText); } catch { entry.response = this.responseText?.slice(0, 500); }
      _logs.push(entry);
      console.log(`[ZETA-XHR] ${entry.method} ${entry.url} → ${entry.status}`, entry);
    });
    return _origSend.apply(this, arguments);
  };

  // ---------- helpers ----------
  function collectTokens() {
    const ls = {};
    Object.keys(localStorage).forEach((k) => (ls[k] = localStorage.getItem(k)));
    const ss = {};
    Object.keys(sessionStorage).forEach((k) => (ss[k] = sessionStorage.getItem(k)));

    const authHeaderKeys = ["x-api-key", "authorization", "x-auth-key", "x-access-token", "token", "apikey"];
    const fromRequests = {};
    _logs.forEach((l) => {
      if (!l.headers) return;
      Object.keys(l.headers).forEach((h) => {
        if (authHeaderKeys.includes(h.toLowerCase())) {
          fromRequests[h] = fromRequests[h] || new Set();
          fromRequests[h].add(l.headers[h]);
        }
      });
    });
    const flat = {};
    Object.entries(fromRequests).forEach(([k, v]) => (flat[k] = [...v]));

    return { localStorage: ls, sessionStorage: ss, cookies: document.cookie, fromRequests: flat };
  }

  window.ZETA = {
    logs: () => { console.table(_logs.map(({ url, method, status }) => ({ url, method, status }))); return _logs; },
    tokens: () => { const t = collectTokens(); console.log("[ZETA] tokens:", t); return t; },
    endpoints: () => {
      const ep = [...new Set(_logs.map((l) => `${l.method} ${new URL(l.url, location.origin).pathname}`))];
      console.log("[ZETA] endpoints únicos:", ep);
      return ep;
    },
    export: () => {
      const data = {
        origin: location.origin,
        exportedAt: new Date().toISOString(),
        tokens: collectTokens(),
        endpoints: [...new Set(_logs.map((l) => `${l.method} ${l.url}`))],
        logs: _logs,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `zetazero_capture_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      console.log(`[ZETA] exportado — ${_logs.length} requisições`);
    },
    clear: () => { _logs.length = 0; console.log("[ZETA] logs limpos"); },
  };

  console.log("%c⚡ ZETAZERO INTERCEPTOR ATIVO", "color:#a855f7;font-size:16px;font-weight:bold");
  console.log("%cComandos:", "color:#c084fc;font-weight:bold");
  console.log("  ZETA.logs()      — lista requisições");
  console.log("  ZETA.tokens()    — extrai tokens (storage + headers)");
  console.log("  ZETA.endpoints() — endpoints únicos");
  console.log("  ZETA.export()    — baixa JSON completo");
  console.log("  ZETA.clear()     — limpa logs");
  console.log("%c→ Faça login, navegue tarefas/redação/etc, depois ZETA.export()", "color:#a855f7");
})();
