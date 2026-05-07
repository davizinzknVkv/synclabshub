import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.png";
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
  const [pwd, setPwd] = useState(saved?.pwd || "");
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

      saveCreds({ raNumero, raDigito, raUf, pwd });

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
      {/* Blood glow ambient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blood-glow pointer-events-none mix-blend-screen" />

      {/* Grid texture */}
      <div className="absolute inset-0 bg-obsidian-grid pointer-events-none" />

      {/* Login card */}
      <main className="relative z-10 w-full max-w-[460px] p-8 sm:p-10 bg-card border-2 border-border card-brutal rounded-xl">

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-12 bg-primary border-2 border-foreground flex items-center justify-center rounded-md rotate-3">
              <img src={logo} alt="Sync Labs" className="w-7 h-7" />
            </div>
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">v2.0</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground leading-none">
            sync<span className="text-acid">/</span>labs
          </h1>
          <p className="text-sm text-muted-foreground mt-2 font-mono">
            // automação escolar — sem firula
          </p>
        </header>

        {/* Form */}
        <form className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>

          {/* RA */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono flex items-center gap-2">
              <span className="size-1 bg-blood/40 rounded-full inline-block" />
              RA
            </label>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <input
                  type="text"
                  value={raNumero}
                  onChange={e => setRaNumero(e.target.value)}
                  placeholder="Número"
                  className="input-obsidian w-full px-3 py-3 rounded-sm text-sm tracking-wider"
                />
              </div>
              <input
                type="text"
                value={raDigito}
                onChange={e => setRaDigito(e.target.value)}
                placeholder="D"
                maxLength={1}
                className="input-obsidian w-14 text-center px-2 py-3 rounded-sm text-sm"
              />
              <div className="relative w-20 shrink-0">
                <select
                  value={raUf}
                  onChange={e => setRaUf(e.target.value)}
                  className="input-obsidian w-full appearance-none pl-3 pr-6 py-3 rounded-sm text-sm cursor-pointer text-center"
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
          <div className="flex flex-col gap-2.5">
            <label className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono flex items-center gap-2">
              <span className="size-1 bg-blood/40 rounded-full inline-block" />
              Senha
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                placeholder="••••••••••••"
                className="input-obsidian w-full px-3 py-3 pr-10 rounded-sm text-sm tracking-[0.3em]"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPwd ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="mt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-blood w-full py-3.5 rounded-md font-mono text-sm uppercase tracking-[0.15em] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                "ENTRAR →"
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <footer className="mt-10 pt-6 border-t border-glass-border/50 flex justify-between items-center">
          <a
            href="https://discord.gg/y5tNWGVPSU"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest font-mono"
          >
            <div className="size-1.5 border border-muted-foreground group-hover:border-foreground group-hover:bg-foreground transition-all rounded-[1px]" />
            Discord
          </a>
          <a
            href="https://livepix.gg/davizinzkn"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest font-mono"
          >
            <div className="size-1.5 border border-muted-foreground group-hover:border-foreground group-hover:bg-foreground transition-all rounded-[1px]" />
            Doações
          </a>
        </footer>
      </main>

      <NotificationContainer />
    </div>
  );
}
