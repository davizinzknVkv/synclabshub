import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { EyeOff, Eye, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { NotificationContainer, notify } from "@/components/Notification";
import { setSession } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "SYNC LABS HUB - Login" },
      { name: "description", content: "SYNC LABS HUB - Sua plataforma de estudos" },
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
  const [raNumero, setRaNumero] = useState("");
  const [raDigito, setRaDigito] = useState("");
  const [raUf, setRaUf] = useState("SP");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

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

      // Fetch rooms
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

      setSession({
        ra: fullRa,
        authToken: data.auth_token,
        nick: data.nick || data.name,
        name: data.name,
        rooms: (roomData.rooms || []).map((r: { id: number; name: string }) => ({ id: r.id, name: r.name })),
      });

      notify("LOGIN REALIZADO COM SUCESSO");
      navigate({ to: "/dashboard" });
    } catch (err) {
      notify(err instanceof Error ? err.message : "ERRO NO LOGIN");
    } finally {
      setLoading(false);
    }
  }, [raNumero, raDigito, fullRa, pwd, loading, navigate]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-96 bg-glow-red pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center w-full max-w-lg px-4"
      >
        <motion.img
          src={logo}
          alt="SYNC LABS"
          className="w-28 h-28 mb-4 drop-shadow-[0_0_30px_oklch(0.5_0.2_20/0.5)]"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        />

        <h1 className="title-display text-5xl font-bold mb-1">Sync Labs</h1>
        <p className="text-sm tracking-[0.25em] uppercase text-muted-foreground mb-10">
          Sua plataforma de estudos
        </p>

        <div className="w-16 h-0.5 bg-primary rounded-full mb-8 opacity-60" />

        <div className="w-full bg-card/80 backdrop-blur-sm border border-border rounded-xl p-6 space-y-5">
          {/* RA Fields */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground mb-1">
              <span className="text-primary">🪪</span> RA
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <span className="text-xs text-muted-foreground mb-1 block">NÚMERO</span>
                <input
                  type="text"
                  value={raNumero}
                  onChange={e => setRaNumero(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface border border-surface-border text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="w-16">
                <span className="text-xs text-muted-foreground mb-1 block">DÍGITO</span>
                <input
                  type="text"
                  value={raDigito}
                  onChange={e => setRaDigito(e.target.value)}
                  maxLength={1}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface border border-surface-border text-foreground outline-none focus:border-primary transition-colors text-center"
                />
              </div>
              <div className="w-20">
                <span className="text-xs text-muted-foreground mb-1 block">&nbsp;</span>
                <select
                  value={raUf}
                  onChange={e => setRaUf(e.target.value)}
                  className="w-full px-2 py-2.5 rounded-lg bg-surface border border-surface-border text-foreground outline-none focus:border-primary transition-colors appearance-none text-center cursor-pointer"
                >
                  {UF_LIST.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground mb-2">
              <span className="text-primary">🔒</span> SENHA
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full px-3 py-2.5 pr-10 rounded-lg bg-surface border border-surface-border text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
              />
              <button
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPwd ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          {/* Entrar button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-xl btn-entrar text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Entrar <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>

        <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
          <a href="https://discord.gg/yXYKSZAK9Z" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            💬 Discord
          </a>
          <span className="text-border">•</span>
          <a href="https://pixgg.com/marcos10pc" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            ❤️ Doações
          </a>
        </div>

        <p className="mt-6 text-xs tracking-[0.2em] uppercase text-muted-foreground">2026</p>
      </motion.div>

      <NotificationContainer />
    </div>
  );
}
