import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CheckSquare, Filter } from "lucide-react";
import { getSession } from "@/lib/auth";
import { fetchTasksWithToken, sendTasksToCatalyst } from "@/lib/api";
import type { TaskItem } from "@/lib/api";
import { NotificationContainer, notify } from "@/components/Notification";
import { TaskModal } from "@/components/TaskModal";

export const Route = createFileRoute("/dashboard/tarefas")({
  component: TarefasPage,
  head: () => ({
    meta: [{ title: "Tarefa SP - SYNC LABS HUB" }],
  }),
});

function TarefasPage() {
  const session = getSession();
  const [taskFilter, setTaskFilter] = useState<"pending" | "expired">("pending");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTasks, setModalTasks] = useState<TaskItem[]>([]);
  const [fetched, setFetched] = useState(false);

  const fetchTasks = useCallback(async (filter: "pending" | "expired") => {
    if (!session || loading) return;
    setLoading(true);
    setTaskFilter(filter);
    try {
      const result = await fetchTasksWithToken(session.authToken, filter, notify, session.nick);
      const withToken = result.tasks.map((t: TaskItem) => ({ ...t, token: session.authToken }));
      setTasks(withToken);
      setTargets(result.targets);
      setFetched(true);
      notify(`${withToken.length} LIÇÕES ENCONTRADAS`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "ERRO AO BUSCAR LIÇÕES");
    } finally {
      setLoading(false);
    }
  }, [session, loading]);

  const handleSelectAndProcess = () => {
    if (tasks.length === 0) return;
    setModalOpen(true);
  };

  const handleSubmit = useCallback(async (selectedTasks: TaskItem[], isDraft: boolean, minTime: number, maxTime: number) => {
    setModalOpen(false);
    if (!session) return;
    await sendTasksToCatalyst(selectedTasks, isDraft, minTime, maxTime, session.ra, notify, targets, session.nick);
  }, [session, targets]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
        Home / <span className="text-foreground">Tarefa SP</span>
      </p>

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blood-muted border border-primary/20 rounded-sm flex items-center justify-center">
          <CheckSquare size={16} className="text-primary" />
        </div>
        <h1 className="text-sm font-bold text-white font-mono uppercase tracking-[0.15em]">Tarefa SP</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => fetchTasks("pending")}
          disabled={loading}
          className={`px-3 py-2 rounded-sm text-[10px] font-mono font-medium uppercase tracking-wider border transition-colors ${
            taskFilter === "pending" && fetched
              ? "border-primary bg-blood-muted text-primary"
              : "border-glass-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          {loading && taskFilter === "pending" ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Buscando...
            </span>
          ) : (
            "A Fazer"
          )}
        </button>
        <button
          onClick={() => fetchTasks("expired")}
          disabled={loading}
          className={`px-3 py-2 rounded-sm text-[10px] font-mono font-medium uppercase tracking-wider border transition-colors ${
            taskFilter === "expired" && fetched
              ? "border-primary bg-blood-muted text-primary"
              : "border-glass-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          {loading && taskFilter === "expired" ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Buscando...
            </span>
          ) : (
            "Expiradas"
          )}
        </button>

        {tasks.length > 0 && (
          <button
            onClick={handleSelectAndProcess}
            className="ml-auto px-3 py-2 rounded-sm text-[10px] font-mono font-semibold uppercase tracking-wider border border-primary bg-blood-muted text-primary hover:bg-primary/15 transition-colors flex items-center gap-2"
          >
            <Filter size={12} />
            Selecionar ({tasks.length})
          </button>
        )}
      </div>

      {/* Task cards grid */}
      {!fetched ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-xs font-mono uppercase tracking-widest">Clique em "A Fazer" ou "Expiradas" para buscar</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-xs font-mono uppercase tracking-widest">Nenhuma lição encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-card border border-glass-border rounded-sm p-4 flex flex-col gap-2 hover:border-primary/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground truncate font-mono">
                  {task.room || "—"}
                </p>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm bg-blood-muted text-primary whitespace-nowrap font-mono tracking-wider">
                  A Fazer
                </span>
              </div>
              <h3 className="text-xs font-medium text-white line-clamp-2 leading-snug">
                {task.title}
              </h3>
              <div className="mt-auto">
                <div className="w-full h-0.5 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/50"
                    style={{ width: `${Math.random() * 60 + 10}%` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <TaskModal open={modalOpen} tasks={tasks} onClose={() => setModalOpen(false)} onSubmit={handleSubmit} />
      <NotificationContainer />
    </div>
  );
}
