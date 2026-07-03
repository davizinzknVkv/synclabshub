import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Calendar,
  TrendingUp,
  Heart,
  ArrowUpRight,
  Sparkles,
  Bell,
  Search,
  Command,
  LogOut,
  Circle,
  ChevronRight,
  ExternalLink,
  Zap,
  Lightbulb,
  MessageCircle,
  Rocket,
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
  head: () => ({ meta: [{ title: "Overview — Flux Hub" }] }),
});

type Settings = {
  maintenance_mode: boolean;
  scripts_enabled: boolean;
  preparasp_enabled: boolean;
} | null;

type App = {
  name: string;
  desc: string;
  url: string;
  icon?: string;
  lucide?: typeof Lightbulb;
  key?: "scripts_enabled" | "preparasp_enabled";
  tag?: string;
  soon?: boolean;
};

const APPS: App[] = [
  { name: "Tarefa SP", desc: "Lições e pendências automáticas", icon: iconTarefa, url: "/dashboard/tarefas", key: "scripts_enabled", tag: "Popular" },
  { name: "Prepara SP", desc: "Caderno do aluno resolvido", icon: iconPreparaSp, url: "/dashboard/preparasp", key: "preparasp_enabled", tag: "Novo" },
  { name: "Redação", desc: "Geração e envio com IA", icon: iconRedacao, url: "/dashboard/redacao", key: "scripts_enabled", tag: "AI" },
  { name: "Leia SP", desc: "Leitura orientada", icon: iconLeiaSp, url: "/dashboard/leiasp", key: "scripts_enabled" },
  { name: "Khan Academy", desc: "Resoluções contínuas", icon: iconKhan, url: "/dashboard/khan", key: "scripts_enabled" },
  { name: "Apostilas", desc: "Banco de provas oficiais", icon: iconApostilas, url: "/dashboard/apostilas" },
  { name: "Astro G", desc: "Assistente estelar", url: "#", lucide: Lightbulb, soon: true },
  { name: "Matific", desc: "Matemática guiada", url: "#", lucide: Rocket, soon: true },
];

function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 800;
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
  return (
    <>
      {n}
      {suffix}
    </>
  );
}

