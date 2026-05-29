import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, Calendar, TrendingUp, Heart, ArrowUpRight,
  Activity, Zap, Sparkles, Bell, Search, Plus, ShieldAlert, ZapOff,
  MessageCircle, ExternalLink
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getSession, clearSession } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchDashboardStats } from "@/lib/api";
import type { DashboardStats } from "@/lib/api";
import { PendenciasModal } from "@/components/PendenciasModal";
import { WelcomePopup } from "@/components/WelcomePopup";
import iconTarefa from "@/assets/icons/tarefa-sp.png";
import iconRedacao from "@/assets/icons/redacao.png";
import iconLeiaSp from "@/assets/icons/leia-sp.png";
import iconKhan from "@/assets/icons/khan.png";
import iconApostilas from "@/assets/icons/apostilas.png";
import iconPreparaSp from "@/assets/icons/prepara-sp.png";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
  head: () => ({ meta: [{ title: "Dashboard — Sync Labs" }] }),
});

const SCRIPTS = [
  { name: "Tarefa SP", desc: "Lições e pendências", icon: iconTarefa, url: "/dashboard/tarefas", badge: null },
  { name: "Prepara SP", desc: "Caderno do aluno", icon: iconPreparaSp, url: "/dashboard/preparasp", badge: "HOT" },
  { name: "Redação", desc: "IA generativa", icon: iconRedacao, url: "/dashboard/redacao", badge: "AI" },
  { name: "Leia SP", desc: "Leitura assistida", icon: iconLeiaSp, url: "/dashboard/leiasp", badge: null },
  { name: "Khan Academy", desc: "Resoluções", icon: iconKhan, url: "/dashboard/khan", badge: null },
  { name: "Apostilas", desc: "Banco de provas", icon: iconApostilas, url: "/dashboard/apostilas", badge: null },
];

// Animated counter
function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}{suffix}</>;
}

