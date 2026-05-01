// ============================================
// 🩸 SYNC LABS — Interceptor CrimsonZero
// Cole TUDO isso no console (F12) do site
// https://crimsonzerohub.xyz/ após fazer login
// ============================================

(function() {
  const _logs = [];
  const _origFetch = window.fetch;

  // Intercepta fetch
  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    const method = args[1]?.method || 'GET';
    const body = args[1]?.body || null;
    const headers = args[1]?.headers || {};

    const entry = { url, method, headers: {...headers}, body: null, timestamp: new Date().toISOString() };
    try { entry.body = body ? JSON.parse(body) : null; } catch { entry.body = body; }
    _logs.push(entry);
    console.log(`[INTERCEPTOR] ${method} ${url}`, entry);

    return _origFetch.apply(this, args);
  };

  // Intercepta XHR
  const _origXHR = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._intMethod = method;
    this._intUrl = url;
    _origXHR.apply(this, arguments);
  };
  const _origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(body) {
    const entry = { url: this._intUrl, method: this._intMethod, body: null, timestamp: new Date().toISOString() };
    try { entry.body = body ? JSON.parse(body) : null; } catch { entry.body = body; }
    _logs.push(entry);
    console.log(`[INTERCEPTOR-XHR] ${this._intMethod} ${this._intUrl}`, entry);
    _origSend.apply(this, arguments);
  };

  // Funções de exportação
  window.INTERCEPTOR = {
    getLogs: () => { console.table(_logs); return _logs; },

    getToken: () => {
      // Tenta pegar o token do localStorage
      const keys = Object.keys(localStorage);
      const tokenKeys = keys.filter(k => k.includes('token') || k.includes('auth') || k.includes('session') || k.includes('key'));
      const tokens = {};
      tokenKeys.forEach(k => { tokens[k] = localStorage.getItem(k); });

      // Tenta pegar de cookies
      const cookies = document.cookie.split(';').map(c => c.trim());
      const authCookies = cookies.filter(c => c.includes('token') || c.includes('auth') || c.includes('session'));

      // Tenta pegar dos logs interceptados
      const authHeaders = _logs
        .filter(l => l.headers && (l.headers['x-api-key'] || l.headers['Authorization'] || l.headers['authorization']))
        .map(l => l.headers['x-api-key'] || l.headers['Authorization'] || l.headers['authorization']);

      const result = { localStorage: tokens, cookies: authCookies, fromRequests: [...new Set(authHeaders)] };
      console.log('[INTERCEPTOR] Tokens encontrados:', result);
      return result;
    },

    getSyncLabsConfig: () => {
      const tokenData = window.INTERCEPTOR.getToken();
      const apiLogs = _logs.filter(l => l.url.includes('edusp-api') || l.url.includes('ip.tv') || l.url.includes('catalyst'));

      const config = {
        authToken: tokenData.fromRequests[0] || tokenData.localStorage['token'] || 'NÃO ENCONTRADO — faça uma ação no site primeiro',
        apiRequests: apiLogs,
        allStorageKeys: Object.keys(localStorage),
        totalIntercepted: _logs.length,
        instrucao: 'Copie o authToken e cole no login do SYNC LABS HUB'
      };
      console.log('[INTERCEPTOR] Config para SYNC LABS:', JSON.stringify(config, null, 2));
      return config;
    },

    export: () => {
      const data = {
        logs: _logs,
        tokens: window.INTERCEPTOR.getToken(),
        config: window.INTERCEPTOR.getSyncLabsConfig(),
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'interceptor_export.json'; a.click();
      URL.revokeObjectURL(url);
      console.log('[INTERCEPTOR] Exportado!');
    },

    clear: () => { _logs.length = 0; console.log('[INTERCEPTOR] Logs limpos'); }
  };

  console.log('%c🩸 SYNC LABS INTERCEPTOR ATIVO', 'color: #dc2626; font-size: 16px; font-weight: bold');
  console.log('%cComandos disponíveis:', 'color: #ff4444; font-weight: bold');
  console.log('  INTERCEPTOR.getSyncLabsConfig()  — Exporta config completa');
  console.log('  INTERCEPTOR.getToken()           — Pega tokens');
  console.log('  INTERCEPTOR.getLogs()             — Mostra requisições');
  console.log('  INTERCEPTOR.export()             — Baixa JSON com tudo');
  console.log('  INTERCEPTOR.clear()              — Limpa os logs');
})();
