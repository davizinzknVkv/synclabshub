// ============================================
// 📚 SYNC LABS — Interceptor Taskitos / Sala do Futuro
// O site https://crimsonzerohub.xyz/ foi descontinuado.
// Use este interceptador no site oficial:
//   https://saladofuturo.educacao.sp.gov.br/
// (faça login normalmente, abra a aba de Tarefas/Redação,
//  depois cole tudo isso no console — F12 — e rode
//  TASKITOS.getKey())
// ============================================

(function () {
  const _logs = [];
  const _origFetch = window.fetch;

  const TASK_URL_PATTERNS = [
    'edusp-api.ip.tv',
    'taskitos.cupiditys.lol',
    'khan.cupiditys.lol',
    '/room/user',
    '/tms/task',
    '/answer',
    '/answer/draft',
    '/answer/pending',
    '/answer/expired',
    'redacao',
  ];

  const shouldHighlight = (url) =>
    TASK_URL_PATTERNS.some((p) => url.includes(p));

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
      status: null,
      timestamp: new Date().toISOString(),
    };
    try { entry.body = body ? JSON.parse(body) : null; } catch { entry.body = body; }

    const res = await _origFetch.apply(this, args);
    entry.status = res.status;

    try {
      const clone = res.clone();
      const text = await clone.text();
      try { entry.response = JSON.parse(text); } catch { entry.response = text?.slice(0, 2000); }
    } catch {}

    _logs.push(entry);
    if (shouldHighlight(url)) {
      console.log(`%c[TASKITOS] ${method} ${url}`, 'color:#3b82f6;font-weight:bold', entry);
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
  XMLHttpRequest.prototype.setRequestHeader = (function (orig) {
    return function (k, v) {
      this._intHeaders = this._intHeaders || {};
      this._intHeaders[k] = v;
      return orig.apply(this, arguments);
    };
  })(XMLHttpRequest.prototype.setRequestHeader);
  XMLHttpRequest.prototype.send = function (body) {
    const entry = {
      url: this._intUrl,
      method: this._intMethod,
      headers: { ...(this._intHeaders || {}) },
      body: null,
      response: null,
      status: null,
      timestamp: new Date().toISOString(),
    };
    try { entry.body = body ? JSON.parse(body) : null; } catch { entry.body = body; }

    this.addEventListener('load', () => {
      entry.status = this.status;
      try { entry.response = JSON.parse(this.responseText); }
      catch { entry.response = this.responseText?.slice(0, 2000); }
      _logs.push(entry);
      if (shouldHighlight(entry.url || '')) {
        console.log(`%c[TASKITOS-XHR] ${entry.method} ${entry.url}`, 'color:#3b82f6;font-weight:bold', entry);
      }
    });

    _origSend.apply(this, arguments);
  };

  // ── Helpers ──────────────────────────────────
  function pickIpTvKey() {
    // 1) Resposta do /registration/edusp/token — fonte mais confiável
    for (let i = _logs.length - 1; i >= 0; i--) {
      const l = _logs[i];
      if (typeof l.url === 'string' && l.url.includes('/registration/edusp/token')) {
        const tok = l.response?.auth_token;
        if (tok && typeof tok === 'string' && tok.startsWith('eyJ')) {
          return { from: `response:${l.url}`, value: tok };
        }
      }
    }
    // 2) Header x-api-key de qualquer chamada subsequente ao edusp-api
    for (let i = _logs.length - 1; i >= 0; i--) {
      const l = _logs[i];
      const h = l.headers || {};
      const cand = h['x-api-key'] || h['X-Api-Key'] || h['authorization'] || h['Authorization'];
      if (cand) {
        const clean = String(cand).replace(/^Bearer\s+/i, '');
        if (clean.startsWith('eyJ')) return { from: `request:${l.url}`, value: clean };
      }
    }
    // 3) Fallback: localStorage
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (!v) continue;
      if (v.startsWith('eyJ') && (k.toLowerCase().includes('edusp') || k.toLowerCase().includes('auth') || k.toLowerCase().includes('token'))) {
        return { from: `localStorage.${k}`, value: v };
      }
    }
    return null;
  }

  function summarizeTasks() {
    const taskCalls = _logs.filter((l) =>
      typeof l.url === 'string' &&
      (l.url.includes('/tms/task') || l.url.includes('/answer') || l.url.includes('/room/user'))
    );
    return taskCalls.map((l) => ({
      url: l.url,
      method: l.method,
      status: l.status,
      hasResponse: !!l.response,
    }));
  }

  const HUB_URL = 'https://synclabshub.lovable.app';

  function openHub(token) {
    const key = token || pickIpTvKey()?.value;
    if (!key) {
      console.warn('[TASKITOS] Sem iptvKey ainda. Abra Tarefas/Redação no Sala do Futuro e tente de novo.');
      return null;
    }
    const url = `${HUB_URL}/#token=${encodeURIComponent(key)}`;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      console.warn('[TASKITOS] Popup bloqueado. Cole manualmente:', url);
    } else {
      console.log('%c[TASKITOS] Abrindo SYNC LABS HUB com auto-login...', 'color:#10b981;font-weight:bold');
    }
    return url;
  }

  window.TASKITOS = {
    getLogs: () => { console.table(_logs.map(({ url, method, status, timestamp }) => ({ url, method, status, timestamp }))); return _logs; },

    getKey: () => {
      const ipv = pickIpTvKey();
      const out = {
        iptvKey: ipv?.value || null,
        iptvKeyFrom: ipv?.from || null,
        tasksDetected: summarizeTasks(),
        instrucao: 'Rode TASKITOS.openHub() pra entrar automaticamente, ou cole a iptvKey no login.',
      };
      console.log('%c[TASKITOS] Chave para o SYNC HUB:', 'color:#3b82f6;font-weight:bold');
      console.log(out);
      if (out.iptvKey) {
        try { navigator.clipboard.writeText(out.iptvKey); console.log('%c✓ iptvKey copiada pro clipboard!', 'color:#10b981'); } catch {}
        console.log('%c👉 TASKITOS.openHub() — entra direto no SYNC LABS HUB', 'color:#10b981;font-weight:bold');
      } else {
        console.warn('Ainda não encontrei a chave. Abra a aba de Tarefas/Redação no Sala do Futuro e rode TASKITOS.getKey() de novo.');
      }
      return out;
    },

    openHub,

    // Auto-detecta a chave e já abre o HUB assim que aparecer
    autoLogin: (opts = {}) => {
      const timeoutMs = opts.timeoutMs || 30000;
      const start = Date.now();
      console.log('%c[TASKITOS] Aguardando iptvKey aparecer pra auto-login...', 'color:#3b82f6');
      const iv = setInterval(() => {
        const k = pickIpTvKey();
        if (k) {
          clearInterval(iv);
          openHub(k.value);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(iv);
          console.warn('[TASKITOS] Timeout. Abra Tarefas/Redação no Sala do Futuro e tente de novo.');
        }
      }, 500);
    },

    // Atalhos pra inspecionar tarefas capturadas
    getPending: () => _logs.filter((l) => String(l.url).includes('list_all=true') || String(l.url).includes('filter=pending')),
    getExpired: () => _logs.filter((l) => String(l.url).includes('expired')),
    getDrafts: () => _logs.filter((l) => String(l.url).includes('draft') || (l.body && l.body.status === 'draft')),
    getSubmits: () => _logs.filter((l) => l.method === 'POST' && String(l.url).includes('/answer')),

    export: () => {
      const data = {
        logs: _logs,
        key: pickIpTvKey(),
        tasks: summarizeTasks(),
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'taskitos_intercept.json';
      a.click();
      URL.revokeObjectURL(a.href);
    },

    clear: () => { _logs.length = 0; console.log('[TASKITOS] Logs limpos'); },
  };

  // Auto-tenta o login assim que o token aparecer (não-intrusivo: só abre nova aba)
  if (!window.__TASKITOS_AUTO_RAN__) {
    window.__TASKITOS_AUTO_RAN__ = true;
    setTimeout(() => window.TASKITOS.autoLogin({ timeoutMs: 60000 }), 1500);
  }

  console.log('%c📚 SYNC LABS — INTERCEPTOR TASKITOS ATIVO', 'color:#3b82f6;font-size:16px;font-weight:bold');
  console.log('%c⚠️  O site crimsonzerohub.xyz foi descontinuado.', 'color:#f59e0b;font-weight:bold');
  console.log('%cUse direto em: https://saladofuturo.educacao.sp.gov.br/', 'color:#3b82f6');
  console.log('%cComandos:', 'color:#60a5fa;font-weight:bold');
  console.log('  TASKITOS.getKey()      — pega a iptvKey (auto-copia)');
  console.log('  TASKITOS.getPending()  — requisições de tarefas pendentes');
  console.log('  TASKITOS.getExpired()  — requisições de tarefas expiradas');
  console.log('  TASKITOS.getDrafts()   — rascunhos detectados');
  console.log('  TASKITOS.getSubmits()  — submissões (POST /answer)');
  console.log('  TASKITOS.getLogs()     — lista todas as requisições');
  console.log('  TASKITOS.export()      — baixa JSON com tudo');
  console.log('  TASKITOS.clear()       — limpa os logs');
})();
