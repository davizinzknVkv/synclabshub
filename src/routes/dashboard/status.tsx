import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Activity, RefreshCw, CheckCircle, XCircle, Clock, Lock, ShieldAlert, ZapOff, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify, NotificationContainer } from "@/components/Notification";

export const Route = createFileRoute("/dashboard/status")({
  component: StatusDashboard,
  head: () => ({
    meta: [{ title: "Status - SYNC LABS HUB" }],
  }),
});

const ADMIN_STORAGE_KEY = "sync_labs_admin_auth";
const ADMIN_PASSWORD = "SyncLab#Status2026!";

interface StatusLog {
  id: string;
  ra: string;
  task_count: number;
  task_type: string;
  status: string;
  message: string | null;
  created_at: string;
}

interface SiteSettings {
  id: string;
  maintenance_mode: boolean;
  scripts_enabled: boolean;
}

function StatusDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    if (saved === "true") setAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      sessionStorage.setItem(ADMIN_STORAGE_KEY, "true");
      setError("");
    } else {
      setError("Senha incorreta");
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("task_status_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      setLogs(data as StatusLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authenticated) fetchLogs();
  }, [authenticated]);

  if (!authenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <form
          onSubmit={handleLogin}
          className="bg-card border border-border rounded-xl p-8 w-full max-w-sm space-y-5"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Lock size={24} className="text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Área Restrita</h2>
            <p className="text-sm text-muted-foreground text-center">
              Digite a senha de administrador para acessar o painel de status.
            </p>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha de admin"
            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
            autoFocus
          />

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl text-sm font-bold border border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  const successCount = logs.filter((l) => l.status === "success").length;
  const errorCount = logs.filter((l) => l.status === "error").length;
  const totalTasks = logs.reduce((sum, l) => sum + l.task_count, 0);

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 bg-aurora">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-primary p-0.5 shadow-glow-violet">
            <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tighter">Status das Tarefas</h1>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface hover:bg-surface-hover border border-surface-border text-sm font-semibold transition-all hover:border-primary/50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Sucesso", value: successCount, color: "text-emerald-400", icon: CheckCircle },
          { label: "Erro", value: errorCount, color: "text-red-400", icon: XCircle },
          { label: "Total Tarefas", value: totalTasks, color: "text-primary", icon: Clock },
        ].map((stat, i) => (
          <div key={i} className="glass rounded-2xl p-6 border-surface-border">
            <div className={`flex items-center gap-2 ${stat.color} mb-2`}>
              <stat.icon className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">{stat.label}</span>
            </div>
            <p className="text-4xl font-black text-white tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Logs table */}
      <div className="glass-strong rounded-2xl border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-muted-foreground text-xs uppercase tracking-widest">
                <th className="text-left p-4 font-bold">RA</th>
                <th className="text-left p-4 font-bold">Tipo</th>
                <th className="text-center p-4 font-bold">Qtd</th>
                <th className="text-center p-4 font-bold">Status</th>
                <th className="text-left p-4 font-bold">Mensagem</th>
                <th className="text-left p-4 font-bold">Data</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-surface-border/50 hover:bg-surface/50 transition-colors">
                    <td className="p-4 font-mono text-xs">{log.ra}</td>
                    <td className="p-4 font-medium">{log.task_type}</td>
                    <td className="p-4 text-center font-mono">{log.task_count}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          log.status === "success"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs max-w-[200px] truncate">
                      {log.message || "—"}
                    </td>
                    <td className="p-4 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
