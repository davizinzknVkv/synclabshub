import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle, Heart, Calendar, TrendingUp, CheckSquare, PenTool, ArrowRight, Loader2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { fetchDashboardStats } from "@/lib/api";
import type { DashboardStats } from "@/lib/api";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
  head: () => ({
    meta: [{ title: "Dashboard - SYNC LABS HUB" }],
  }),
});

const SCRIPTS = [
  { name: "Tarefa SP", icon: "📝", url: "/dashboard/tarefas" },
  { name: "Redação", icon: "✍️", url: "/dashboard/redacao" },
  { name: "Leia SP", icon: "📖", url: "#" },
  { name: "Khan Academy", icon: "🎓", url: "#" },
  { name: "Alura", icon: "💻", url: "#" },
  { name: "CMSP Bots", icon: "🤖", url: "#" },
];

function DashboardHome() {
  const session = getSession();
  const displayName = session?.nick || session?.ra || "Aluno";
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!session) return;
    setLoadingStats(true);
    fetchDashboardStats(session.authToken)
      .then(setStats)
      .catch(() => setStats({ pendencias: 0, faltas: 0, frequencia: 100 }))
      .finally(() => setLoadingStats(false));
  }, [session?.authToken]);

  const statCards = [
    {
      icon: CheckCircle,
      label: "Pendências",
      value: loadingStats ? null : String(stats?.pendencias ?? 0),
      color: "text-primary",
      borderColor: "border-primary/20",
    },
    {
      icon: Heart,
      label: "Doação",
      value: "♥",
      color: "text-pink-500",
      borderColor: "border-pink-500/20",
    },
    {
      icon: Calendar,
      label: "Faltas",
      value: loadingStats ? null : String(stats?.faltas ?? 0),
      color: "text-blue-400",
      borderColor: "border-blue-400/20",
    },
    {
      icon: TrendingUp,
      label: "Frequência",
      value: loadingStats ? null : `${stats?.frequencia ?? 100}%`,
      color: stats && stats.frequencia >= 75 ? "text-emerald-400" : "text-primary",
      borderColor: stats && stats.frequencia >= 75 ? "border-emerald-400/20" : "border-primary/20",
      subtitle: stats && stats.frequencia >= 75 ? "Presença boa" : stats && stats.frequencia < 75 ? "Atenção!" : undefined,
      subtitleColor: stats && stats.frequencia >= 75 ? "text-emerald-400" : "text-primary",
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-sm bg-blood-muted border border-primary/20 flex items-center justify-center text-primary font-mono font-bold text-sm">
          {displayName[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-lg font-medium text-white tracking-tight">
            Olá, <span className="uppercase font-mono">{displayName}</span>
          </h1>
          <p className="text-xs text-muted-foreground font-mono tracking-wider">
            {stats?.turma || "Sync Labs Hub"}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`bg-card border ${stat.borderColor} rounded-sm p-4`}
          >
            <stat.icon size={16} className={stat.color} />
            {stat.value === null ? (
              <div className="mt-3 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            ) : (
              <p className="text-2xl font-bold text-white mt-3 font-mono">{stat.value}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-mono">{stat.label}</p>
            {"subtitle" in stat && stat.subtitle && (
              <p className={`text-[10px] mt-1 font-mono ${stat.subtitleColor}`}>{stat.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      {/* Scripts section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-0.5 h-4 bg-primary rounded-full" />
          <h2 className="text-xs font-bold text-white uppercase tracking-[0.15em] font-mono">
            Scripts Disponíveis
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SCRIPTS.map((script) => (
            <Link
              key={script.name}
              to={script.url}
              className="flex flex-col items-center gap-2 p-4 bg-card border border-glass-border rounded-sm hover:border-primary/30 hover:bg-blood-muted transition-all group"
            >
              <span className="text-2xl">{script.icon}</span>
              <span className="text-[10px] font-mono font-medium text-muted-foreground group-hover:text-foreground text-center transition-colors uppercase tracking-wider">
                {script.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <Link
          to="/dashboard/tarefas"
          className="flex items-center justify-between bg-card border border-glass-border rounded-sm p-4 hover:border-primary/30 transition-all group"
        >
          <div className="flex items-center gap-3">
            <CheckSquare size={16} className="text-primary" />
            <div>
              <p className="text-xs font-mono font-semibold text-white uppercase tracking-wider">Tarefa SP</p>
              <p className="text-[10px] text-muted-foreground font-mono">Lições pendentes e expiradas</p>
            </div>
          </div>
          <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>

        <Link
          to="/dashboard/redacao"
          className="flex items-center justify-between bg-card border border-glass-border rounded-sm p-4 hover:border-primary/30 transition-all group"
        >
          <div className="flex items-center gap-3">
            <PenTool size={16} className="text-primary" />
            <div>
              <p className="text-xs font-mono font-semibold text-white uppercase tracking-wider">Redação Paulista</p>
              <p className="text-[10px] text-muted-foreground font-mono">Gerar e enviar redações com IA</p>
            </div>
          </div>
          <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      </div>
    </div>
  );
}
