import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CheckSquare, Filter, Loader2, ChevronRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { fetchTasksWithToken, sendTasksToCatalyst } from "@/lib/api";
import type { TaskItem } from "@/lib/api";
import { NotificationContainer, notify } from "@/components/Notification";
import { TaskModal } from "@/components/TaskModal";

export const Route = createFileRoute("/dashboard/tarefas")({
  component: TarefasPage,
  head: () => ({
    meta: [{ title: "Tarefa SP - FLUX HUB" }],
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
    setModalTasks(tasks);
    setModalOpen(true);
  };

  const handleOpenSingle = (task: TaskItem) => {
    setModalTasks([task]);
    setModalOpen(true);
  };

  const autoFetched = useRef(false);
  useEffect(() => {
    if (!session || autoFetched.current) return;
    autoFetched.current = true;
    fetchTasks("pending");
  }, [session, fetchTasks]);

  const handleSubmit = useCallback(async (selectedTasks: TaskItem[], isDraft: boolean, minTime: number, maxTime: number, captchaToken: string) => {
    setModalOpen(false);
    if (!session) return;
    await sendTasksToCatalyst(selectedTasks, isDraft, minTime, maxTime, session.ra, notify, captchaToken, targets, session.nick);
  }, [session, targets]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 min-h-screen bg-aurora">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em]">
        <span className="opacity-50">Home</span>
        <span className="opacity-30">/</span>
        <span className="text-primary font-bold">Tarefa SP</span>
      </nav>

      {/* Title */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-primary p-0.5 shadow-glow-violet">
          <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
            <CheckSquare size={24} className="text-primary" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Tarefa SP</h1>
          <p className="text-xs text-muted-foreground font-mono tracking-widest uppercase opacity-80">Currículo Paulista • Lições do CMSP</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 glass rounded-2xl border-surface-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTasks("pending")}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
              taskFilter === "pending" && fetched
                ? "border-primary bg-primary/20 text-primary shadow-glow-violet"
                : "border-surface-border bg-surface text-muted-foreground hover:text-white"
            }`}
          >
            {loading && taskFilter === "pending" ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Sincronizando...
              </span>
            ) : (
              "Pendentes"
            )}
          </button>
          <button
            onClick={() => fetchTasks("expired")}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
              taskFilter === "expired" && fetched
                ? "border-primary bg-primary/20 text-primary shadow-glow-violet"
                : "border-surface-border bg-surface text-muted-foreground hover:text-white"
            }`}
          >
            {loading && taskFilter === "expired" ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Sincronizando...
              </span>
            ) : (
              "Expiradas"
            )}
          </button>
        </div>

        {tasks.length > 0 && (
          <button
            onClick={handleSelectAndProcess}
            className="ml-auto btn-premium px-6 py-2.5 text-xs flex items-center gap-2"
          >
            <Filter size={14} />
            Processar ({tasks.length})
          </button>
        )}
      </div>

      {/* Task cards grid */}
      {!fetched ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4 glass rounded-3xl border-dashed border-surface-border/30">
          <div className="w-16 h-16 rounded-full bg-surface border border-surface-border flex items-center justify-center text-muted-foreground/30">
            <CheckSquare size={32} />
          </div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Selecione uma categoria acima</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4 glass rounded-3xl border-dashed border-surface-border/30">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500/50">
            <CheckSquare size={32} />
          </div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-emerald-500">Tudo em dia!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              onClick={() => handleOpenSingle(task)}
              className="card-premium group cursor-pointer"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary/70 truncate">
                      {task.room || "DISCIPLINA NÃO INFORMADA"}
                    </p>
                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-gradient transition-all duration-300">
                      {task.title}
                    </h3>
                  </div>
                  <span className="shrink-0 px-2 py-1 rounded-lg bg-surface border border-surface-border text-[9px] font-black uppercase tracking-wider text-muted-foreground group-hover:border-primary/50 group-hover:text-primary transition-all">
                    A FAZER
                  </span>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                    <span>Progresso</span>
                    <span>Pendente</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden border border-surface-border">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.random() * 40 + 10}%` }}
                      className="h-full bg-gradient-primary rounded-full shadow-glow-violet"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-surface/50 border-t border-surface-border flex items-center justify-between group-hover:bg-primary/5 transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">Ver detalhes</span>
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <TaskModal open={modalOpen} tasks={modalTasks} onClose={() => setModalOpen(false)} onSubmit={handleSubmit} />
      <NotificationContainer />
    </div>
  );
}
