// ============================================
// 🎓 SYNC LABS — Interceptor Prepara SP
// Cole TUDO isso no console (F12) do site
// https://saladofuturo.educacao.sp.gov.br/
// (faça login primeiro!) e depois abra a aba
// do Prepara SP normalmente.
// ============================================

(function () {
  const _logs = [];
  const _origFetch = window.fetch;

  // ── Intercepta fetch ─────────────────────────
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    const method = args[1]?.method || (args[0]?.method ?? 'GET');
    const headers = args[1]?.headers || {};
    const body = args[1]?.body || null;

    const entry = {
      url,
      method,
      headers: { ...headers },
      body: null,
      response: null,
      timestamp: new Date().toISOString(),
    };
    try { entry.body = body ? JSON.parse(body) : null; } catch { entry.body = body; }

    const res = await _origFetch.apply(this, args);

    // Tenta clonar a resposta pra capturar tokens retornados
    try {
      const clone = res.clone();
      const text = await clone.text();
      try { entry.response = JSON.parse(text); } catch { entry.response = text?.slice(0, 2000); }
    } catch {}

    _logs.push(entry);
    if (
      url.includes('edusp-api.ip.tv') ||
      url.includes('preparasp') ||
      url.includes('jovensgenios') ||
      url.includes('seducsp_token') ||
      url.includes('external-integration')
    ) {
      console.log(`%c[PREPARA-SP] ${method} ${url}`, 'color:#10b981;font-weight:bold', entry);
    }

    return res;
  };

  // ── Intercepta XHR ───────────────────────────
  const _origOpen = XMLHttpRequest.prototype.open;
  const _origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._intMethod = method;
    this._intUrl = url;
    _origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    const entry = {
      url: this._intUrl,
      method: this._intMethod,
      body: null,
      response: null,
      timestamp: new Date().toISOString(),
    };
    try { entry.body = body ? JSON.parse(body) : null; } catch { entry.body = body; }

    this.addEventListener('load', () => {
      try { entry.response = JSON.parse(this.responseText); }
      catch { entry.response = this.responseText?.slice(0, 2000); }
      _logs.push(entry);
    });

    _origSend.apply(this, arguments);
  };

  // ── Helpers ──────────────────────────────────
  function pickIpTvKey() {
    // 1) localStorage
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v && v.startsWith('eyJ') && v.includes('edusp')) return { from: `localStorage.${k}`, value: v };
    }
    // 2) headers das requisições interceptadas
    for (const l of _logs) {
      const h = l.headers || {};
      const cand = h['x-api-key'] || h['X-Api-Key'] || h['authorization'] || h['Authorization'];
      if (cand && String(cand).includes('edusp')) return { from: `request:${l.url}`, value: String(cand).replace(/^Bearer\s+/i, '') };
    }
    return null;
  }

  function pickPreparaSpTokens() {
    // Tokens externos do Jovens Gênios costumam aparecer em redirects
    const urls = _logs
      .map((l) => l.response?.redirectUrl || l.url)
      .filter((u) => typeof u === 'string' && u.includes('externalToken='));
    const externalTokens = [...new Set(urls.map((u) => {
      try { return new URL(u).searchParams.get('externalToken'); } catch { return null; }
    }).filter(Boolean))];

    const sedTokens = _logs
      .filter((l) => l.url.includes('seducsp_token/generate'))
      .map((l) => l.response?.token)
      .filter(Boolean);

    return { externalTokens, sedTokens };
  }

  window.PREPARASP = {
    getLogs: () => { console.table(_logs.map(({ url, method, timestamp }) => ({ url, method, timestamp }))); return _logs; },

    getKey: () => {
      const ipv = pickIpTvKey();
      const pre = pickPreparaSpTokens();
      const out = {
        iptvKey: ipv?.value || null,
        iptvKeyFrom: ipv?.from || null,
        preparaSpTokens: pre.sedTokens,
        jovensGeniosExternalTokens: pre.externalTokens,
        instrucao: 'Cole o "iptvKey" no campo de login do SYNC LABS HUB → Prepara SP.',
      };
      console.log('%c[PREPARA-SP] Chave para o SYNC HUB:', 'color:#10b981;font-weight:bold');
      console.log(out);
      if (out.iptvKey) {
        try { navigator.clipboard.writeText(out.iptvKey); console.log('%c✓ iptvKey copiada pro clipboard!', 'color:#10b981'); } catch {}
      } else {
        console.warn('Ainda não encontrei a chave. Abra/recarregue o Prepara SP dentro da Sala do Futuro e rode PREPARASP.getKey() de novo.');
      }
      return out;
    },

    export: () => {
      const data = {
        logs: _logs,
        key: window.PREPARASP.getKey(),
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'preparasp_intercept.json';
      a.click();
      URL.revokeObjectURL(a.href);
    },

    clear: () => { _logs.length = 0; console.log('[PREPARA-SP] Logs limpos'); },
  };

  console.log('%c🎓 SYNC LABS — INTERCEPTOR PREPARA SP ATIVO', 'color:#10b981;font-size:16px;font-weight:bold');
  console.log('%cComandos:', 'color:#34d399;font-weight:bold');
  console.log('  PREPARASP.getKey()   — pega a iptvKey (auto-copia)');
  console.log('  PREPARASP.getLogs()  — lista todas as requisições');
  console.log('  PREPARASP.export()   — baixa JSON com tudo');
  console.log('  PREPARASP.clear()    — limpa os logs');
  console.log('%c👉 Agora abra/atualize a aba do Prepara SP dentro da Sala do Futuro.', 'color:#fbbf24');
})();
