import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle, Heart, Calendar, TrendingUp, CheckSquare, ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
  head: () => ({
    meta: [{ title: "Dashboard - SYNC LABS HUB" }],
  }),
});

const SCRIPTS = [
  { name: "Tarefa SP", icon: "📝", url: "/dashboard/tarefas" },
  { name: "Redação Paulista", icon: "✍️", url: "#" },
  { name: "Leia SP", icon: "📖", url: "#" },
  { name: "Khan Academy", icon: "🎓", url: "#" },
  { name: "Alura", icon: "💻", url: "#" },
  { name: "CMSP Bots", icon: "🤖", url: "#" },
];

function DashboardHome() {
  const session = getSession();
  const displayName = session?.nick || session?.ra?.slice(0, 8) || "Aluno";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
            {displayName[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Olá, <span className="uppercase">{displayName}</span>
            </h1>
            <p className="text-sm text-muted-foreground">Bem-vindo ao Sync Labs Hub</p>
          </div>
        </motion.div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: CheckCircle, label: "Pendências", value: "—", color: "text-red-400", borderColor: "border-red-500/30" },
          { icon: Heart, label: "Doação", value: "♥", color: "text-pink-400", borderColor: "border-pink-500/30" },
          { icon: Calendar, label: "Faltas", value: "—", color: "text-blue-400", borderColor: "border-blue-500/30" },
          { icon: TrendingUp, label: "Frequência", value: "100%", color: "text-green-400", borderColor: "border-green-500/30" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-card border ${stat.borderColor} rounded-xl p-5`}
          >
            <stat.icon size={20} className={stat.color} />
            <p className="text-3xl font-bold text-foreground mt-3">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Scripts section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full inline-block" />
            Nossos Scripts
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {SCRIPTS.map((script, i) => (
            <motion.div
              key={script.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
            >
              <Link
                to={script.url}
                className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-surface-hover transition-all group"
              >
                <span className="text-3xl">{script.icon}</span>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground text-center transition-colors">
                  {script.name}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Link
          to="/dashboard/tarefas"
          className="flex items-center justify-between bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all group"
        >
          <div className="flex items-center gap-3">
            <CheckSquare size={20} className="text-primary" />
            <div>
              <p className="font-semibold text-foreground">Tarefa SP</p>
              <p className="text-sm text-muted-foreground">Fazer lições pendentes e expiradas</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      </motion.div>
    </div>
  );
}
