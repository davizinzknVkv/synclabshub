// Redireciona chamadas para /api/proxy/* para um proxy local (rodando na
// máquina do usuário) quando `localStorage.localProxyUrl` estiver definido.
// Assim dá pra testar sem consumir o limite do scrape.do.

const STORAGE_KEY = "localProxyUrl";

function getBase(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v && v.trim() ? v.replace(/\/+$/, "") : null;
  } catch {
    return null;
  }
}

function rewrite(url: string, base: string): string {
  // Absolutas com mesma origem
  try {
    const u = new URL(url, window.location.origin);
    if (u.origin === window.location.origin && u.pathname.startsWith("/api/proxy/")) {
      return base + u.pathname.slice("/api/proxy".length) + u.search;
    }
  } catch {
    // fallback string
  }
  if (url.startsWith("/api/proxy/")) return base + url.slice("/api/proxy".length);
  return url;
}

let installed = false;
export function installLocalProxyInterceptor() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const base = getBase();
    if (!base) return original(input, init);
    try {
      if (typeof input === "string") {
        return original(rewrite(input, base), init);
      }
      if (input instanceof URL) {
        return original(rewrite(input.toString(), base), init);
      }
      if (input instanceof Request) {
        const newUrl = rewrite(input.url, base);
        if (newUrl === input.url) return original(input, init);
        return original(new Request(newUrl, input), init);
      }
    } catch {
      /* ignore */
    }
    return original(input, init);
  }) as typeof window.fetch;
  // eslint-disable-next-line no-console
  console.info(`[localProxy] ativo → ${getBase()}`);
}
