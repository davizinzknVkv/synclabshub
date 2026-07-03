import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Activity, RefreshCw, CheckCircle, XCircle, Clock, Lock, ShieldAlert, ZapOff, Zap, GraduationCap } from "lucide-react";
import { notify, NotificationContainer } from "@/components/Notification";

export const Route = createFileRoute("/dashboard/status")({
  component: StatusDashboard,
  head: () => ({
    meta: [{ title: "Status - FLUX HUB" }],
  }),
});

const ADMIN_TOKEN_KEY = "sync_labs_admin_token";

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
  preparasp_enabled: boolean;
}

function StatusDashboard() {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(ADMIN_TOKEN_KEY) : null,
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [updating, setUpdating] = useState(false);

  const authenticated = !!token;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setError(data.error || "Senha incorreta");
        return;
      }
      sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setToken(data.token);
      setPassword("");
    } catch {
      setError("Erro de conexão");
    }
  };

  const authHeader = (): HeadersInit =>
    token ? { Authorization: `Bearer ${token}` } : {};

  const handleUnauthorized = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
  };

  const fetchLogs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/logs", { headers: authHeader() });
      if (res.status === 401) return handleUnauthorized();
      const data = (await res.json()) as { logs?: StatusLog[] };
      setLogs(data.logs ?? []);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    const res = await fetch("/api/admin/settings");
    const data = (await res.json()) as { settings?: SiteSettings };
    if (data.settings) setSettings(data.settings);
  };

  const updateSetting = async (
    field: "maintenance_mode" | "scripts_enabled" | "preparasp_enabled",
    value: boolean,
  ) => {
    if (!settings || updating || !token) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        notify("SESSÃO EXPIRADA");
        return;
      }
      const data = (await res.json()) as { settings?: SiteSettings; error?: string };
      if (!res.ok || !data.settings) {
        notify("ERRO AO ATUALIZAR CONFIGURAÇÃO");
        return;
      }
      setSettings(data.settings);
      notify(`${field.replace("_", " ").toUpperCase()} ATUALIZADO`);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchLogs();
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <NotificationContainer />
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-primary p-0.5 shadow-glow-violet">
            <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tighter">Painel de Controle</h1>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-1">Admin Dashboard</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {settings && (
            <div className="flex items-center gap-2 p-1 glass rounded-xl border-surface-border">
              <button
                onClick={() => updateSetting('maintenance_mode', !settings.maintenance_mode)}
                disabled={updating}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  settings.maintenance_mode 
                    ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <ShieldAlert size={14} />
                Manutenção: {settings.maintenance_mode ? "ON" : "OFF"}
              </button>
              <div className="w-px h-4 bg-surface-border mx-1" />
              <button
                onClick={() => updateSetting('scripts_enabled', !settings.scripts_enabled)}
                disabled={updating}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  !settings.scripts_enabled 
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                    : "bg-emerald-500/10 text-emerald-400"
                }`}
              >
                {settings.scripts_enabled ? <Zap size={14} /> : <ZapOff size={14} />}
                Scripts: {settings.scripts_enabled ? "Ativos" : "Desligados"}
              </button>
              <div className="w-px h-4 bg-surface-border mx-1" />
              <button
                onClick={() => updateSetting('preparasp_enabled', !settings.preparasp_enabled)}
                disabled={updating}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  !settings.preparasp_enabled
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    : "bg-emerald-500/10 text-emerald-400"
                }`}
              >
                <GraduationCap size={14} />
                Prepara SP: {settings.preparasp_enabled ? "ON" : "OFF"}
              </button>
            </div>
          )}
          
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface hover:bg-surface-hover border border-surface-border text-sm font-semibold transition-all hover:border-primary/50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
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
