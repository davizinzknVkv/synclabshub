import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchTasks = useCallback(async (filter: "pending" | "expired") => {
    if (!session || loading) return;
    setLoading(true);
    setTaskFilter(filter);
    try {
      const result = await fetchTasksWithToken(session.authToken, filter, notify);
      const withToken = result.map((t: TaskItem) => ({ ...t, token: session.authToken }));
      setTasks(withToken);
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
    await sendTasksToCatalyst(selectedTasks, isDraft, minTime, maxTime, session.ra, notify);
  }, [session]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <p className="text-sm text-muted-foreground">
        Home / <span className="text-foreground">Tarefa SP</span>
      </p>

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
          <CheckSquare size={20} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Tarefa SP</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => fetchTasks("pending")}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            taskFilter === "pending" && fetched
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          {loading && taskFilter === "pending" ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Buscando...
            </span>
          ) : (
            "A Fazer"
          )}
        </button>
        <button
          onClick={() => fetchTasks("expired")}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            taskFilter === "expired" && fetched
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          {loading && taskFilter === "expired" ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Buscando...
            </span>
          ) : (
            "Expiradas"
          )}
        </button>

        {tasks.length > 0 && (
          <button
            onClick={handleSelectAndProcess}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold border border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-2"
          >
            <Filter size={16} />
            Selecionar ({tasks.length})
          </button>
        )}
      </div>

      {/* Task cards grid */}
      {!fetched ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">Clique em "A Fazer" ou "Expiradas" para buscar suas lições</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">Nenhuma lição encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                  {task.room || "—"}
                </p>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 whitespace-nowrap">
                  A Fazer
                </span>
              </div>
              <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug">
                {task.title}
              </h3>
              {/* Progress bar */}
              <div className="mt-auto">
                <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500"
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
