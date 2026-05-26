import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { Eye, EyeOff, Heart } from "lucide-react";
import logo from "@/assets/icons/logo.png";
import { NotificationContainer, notify } from "@/components/Notification";
import { setSession, getSession, saveCreds, loadCreds, FALLBACK_ROOM_ICON } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "SYNC LABS HUB - Login" },
      { name: "description", content: "SYNC LABS HUB - Sua plataforma de automação" },
    ],
  }),
});

const UF_LIST = [
  "SP","AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SE","TO"
];

const API_BASE_URL = "https://edusp-api.ip.tv";

function Index() {
  const navigate = useNavigate();
  const saved = loadCreds();
  const [raNumero, setRaNumero] = useState(saved?.raNumero || "");
  const [raDigito, setRaDigito] = useState(saved?.raDigito || "");
  const [raUf, setRaUf] = useState(saved?.raUf || "SP");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) navigate({ to: "/dashboard" });
  }, [navigate]);

  const fullRa = `${raNumero}${raDigito}${raUf}`;

  const handleLogin = useCallback(async () => {
    if (loading) return;
    if (!raNumero.trim()) { notify("PREENCHA O NÚMERO DO RA"); return; }
    if (!raDigito.trim()) { notify("PREENCHA O DÍGITO"); return; }
    if (!pwd.trim()) { notify("PREENCHA A SENHA"); return; }

    setLoading(true);
    try {
      notify("AUTENTICANDO...");
      const res = await fetch(`${API_BASE_URL}/registration/edusp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-api-realm": "edusp",
          "x-api-platform": "webclient",
        },
        body: JSON.stringify({ realm: "edusp", platform: "webclient", id: fullRa, password: pwd.trim() }),
      });
      if (!res.ok) throw new Error("RA OU SENHA INVÁLIDOS");
      const data = await res.json();

      const roomRes = await fetch(`${API_BASE_URL}/room/user?list_all=true&with_cards=true`, {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-api-realm": "edusp",
          "x-api-platform": "webclient",
          "x-api-key": data.auth_token,
        },
      });
      const roomData = roomRes.ok ? await roomRes.json() : { rooms: [] };

      saveCreds({ raNumero, raDigito, raUf });

      setSession({
        ra: fullRa,
        authToken: data.auth_token,
        nick: data.nick || data.name,
        name: data.name,
        externalId: data.external_id ? String(data.external_id) : undefined,
        rooms: (roomData.rooms || []).map((r: { id: number; name: string; icon?: string | null; dark_icon?: string | null }) => ({
          id: r.id,
          name: r.name,
          icon: r.icon || FALLBACK_ROOM_ICON,
          dark_icon: r.dark_icon || r.icon || FALLBACK_ROOM_ICON,
        })),
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
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden antialiased p-4">
      {/* Aurora orbs */}
      <div className="absolute inset-0 bg-aurora pointer-events-none" />
      <div className="absolute inset-0 bg-grid-lines pointer-events-none opacity-60" />
      <div className="absolute top-1/4 -left-32 w-[480px] h-[480px] rounded-full opacity-50 pointer-events-none bg-aurora-animated"
           style={{ background: "radial-gradient(circle, oklch(0.66 0.24 280 / 0.5), transparent 70%)" }} />
      <div className="absolute bottom-1/4 -right-32 w-[480px] h-[480px] rounded-full opacity-40 pointer-events-none bg-aurora-animated"
           style={{ background: "radial-gradient(circle, oklch(0.82 0.17 200 / 0.4), transparent 70%)", animationDelay: "-9s" }} />

      {/* Login card */}
      <main className="relative z-10 w-full max-w-[440px] p-8 sm:p-10 glass-strong rounded-2xl shadow-2xl">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-xl flex items-center justify-center"
                   style={{ background: "var(--gradient-primary)", boxShadow: "0 8px 24px -8px oklch(0.66 0.24 280 / 0.7), inset 0 1px 0 0 oklch(1 0 0 / 0.25)" }}>
                <img src={logo} alt="Sync Labs" className="w-6 h-6 brightness-0 invert" />
              </div>
              <div>
                <div className="text-base font-bold font-display text-white leading-none">Sync<span className="text-gradient">Labs</span></div>
                <div className="text-[10px] text-muted-foreground font-mono mt-1 tracking-wider">PLATAFORMA · v2.0</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
              <span className="status-online w-1.5 h-1.5 rounded-full bg-emerald-400" /> ONLINE
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-display leading-tight">
            Bem-vindo de <span className="text-gradient">volta</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Entre com seu RA para acessar a plataforma.
          </p>
        </header>

        <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>

          {/* RA */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-mono font-semibold">Registro do Aluno</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={raNumero}
                onChange={e => setRaNumero(e.target.value)}
                placeholder="Número"
                className="input-premium flex-grow px-3.5 py-3 text-sm font-mono tracking-wider"
              />
              <input
                type="text"
                value={raDigito}
                onChange={e => setRaDigito(e.target.value)}
                placeholder="D"
                maxLength={1}
                className="input-premium w-14 text-center px-2 py-3 text-sm font-mono"
              />
              <div className="relative w-20 shrink-0">
                <select
                  value={raUf}
                  onChange={e => setRaUf(e.target.value)}
                  className="input-premium w-full appearance-none pl-3 pr-6 py-3 text-sm cursor-pointer text-center font-mono"
                >
                  {UF_LIST.map(uf => (
                    <option key={uf} value={uf} className="bg-card">{uf}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-muted-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-mono font-semibold">Senha</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                placeholder="••••••••••••"
                className="input-premium w-full px-3.5 py-3 pr-10 text-sm tracking-[0.2em]"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                {showPwd ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-premium w-full py-3.5 text-sm mt-1 inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Autenticando...
              </>
            ) : (
              <>Entrar na plataforma <span aria-hidden>→</span></>
            )}
          </button>
        </form>

        <footer className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
          <a href="https://discord.gg/y5tNWGVPSU" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-white transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" /> Discord
          </a>
          <a href="https://livepix.gg/davizinzkn" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-white transition-colors">
            <Heart size={12} className="text-pink-400" /> Apoiar projeto
          </a>
        </footer>
      </main>

      <NotificationContainer />
    </div>
  );
}
