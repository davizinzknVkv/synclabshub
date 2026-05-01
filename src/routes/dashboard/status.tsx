import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Activity, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/status")({
  component: StatusDashboard,
  head: () => ({
    meta: [{ title: "Status - SYNC LABS HUB" }],
  }),
});

interface StatusLog {
  id: string;
  ra: string;
  task_count: number;
  task_type: string;
  status: string;
  message: string | null;
  created_at: string;
}

function StatusDashboard() {
  const [logs, setLogs] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(true);

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
    fetchLogs();
  }, []);

  const successCount = logs.filter((l) => l.status === "success").length;
  const errorCount = logs.filter((l) => l.status === "error").length;
  const totalTasks = logs.reduce((sum, l) => sum + l.task_count, 0);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Status das Tarefas</h1>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-green-400 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Sucesso</span>
          </div>
          <p className="text-2xl font-bold">{successCount}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <XCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Erro</span>
          </div>
          <p className="text-2xl font-bold">{errorCount}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Total Tarefas</span>
          </div>
          <p className="text-2xl font-bold">{totalTasks}</p>
        </div>
      </div>

      {/* Logs table */}
      <div className="bg-muted/30 rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-3 font-medium">RA</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-center p-3 font-medium">Qtd</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Mensagem</th>
                <th className="text-left p-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="p-3 font-mono text-xs">{log.ra}</td>
                    <td className="p-3">{log.task_type}</td>
                    <td className="p-3 text-center">{log.task_count}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.status === "success"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs max-w-[200px] truncate">
                      {log.message || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
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