function Topbar({ name }: { name: string }) {
  return (
    <div className="hidden md:flex items-center gap-3 px-6 py-3 border-b border-white/5 glass-strong">
      <div className="relative flex-1 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Buscar scripts, automações..."
          className="input-premium w-full pl-9 pr-3 py-2 text-sm"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground bg-white/5 border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative w-9 h-9 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-muted-foreground hover:text-white hover:border-primary/40 transition-all">
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-destructive shadow-[0_0_8px_currentColor]" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 glass-strong border-white/10 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h4 className="text-sm font-bold text-white">Notificações</h4>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Sistema Sync</span>
              </div>
              <div className="py-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto text-muted-foreground/30">
                  <Bell size={20} />
                </div>
                <p className="text-xs text-muted-foreground">Você não tem novas notificações no momento.</p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex items-center gap-2 pl-2 ml-1 border-l border-white/5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white"
               style={{ background: "var(--gradient-primary)" }}>
            {name[0]?.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardHome() {
  const session = getSession();
  const displayName = session?.nick || session?.ra || "Aluno";
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<{ maintenance_mode: boolean; scripts_enabled: boolean; preparasp_enabled: boolean } | null>(null);
  const [pendOpen, setPendOpen] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("*").single().then(({ data }) => {
      if (data) setSettings(data as any);
    });

    if (!session) return;
    setLoading(true);
    fetchDashboardStats(session.authToken, session.externalId)
      .then(setStats)
      .catch(() => setStats({ pendencias: 0, faltas: 0, frequencia: 100 }))
      .finally(() => setLoading(false));
  }, [session?.authToken, session?.externalId]);

  const statCards = useMemo(() => [
    {
      icon: CheckCircle2, label: "Pendências", value: stats?.pendencias ?? 0, suffix: "",
      tint: "from-violet-500/20 to-violet-500/5", iconColor: "text-primary",
      trend: stats?.pendencias === 0 ? "Tudo em dia" : "ação necessária",
    },
    {
      icon: Calendar, label: "Faltas", value: stats?.faltas ?? 0, suffix: "",
      tint: "from-cyan-500/20 to-cyan-500/5", iconColor: "text-accent",
      trend: (stats?.faltas ?? 0) < 5 ? "controle" : "atenção",
    },
    {
      icon: TrendingUp, label: "Frequência", value: stats?.frequencia ?? 100, suffix: "%",
      tint: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400",
      trend: (stats?.frequencia ?? 100) >= 75 ? "presença ok" : "abaixo do mínimo",
    },
    {
      icon: Heart, label: "Apoiar", value: 0, suffix: "",
      isLink: "https://livepix.gg/davizinzkn",
      tint: "from-pink-500/20 to-pink-500/5", iconColor: "text-pink-400",
      trend: "doe ao projeto",
    },
  ], [stats]);

  return (
    <div className="min-h-screen relative">
      {/* Ambient bg */}
      <div className="fixed inset-0 bg-aurora pointer-events-none" />
      <div className="fixed inset-0 bg-grid-lines pointer-events-none opacity-50" />

      <div className="relative">
        <Topbar name={displayName} />

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-end justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  {stats?.turma || "Sync Labs Hub"}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 flex items-center gap-1">
                  <span className="status-online w-1 h-1 rounded-full bg-emerald-400" /> Online
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-display">
                Olá, <span className="text-gradient">{displayName}</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Sua central de automação inteligente. Tudo sob controle.
              </p>
            </div>
          </motion.div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {statCards.map((stat, i) => {
              const isPend = stat.label === "Pendências";
              const Wrapper: any = stat.isLink ? "a" : isPend ? "button" : "div";
              const wrapperProps = stat.isLink
                ? { href: stat.isLink, target: "_blank", rel: "noopener noreferrer" }
                : isPend
                ? { onClick: () => setPendOpen(true), type: "button" }
                : {};
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Wrapper {...wrapperProps} className="card-premium block p-4 sm:p-5 cursor-pointer text-left w-full">

                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.tint} opacity-60 pointer-events-none`} />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-9 h-9 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center ${stat.iconColor}`}>
                          <stat.icon size={17} />
                        </div>
                        <ArrowUpRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono mb-1">{stat.label}</p>
                      <div className="text-3xl font-bold text-white font-display tabular-nums">
                        {loading ? (
                          <div className="h-8 w-16 skeleton-shimmer rounded-md" />
                        ) : (
                          <Counter value={stat.value} suffix={stat.suffix} />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                        <Activity size={11} className={stat.iconColor} /> {stat.trend}
                      </p>
                    </div>
                  </Wrapper>
                </motion.div>
              );
            })}
          </div>

          {/* Scripts grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                  <Zap size={16} className="text-primary" /> Scripts disponíveis
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Automações prontas para executar</p>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {SCRIPTS.length} ATIVOS
              </span>
            </div>

            <div className="relative">
              {settings?.maintenance_mode && (
                <div className="absolute inset-0 z-20 flex items-center justify-center p-8 glass-strong rounded-3xl border border-red-500/30">
                  <div className="text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 animate-pulse">
                      <ShieldAlert size={32} />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Sistema em Manutenção</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">Estamos otimizando nossos servidores para oferecer uma experiência superior. Voltaremos em instantes.</p>
                  </div>
                </div>
              )}

              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 transition-all duration-500 ${settings?.maintenance_mode ? 'blur-md grayscale opacity-40 pointer-events-none' : ''}`}>
                {SCRIPTS.map((script, i) => {
                  const isPreparaOff = script.url === "/dashboard/preparasp" && settings?.preparasp_enabled === false;
                  const isDisabled = settings?.scripts_enabled === false || isPreparaOff;
                  
                  return (
                    <motion.div
                      key={script.name}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.04 }}
                    >
                      <Link
                        to={isDisabled ? "#" : script.url}
                        onClick={(e) => isDisabled && e.preventDefault()}
                        className={`card-premium group block p-5 ${isDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                      >
                        <div className="relative flex items-start gap-4">
                          <div className="relative">
                            <div className="absolute inset-0 rounded-xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity"
                              style={{ background: isDisabled ? "oklch(0.62 0.03 270)" : "linear-gradient(135deg, oklch(0.6 0.3 280), oklch(0.7 0.2 200))" }} />
                            <div className="relative w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                              <img src={script.icon} alt="" className={`w-7 h-7 object-contain ${isDisabled ? 'grayscale' : ''}`} loading="lazy" width={28} height={28} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-bold text-white tracking-tight">{script.name}</h3>
                              {script.badge && (
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-white"
                                  style={{ background: script.badge === "AI" ? "linear-gradient(135deg, oklch(0.6 0.3 280), oklch(0.7 0.2 200))" : "oklch(0.6 0.3 280)" }}>
                                  {script.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{isDisabled ? "Script temporariamente desligado" : script.desc}</p>
                          </div>
                          {!isDisabled && <ArrowUpRight size={15} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />}
                          {isDisabled && <ZapOff size={14} className="text-muted-foreground" />}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Developers Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pt-8 border-t border-white/5"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                  <Heart size={16} className="text-pink-400" /> Equipe Sync Labs
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">As mentes por trás da plataforma</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { 
                  name: "Davizinkn", 
                  role: "Founder & Lead Dev", 
                  github: "davizinkn",
                  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Davizinkn",
                  gradient: "from-violet-600/20 to-cyan-600/20"
                },
                { 
                  name: "Zennos", 
                  role: "Co-Founder & UI/UX", 
                  github: "zennos",
                  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zennos",
                  gradient: "from-cyan-600/20 to-emerald-600/20"
                }
              ].map((dev, i) => (
                <div key={dev.name} className="card-premium p-4 group">
                  <div className={`absolute inset-0 bg-gradient-to-br ${dev.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-white/5 p-1">
                        <img src={dev.avatar} alt={dev.name} className="w-full h-full object-cover rounded-xl" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white mb-0.5">{dev.name}</h3>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">{dev.role}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <a href={`https://github.com/${dev.github}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-white transition-colors">
                          <ExternalLink size={14} />
                        </a>
                        <a href="https://discord.gg/y5tNWGVPSU" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-white transition-colors">
                          <MessageCircle size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <PendenciasModal open={pendOpen} onClose={() => setPendOpen(false)} counts={{ tarefas: stats?.pendencias ?? 0 }} />
      <WelcomePopup />
    </div>
  );
}
