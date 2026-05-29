import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, Calendar, TrendingUp, Heart, ArrowUpRight,
  Activity, Zap, Sparkles, Bell, Search, Plus, ShieldAlert, ZapOff,
  MessageCircle, ExternalLink, LogOut, Lightbulb
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
  { name: "Tarefa SP", desc: "Lições e pendências", icon: iconTarefa, url: "/dashboard/tarefas", badge: null, key: "scripts_enabled" },
  { name: "Prepara SP", desc: "Caderno do aluno", icon: iconPreparaSp, url: "/dashboard/preparasp", badge: "HOT", key: "preparasp_enabled" },
  { name: "Redação", desc: "IA generativa", icon: iconRedacao, url: "/dashboard/redacao", badge: "AI", key: "scripts_enabled" },
  { name: "Leia SP", desc: "Leitura assistida", icon: iconLeiaSp, url: "/dashboard/leiasp", badge: null, key: "scripts_enabled" },
  { name: "Khan Academy", desc: "Resoluções", icon: iconKhan, url: "/dashboard/khan", badge: null, key: "scripts_enabled" },
  { name: "Apostilas", desc: "Banco de provas", icon: iconApostilas, url: "/dashboard/apostilas", badge: null, key: "scripts_enabled" },
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
  const navigate = useNavigate();
  const handleLogout = () => {
    clearSession();
    navigate({ to: "/" });
  };

  return (
    <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-white/5 glass-strong">
      <div className="flex items-center gap-4">
        {/* Placeholder for breadcrumbs or other left-aligned items */}
      </div>

      <div className="flex items-center gap-6">
        <div className="relative w-64 group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <input
            placeholder="Buscar..."
            className="input-premium w-full pl-9 pr-3 py-1.5 text-xs bg-white/[0.02] border-white/5 focus:border-primary/30 transition-all"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-muted-foreground/40 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-muted-foreground hover:text-white hover:border-primary/50 transition-all">
                <Bell size={14} />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)] animate-pulse" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 glass-strong border-white/10 p-0 overflow-hidden mt-2">
              <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Notificações</h4>
                  <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-widest">Sistema Sync</span>
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <div className="p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer group">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary">
                      <Sparkles size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-primary transition-colors">Novo Script Adicionado</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">O script "Astro G" já está disponível no catálogo.</p>
                      <p className="text-[9px] text-muted-foreground/40 mt-2 font-mono uppercase">Há 2 horas</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer group">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex-shrink-0 flex items-center justify-center text-accent">
                      <Zap size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-accent transition-colors">Atualização no Sistema</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">Melhorias na performance do dashboard v2.0.</p>
                      <p className="text-[9px] text-muted-foreground/40 mt-2 font-mono uppercase">Ontem</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-2 text-center bg-white/[0.01]">
                <button className="text-[10px] font-bold text-muted-foreground/60 hover:text-white transition-colors uppercase tracking-widest py-1">Limpar tudo</button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-3 pl-3 border-l border-white/5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 pl-2 py-1 rounded-xl hover:bg-white/[0.03] transition-all group">
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-2 justify-end">
                      <p className="text-xs font-bold text-white leading-none">{name}</p>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-tighter">Free Plan</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1 font-mono uppercase tracking-widest opacity-60">Aluno Conectado</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-glow-violet transition-transform group-hover:scale-105"
                       style={{ background: "var(--gradient-primary)" }}>
                    {name[0]?.toUpperCase()}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-strong border-white/10 mt-1">
                <div className="p-3 border-b border-white/5 mb-1">
                  <p className="text-xs font-bold text-white">{name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">Sync Labs Account</p>
                </div>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                  <LogOut size={14} className="mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
    );
}
function SectionPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[#0e0e16]/80 border border-white/[0.05] p-4 sm:p-5 relative overflow-hidden group/panel">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover/panel:opacity-100 transition-opacity" />
      <div className="flex items-center justify-between mb-6">
        <h2 className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-white tracking-tight">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-accent shadow-[0_0_8px_var(--primary)]" />
          {title}
        </h2>
        {action && (
          <a
            href={action.href}
            className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all flex items-center gap-1.5 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/5 hover:border-primary/30"
          >
            {action.label} <ArrowUpRight size={12} />
          </a>
        )}
      </div>
      {children}
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

          {/* Nossos Scripts */}
          <SectionPanel title="Nossos Scripts" action={{ label: "Ver todas", href: "#" }}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {[
                { name: "Tarefa SP", url: "/dashboard/tarefas", icon: iconTarefa, key: "scripts_enabled" },
                { name: "Redação Paulista", url: "/dashboard/redacao", icon: iconRedacao, key: "scripts_enabled" },
                { name: "speak", url: "#", logoText: "speak", logoBg: "bg-white", logoColor: "text-black" },
                { name: "Open English", url: "#", logoText: "open english", logoBg: "bg-[#0a3d62]", logoColor: "text-white text-[8px]" },
                { name: "Leia SP", url: "/dashboard/leiasp", icon: iconLeiaSp, key: "scripts_enabled" },
                { name: "Khan Academy", url: "/dashboard/khan", icon: iconKhan, key: "scripts_enabled" },
                { name: "Educação Profissional", url: "#", logoText: "Edu.", logoBg: "bg-white", logoColor: "text-[#1e3a5f]" },
                { name: "Alura", url: "#", aluraLogo: true },
                { name: "Astro G", url: "#", lucide: Lightbulb, lucideColor: "text-yellow-300" },
                { name: "Matific", url: "#", lucide: Lightbulb, lucideColor: "text-yellow-300" },
              ].map((s: any, i) => {
                const isOff = s.key && settings && (settings as any)[s.key] === false;
                const isDisabled = settings?.maintenance_mode || isOff;
                return (
                  <motion.div
                    key={s.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i }}
                  >
                    <Link
                      to={isDisabled ? "#" : s.url}
                      onClick={(e) => (isDisabled || s.url === "#") && e.preventDefault()}
                      className={`relative group flex flex-col items-center gap-2 p-3 rounded-xl bg-[#13131c] border border-white/[0.06] hover:border-primary/40 transition-all aspect-square justify-center ${isDisabled ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                    >
                      <span className="absolute left-2 top-2 bottom-2 w-[2px] rounded-full bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_8px_var(--primary)]" />
                      <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden">
                        {s.icon ? (
                          <img src={s.icon} alt="" className="w-8 h-8 object-contain" />
                        ) : s.lucide ? (
                          <s.lucide size={22} className={s.lucideColor} />
                        ) : s.aluraLogo ? (
                          <span className="font-black text-2xl bg-gradient-to-br from-pink-500 via-orange-400 to-cyan-400 bg-clip-text text-transparent leading-none">a</span>
                        ) : (
                          <div className={`${s.logoBg} ${s.logoColor} w-full h-full flex items-center justify-center font-black text-[10px] uppercase leading-none px-1 text-center`}>
                            {s.logoText}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-white text-center leading-tight">
                        {s.name}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </SectionPanel>

          {/* Comunidade */}
          <SectionPanel title="Comunidade">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  name: "Sync Labs",
                  subtitle: "Servidor Oficial Da Sync",
                  gradient: "from-red-900 via-red-950 to-black",
                  accent: "bg-red-500",
                  emoji: "🤖",
                  url: "https://discord.gg/F6JKWpeUSF",
                },
                {
                  name: "ASTRO G ",
                  subtitle: "Astro G",
                  gradient: "from-yellow-900/40 via-amber-950 to-black",
                  accent: "bg-yellow-400",
                  lucide: Lightbulb,
                  url: "#",
                },
                {
                  name: "Havaii",
                  subtitle: "Havaii Roleplay",
                  gradient: "from-slate-800 via-slate-900 to-black",
                  accent: "bg-cyan-400",
                  emoji: "✦",
                  url: "#",
                },
              ].map((c, i) => (
                <motion.a
                  key={c.name}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.06] hover:border-white/20 transition-all"
                >
                  <div className={`relative aspect-[16/9] bg-gradient-to-br ${c.gradient} flex items-center justify-center`}>
                    <div className="absolute inset-0 bg-grid-lines opacity-30" />
                    {c.lucide ? (
                      <c.lucide size={56} className="text-yellow-300 drop-shadow-[0_0_24px_rgba(250,204,21,0.6)]" />
                    ) : (
                      <span className="text-5xl drop-shadow-2xl">{c.emoji}</span>
                    )}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 ${c.accent}`} />
                  </div>
                  <div className="p-3 bg-[#0e0e16] border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-[2px] h-8 rounded-full bg-red-500" />
                      <div>
                        <h3 className="text-sm font-bold text-white leading-tight">{c.name}</h3>
                        <p className="text-[10px] text-muted-foreground">{c.subtitle}</p>
                      </div>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </SectionPanel>

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
                        <a href="https://discord.gg/F6JKWpeUSF" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-white transition-colors">
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
