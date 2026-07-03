import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Heart,
  ArrowRight,
  Zap,
  ShieldCheck,
  Sparkles,
  FileText,
  Circle,
} from "lucide-react";
import { NotificationContainer, notify } from "@/components/Notification";
import {
  setSession,
  getSession,
  saveCreds,
  loadCreds,
  FALLBACK_ROOM_ICON,
} from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Entrar — Flux Hub" },
      {
        name: "description",
        content:
          "Entre no Flux Hub — a plataforma inteligente de automação escolar.",
      },
    ],
  }),
});

const UF_LIST = [
  "SP", "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT",
  "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR",
  "SC", "SE", "TO",
];

const API_BASE_URL = "https://edusp-api.ip.tv";
const PROXY_BASE_URL = "/api/proxy";

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

import fluxHubLogo from "@/assets/flux-hub-logo.png.asset.json";

function FluxMark({ size = 32 }: { size?: number }) {
  return (
    <img
      src={fluxHubLogo.url}
      alt="Flux Hub"
      style={{ width: size, height: size }}
      className="rounded-[10px] object-contain"
    />
  );
}


function Index() {
  const navigate = useNavigate();
  const saved = loadCreds();
  const [raNumero, setRaNumero] = useState(saved?.raNumero || "");
  const [raDigito, setRaDigito] = useState(saved?.raDigito || "");
  const [raUf, setRaUf] = useState(saved?.raUf || "SP");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoLogging, setAutoLogging] = useState(false);

  useEffect(() => {
    if (getSession()) {
      navigate({ to: "/dashboard" });
      return;
    }

    const hash = window.location.hash.replace(/^#/, "");
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);
    const token = hashParams.get("token") || queryParams.get("token");
    if (!token || !token.startsWith("eyJ")) return;

    window.history.replaceState(null, "", window.location.pathname);

    const payload = decodeJwt(token);
    const exp =
      payload && typeof payload.exp === "number" ? (payload.exp as number) : 0;
    if (exp && exp * 1000 < Date.now()) {
      notify("TOKEN EXPIRADO — RODE O INTERCEPTOR DE NOVO");
      return;
    }

    setAutoLogging(true);
    notify("AUTO-LOGIN VIA INTERCEPTOR...");

    (async () => {
      try {
        const roomRes = await fetch(
          `${PROXY_BASE_URL}/room/user?list_all=true&with_cards=true`,
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "x-api-realm": "edusp",
              "x-api-platform": "webclient",
              "x-api-key": token,
            },
          },
        );
        if (!roomRes.ok) throw new Error("TOKEN INVÁLIDO OU EXPIRADO");
        const roomData = await roomRes.json();

        const nick = (payload?.nick as string | undefined) || "";
        const externalId = payload?.external_id
          ? String(payload.external_id)
          : undefined;
        const skey = (payload?.skey as string | undefined) || "";
        const raFromSkey = skey.split(":").pop() || nick;

        setSession({
          ra: raFromSkey.toUpperCase().replace(/-/g, ""),
          authToken: token,
          nick: nick,
          name: nick,
          externalId,
          rooms: (roomData.rooms || []).map(
            (r: {
              id: number;
              name: string;
              icon?: string | null;
              dark_icon?: string | null;
            }) => ({
              id: r.id,
              name: r.name,
              icon: r.icon || FALLBACK_ROOM_ICON,
              dark_icon: r.dark_icon || r.icon || FALLBACK_ROOM_ICON,
            }),
          ),
        });

        notify("AUTO-LOGIN OK");
        navigate({ to: "/dashboard" });
      } catch (err) {
        notify(err instanceof Error ? err.message : "FALHA NO AUTO-LOGIN");
        setAutoLogging(false);
      }
    })();
  }, [navigate]);

  const fullRa = `${raNumero}${raDigito}${raUf}`;

  const handleLogin = useCallback(async () => {
    if (loading) return;
    if (!raNumero.trim()) {
      notify("PREENCHA O NÚMERO DO RA");
      return;
    }
    if (!raDigito.trim()) {
      notify("PREENCHA O DÍGITO");
      return;
    }
    if (!pwd.trim()) {
      notify("PREENCHA A SENHA");
      return;
    }

    setLoading(true);
    try {
      notify("AUTENTICANDO...");
      const res = await fetch(`${API_BASE_URL}/registration/edusp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-api-realm": "edusp",
          "x-api-platform": "webclient",
        },
        body: JSON.stringify({
          realm: "edusp",
          platform: "webclient",
          id: fullRa,
          password: pwd.trim(),
        }),
      });
      if (!res.ok) throw new Error("RA OU SENHA INVÁLIDOS");
      const data = await res.json();

      const roomRes = await fetch(
        `${API_BASE_URL}/room/user?list_all=true&with_cards=true`,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-api-realm": "edusp",
            "x-api-platform": "webclient",
            "x-api-key": data.auth_token,
          },
        },
      );
      const roomData = roomRes.ok ? await roomRes.json() : { rooms: [] };

      saveCreds({ raNumero, raDigito, raUf });

      setSession({
        ra: fullRa,
        authToken: data.auth_token,
        nick: data.nick || data.name,
        name: data.name,
        externalId: data.external_id ? String(data.external_id) : undefined,
        rooms: (roomData.rooms || []).map(
          (r: {
            id: number;
            name: string;
            icon?: string | null;
            dark_icon?: string | null;
          }) => ({
            id: r.id,
            name: r.name,
            icon: r.icon || FALLBACK_ROOM_ICON,
            dark_icon: r.dark_icon || r.icon || FALLBACK_ROOM_ICON,
          }),
        ),
      });

      notify("LOGIN REALIZADO COM SUCESSO");
      navigate({ to: "/dashboard" });
    } catch (err) {
      notify(err instanceof Error ? err.message : "ERRO NO LOGIN");
    } finally {
      setLoading(false);
    }
  }, [raNumero, raDigito, raUf, fullRa, pwd, loading, navigate]);

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1.05fr_1fr] surface-1 text-foreground antialiased">
      {/* LEFT — Editorial hero */}
      <aside className="relative hidden lg:flex flex-col justify-between p-10 xl:p-14 mesh-hero overflow-hidden">
        <div className="absolute inset-0 noise-overlay" />
        <div className="absolute inset-0 bg-grid-lines opacity-40" />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <FluxMark size={38} />
          <div>
            <div className="text-[15px] font-semibold text-white leading-none tracking-tight">
              Flux Hub
            </div>
            <div className="text-[11px] text-white/50 mt-1.5 font-mono uppercase tracking-[0.18em]">
              v2.0 · 2026
            </div>
          </div>
        </div>

        {/* Manifesto */}
        <div className="relative max-w-lg">
          <span className="chip mb-6">
            <Sparkles size={11} className="text-[oklch(0.75_0.15_290)]" />
            Nova geração
          </span>
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-white leading-[1.05] font-display">
            Sua rotina escolar,
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, oklch(0.75 0.19 292), oklch(0.75 0.17 262))",
              }}
            >
              automatizada com precisão.
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/60 max-w-md">
            Uma plataforma pensada para quem quer produtividade real: tarefas,
            redações, boletim e mais — tudo em um lugar minimalista, rápido e
            inteligente.
          </p>

          <div className="mt-10 space-y-4">
            {[
              {
                icon: Zap,
                title: "Automação em segundos",
                desc: "Menos cliques, mais tempo livre.",
              },
              {
                icon: ShieldCheck,
                title: "Privacidade por padrão",
                desc: "Nada vaza. Sessão criptografada localmente.",
              },
              {
                icon: Sparkles,
                title: "IA integrada",
                desc: "Redações e sugestões contextuais para você.",
              },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 rounded-[9px] hairline surface-2 flex items-center justify-center flex-shrink-0 text-[oklch(0.75_0.15_290)]">
                  <f.icon size={14} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-white leading-tight">
                    {f.title}
                  </div>
                  <div className="text-[12px] text-white/50 mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-center justify-between text-[11px] text-white/40">
          <div className="flex items-center gap-1.5 font-mono uppercase tracking-widest">
            <Circle size={6} fill="currentColor" className="text-emerald-400" />
            Sistemas operando normalmente
          </div>
          <div className="font-mono">© 2026 Flux Hub</div>
        </div>
      </aside>

      {/* RIGHT — Form */}
      <main className="relative flex items-center justify-center p-6 sm:p-10 surface-1">
        <div className="lg:hidden absolute inset-0 mesh-hero opacity-60" />

        <div className="relative w-full max-w-[400px]">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <FluxMark size={32} />
            <span className="text-[15px] font-semibold text-white tracking-tight">
              Flux Hub
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-[26px] font-bold tracking-tight text-white leading-tight font-display">
              Entrar
            </h2>
            <p className="text-[13.5px] text-muted-foreground mt-1.5">
              Use seu RA para acessar sua conta.
            </p>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-medium text-muted-foreground">
                Registro do Aluno
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={raNumero}
                  onChange={(e) => setRaNumero(e.target.value)}
                  placeholder="Número"
                  className="flex-1 h-10 px-3 rounded-[9px] surface-2 hairline text-[13.5px] text-white placeholder:text-muted-foreground/40 font-mono tracking-wide ring-focus transition-colors focus:border-[oklch(0.58_0.24_292_/_0.4)]"
                />
                <input
                  type="text"
                  value={raDigito}
                  onChange={(e) => setRaDigito(e.target.value)}
                  placeholder="D"
                  maxLength={1}
                  className="w-12 h-10 text-center rounded-[9px] surface-2 hairline text-[13.5px] text-white placeholder:text-muted-foreground/40 font-mono ring-focus transition-colors focus:border-[oklch(0.58_0.24_292_/_0.4)]"
                />
                <div className="relative">
                  <select
                    value={raUf}
                    onChange={(e) => setRaUf(e.target.value)}
                    className="h-10 w-[68px] appearance-none pl-3 pr-6 rounded-[9px] surface-2 hairline text-[13px] text-white font-mono cursor-pointer ring-focus transition-colors focus:border-[oklch(0.58_0.24_292_/_0.4)]"
                  >
                    {UF_LIST.map((uf) => (
                      <option key={uf} value={uf} className="bg-[oklch(0.13_0.018_270)]">
                        {uf}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-muted-foreground/50" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11.5px] font-medium text-muted-foreground">
                  Senha
                </label>
                <a
                  href="https://saladofuturo.educacao.sp.gov.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-muted-foreground hover:text-white transition-colors"
                >
                  Esqueci
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 pr-9 rounded-[9px] surface-2 hairline text-[13.5px] text-white placeholder:text-muted-foreground/40 tracking-wider ring-focus transition-colors focus:border-[oklch(0.58_0.24_292_/_0.4)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-white transition-colors p-1"
                >
                  {showPwd ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 group relative w-full h-10 rounded-[9px] text-[13.5px] font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.99]"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.62 0.24 292), oklch(0.58 0.22 262))",
                boxShadow:
                  "0 6px 22px -8px oklch(0.58 0.24 292 / 0.65), inset 0 1px 0 oklch(1 0 0 / 0.22)",
              }}
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" />
                  Autenticando
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight
                    size={14}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[10.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground/50">
            <div className="flex-1 h-px bg-white/[0.06]" />
            ou
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <a
              href="https://discord.gg/y5tNWGVPSU"
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 rounded-[9px] surface-2 hairline flex items-center justify-center gap-2 text-[12.5px] font-medium text-muted-foreground hover:text-white hover:border-white/15 transition-colors"
            >
              <Circle size={7} fill="currentColor" className="text-[#5865F2]" />
              Discord
            </a>
            <a
              href="https://livepix.gg/davizinzkn"
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 rounded-[9px] surface-2 hairline flex items-center justify-center gap-2 text-[12.5px] font-medium text-muted-foreground hover:text-white hover:border-white/15 transition-colors"
            >
              <Heart size={12} className="text-pink-400" />
              Apoiar
            </a>
          </div>

          <div className="mt-8 flex items-center justify-between text-[10.5px] font-mono uppercase tracking-widest text-muted-foreground/40">
            <span>DavizinzknGOD · Zennos</span>
            <Link
              to="/termos"
              className="inline-flex items-center gap-1 hover:text-white transition-colors"
            >
              <FileText size={11} />
              Termos
            </Link>
          </div>
        </div>

        {autoLogging && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
            <div className="flex flex-col items-center gap-3 px-8 py-6 surface-2 hairline rounded-2xl">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-[13px] font-semibold text-white">
                Autenticando via interceptor
              </p>
              <p className="text-[11px] text-muted-foreground">
                Validando sua chave…
              </p>
            </div>
          </div>
        )}
      </main>

      <NotificationContainer />
    </div>
  );
}