function Topbar({ name }: { name: string }) {
  const navigate = useNavigate();
  const initials = name.slice(0, 2).toUpperCase();
  const handleLogout = () => {
    clearSession();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-30 hairline-b surface-1/95 backdrop-blur-xl">
      <div className="flex items-center justify-between h-[52px] px-4 sm:px-5 lg:px-8 gap-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground min-w-0">
          <span className="hidden sm:inline">Flux Hub</span>
          <ChevronRight size={12} className="hidden sm:inline text-muted-foreground/40" />
          <span className="text-white font-medium truncate">Overview</span>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <button className="hidden md:flex items-center gap-2 h-8 pl-2.5 pr-1.5 rounded-[8px] surface-2 hairline text-[12px] text-muted-foreground/70 hover:text-white hover:border-white/15 transition-colors">
            <Search size={12} strokeWidth={1.8} />
            <span className="w-32 text-left">Buscar em tudo…</span>
            <span className="kbd-key">
              <Command size={9} strokeWidth={2.5} />K
            </span>
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button className="relative w-8 h-8 rounded-[8px] surface-2 hairline flex items-center justify-center text-muted-foreground hover:text-white hover:border-white/15 transition-colors">
                <Bell size={13.5} strokeWidth={1.8} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[oklch(0.62_0.24_292)]" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 surface-2 hairline rounded-xl overflow-hidden mt-2">
              <div className="px-4 py-3 hairline-b flex items-center justify-between">
                <div className="text-[13px] font-semibold text-white">Novidades</div>
                <span className="chip !text-[9px]">2 novas</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {[
                  { icon: Sparkles, title: "Astro G chegou", desc: "Novo assistente disponível no catálogo.", time: "há 2h" },
                  { icon: Zap, title: "Dashboard v2.0", desc: "Interface redesenhada e mais rápida.", time: "ontem" },
                ].map((n) => (
                  <div key={n.title} className="px-4 py-3 hairline-b last:border-b-0 hover:bg-white/[0.02] transition-colors cursor-pointer">
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-[8px] surface-3 hairline flex items-center justify-center text-[oklch(0.75_0.15_290)] flex-shrink-0">
                        <n.icon size={13} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-white">{n.title}</div>
                        <div className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{n.desc}</div>
                        <div className="text-[10px] text-muted-foreground/60 mt-1.5 font-mono uppercase tracking-wider">{n.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="hidden sm:block h-6 w-px bg-white/[0.06] mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 h-8 pl-1 pr-3 rounded-[8px] hover:bg-white/[0.035] transition-colors">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.62 0.24 292), oklch(0.58 0.22 262))",
                  }}
                >
                  {initials}
                </div>
                <span className="hidden sm:block text-[12.5px] font-medium text-white">{name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 surface-2 hairline rounded-xl mt-1">
              <div className="px-3 py-2.5 hairline-b">
                <div className="text-[12.5px] font-semibold text-white">{name}</div>
                <div className="text-[11px] text-muted-foreground">Flux Hub · Free</div>
              </div>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-[12.5px]"
              >
                <LogOut size={13} className="mr-2" />
                Sair da conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function DashboardHome() {
  const session = getSession();
  const displayName = session?.nick || session?.ra || "Aluno";
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>(null);
  const [pendOpen, setPendOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("*")
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as unknown as Settings);
      });

    if (!session) return;
    setLoading(true);
    fetchDashboardStats(session.authToken, session.externalId)
      .then(setStats)
      .catch(() => setStats({ pendencias: 0, faltas: 0, frequencia: 100 }))
      .finally(() => setLoading(false));
  }, [session?.authToken, session?.externalId]);

  const statCards = useMemo(
    () => [
      {
        icon: CheckCircle2,
        label: "Pendências",
        value: stats?.pendencias ?? 0,
        suffix: "",
        hint: stats?.pendencias === 0 ? "Tudo em dia" : "requer ação",
        good: stats?.pendencias === 0,
        onClick: "pend" as const,
      },
      {
        icon: Calendar,
        label: "Faltas",
        value: stats?.faltas ?? 0,
        suffix: "",
        hint: (stats?.faltas ?? 0) < 5 ? "sob controle" : "atenção",
        good: (stats?.faltas ?? 0) < 5,
      },
      {
        icon: TrendingUp,
        label: "Frequência",
        value: stats?.frequencia ?? 100,
        suffix: "%",
        hint:
          (stats?.frequencia ?? 100) >= 75
            ? "acima do mínimo"
            : "abaixo do mínimo",
        good: (stats?.frequencia ?? 100) >= 75,
      },
      {
        icon: Heart,
        label: "Apoiar",
        value: 0,
        suffix: "",
        hint: "doe ao projeto",
        link: "https://livepix.gg/davizinzkn",
      },
    ],
    [stats],
  );

  return (
    <div className="relative min-h-screen surface-1 overflow-hidden">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 55% 40% at 12% -10%, oklch(0.58 0.24 292 / 0.18) 0%, transparent 60%), radial-gradient(ellipse 45% 35% at 95% 5%, oklch(0.58 0.22 262 / 0.14) 0%, transparent 65%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-dots opacity-40" />

      <div className="relative z-10">
        <Topbar name={displayName} />

        <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8 sm:space-y-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="chip">
                <Circle size={6} fill="currentColor" className="text-emerald-400" />
                {stats?.turma || "Conectado"}
              </span>
              <span className="chip">
                <Sparkles size={10} className="text-[oklch(0.75_0.15_290)]" />
                Free
              </span>
            </div>
            <h1 className="text-[22px] sm:text-[28px] md:text-[32px] font-bold tracking-tight text-white font-display leading-[1.1] break-words">
              Olá,{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, oklch(0.75 0.19 292), oklch(0.75 0.17 262))",
                }}
              >
                {displayName}
              </span>
            </h1>
            <p className="text-[13.5px] text-muted-foreground mt-2 max-w-xl">
              Sua central de automação inteligente. Aqui está o resumo de hoje.
            </p>
          </div>

          <Link
            to="/dashboard/tarefas"
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-[9px] text-[12.5px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.99]"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.62 0.24 292), oklch(0.58 0.22 262))",
              boxShadow:
                "0 6px 22px -8px oklch(0.58 0.24 292 / 0.65), inset 0 1px 0 oklch(1 0 0 / 0.22)",
            }}
          >
            <Zap size={13} strokeWidth={2.2} />
            Nova automação
          </Link>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((stat, i) => {
            const inner = (
              <>
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-[8px] surface-3 hairline flex items-center justify-center text-[oklch(0.75_0.15_290)]">
                    <stat.icon size={14} strokeWidth={1.8} />
                  </div>
                  <ArrowUpRight size={13} className="text-muted-foreground/40 group-hover:text-white transition-colors" />
                </div>
                <div className="mt-4">
                  <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </div>
                  <div className="mt-1 text-[28px] font-semibold tabular-nums text-white font-display leading-none">
                    {loading ? (
                      <div className="h-7 w-14 skeleton-shimmer rounded-md" />
                    ) : (
                      <Counter value={stat.value} suffix={stat.suffix} />
                    )}
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px]">
                    <Circle
                      size={6}
                      fill="currentColor"
                      className={
                        stat.good === false
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }
                    />
                    <span className="text-muted-foreground">{stat.hint}</span>
                  </div>
                </div>
              </>
            );

            const className =
              "group card-flat block p-4 sm:p-5 cursor-pointer text-left w-full";

            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                {stat.link ? (
                  <a
                    href={stat.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    {inner}
                  </a>
                ) : stat.onClick === "pend" ? (
                  <button
                    type="button"
                    onClick={() => setPendOpen(true)}
                    className={className}
                  >
                    {inner}
                  </button>
                ) : (
                  <div className={className}>{inner}</div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Apps grid */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-[16px] font-semibold text-white tracking-tight">
                Aplicações
              </h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Automações prontas para usar agora.
              </p>
            </div>
            <a
              href="#"
              className="text-[11.5px] font-medium text-muted-foreground hover:text-white transition-colors inline-flex items-center gap-1"
            >
              Ver catálogo
              <ArrowUpRight size={11} />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {APPS.map((app, i) => {
              const isOff = app.key && settings && (settings as never)[app.key] === false;
              const isDisabled = settings?.maintenance_mode || isOff || app.soon;
              return (
                <motion.div
                  key={app.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * i }}
                >
                  <Link
                    to={isDisabled ? "#" : app.url}
                    onClick={(e) => (isDisabled || app.url === "#") && e.preventDefault()}
                    className={`card-flat group relative flex flex-col p-4 h-full ${
                      isDisabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-[10px] surface-3 hairline flex items-center justify-center overflow-hidden">
                        {app.icon ? (
                          <img src={app.icon} alt="" className="w-6 h-6 object-contain" />
                        ) : app.lucide ? (
                          <app.lucide size={16} className="text-[oklch(0.75_0.15_290)]" />
                        ) : null}
                      </div>
                      {app.tag && (
                        <span className="chip !text-[9.5px] !py-0.5">
                          {app.tag}
                        </span>
                      )}
                      {app.soon && (
                        <span className="chip !text-[9.5px] !py-0.5 opacity-70">
                          em breve
                        </span>
                      )}
                    </div>
                    <div className="text-[13.5px] font-semibold text-white leading-tight">
                      {app.name}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground mt-1 leading-snug">
                      {app.desc}
                    </div>
                    <div className="mt-4 pt-3 hairline-t flex items-center justify-between text-[11px] text-muted-foreground/70">
                      <span>Abrir</span>
                      <ChevronRight
                        size={13}
                        className="group-hover:translate-x-0.5 transition-transform text-muted-foreground/50"
                      />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Community */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-[16px] font-semibold text-white tracking-tight">
                Comunidade
              </h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Conecte-se com quem constrói o Flux Hub.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                name: "Flux Hub Oficial",
                subtitle: "Servidor Discord da comunidade",
                icon: MessageCircle,
                url: "https://discord.gg/F6JKWpeUSF",
                gradient:
                  "linear-gradient(135deg, oklch(0.62 0.24 292 / 0.35), transparent 60%)",
              },
              {
                name: "Equipe de Scripts",
                subtitle: "Devs, contribuidores & parceiros",
                icon: Rocket,
                url: "#",
                gradient:
                  "linear-gradient(135deg, oklch(0.58 0.22 262 / 0.35), transparent 60%)",
              },
            ].map((c) => (
              <a
                key={c.name}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card-flat group relative overflow-hidden p-5 flex items-center gap-4"
              >
                <div
                  className="absolute inset-0 opacity-60 pointer-events-none transition-opacity group-hover:opacity-100"
                  style={{ background: c.gradient }}
                />
                <div className="relative w-11 h-11 rounded-[10px] surface-3 hairline flex items-center justify-center text-white flex-shrink-0">
                  <c.icon size={17} strokeWidth={1.8} />
                </div>
                <div className="relative flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-white truncate">
                    {c.name}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5 truncate">
                    {c.subtitle}
                  </div>
                </div>
                <ExternalLink
                  size={13}
                  className="relative text-muted-foreground/60 group-hover:text-white transition-colors"
                />
              </a>
            ))}
          </div>
        </section>
        </div>
      </div>




      <PendenciasModal open={pendOpen} onClose={() => setPendOpen(false)} />
      <WelcomePopup />
    </div>
  );
}
