import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertCircle, Search, Calendar, User, ArrowRight, CheckCircle2, 
  ExternalLink, Edit2, ChevronDown, ChevronUp, History, 
  RefreshCcw, Loader2, ArrowUpDown
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { NotificationContainer, notify } from "@/components/Notification";

interface TaskAssignee {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface ReworkTask {
  id: string;
  title: string;
  description: string;
  assignee: TaskAssignee;
  dueDate: string;
  currentStatus: "rework_required" | "pending_review";
  originalStatus: string;
  reasonForRework?: string;
  priority: "low" | "medium" | "high";
}

export const Route = createFileRoute("/dashboard/rework")({
  component: ReworkPage,
  head: () => ({
    meta: [{ title: "Retrabalhos - SYNC LABS HUB" }],
  }),
});

// Componente individual de tarefa
const TaskItemCard = memo(({ 
  task, 
  onComplete, 
  onViewDetails, 
  onEdit 
}: { 
  task: ReworkTask; 
  onComplete: (id: string) => void;
  onViewDetails: (id: string) => void;
  onEdit: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  const priorityColors = {
    low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    high: "bg-red-500/10 text-red-500 border-red-500/20"
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="card-brutal bg-surface p-0 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex justify-between items-start gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 
              onClick={() => onViewDetails(task.id)}
              className="text-sm font-bold text-white uppercase tracking-tight hover:text-primary cursor-pointer truncate"
            >
              {task.title}
            </h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`px-2 py-0.5 rounded-none text-[9px] font-black uppercase border-2 ${priorityColors[task.priority]}`}>
                PRIORIDADE {task.priority}
              </span>
              <span className="px-2 py-0.5 rounded-none text-[9px] font-black uppercase bg-accent/10 text-accent border-2 border-accent/20">
                {task.currentStatus.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {task.assignee.avatarUrl ? (
              <img src={task.assignee.avatarUrl} alt={task.assignee.name} className="w-8 h-8 rounded-none border-2 border-foreground" />
            ) : (
              <div className="w-8 h-8 bg-muted/20 border-2 border-foreground flex items-center justify-center">
                <User size={14} className="text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed italic">
          "{task.description}"
        </p>

        <div className="flex items-center justify-between text-[10px] font-mono font-bold text-muted-foreground border-t-2 border-border/50 pt-4">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-primary" />
            {formatDate(task.dueDate)}
          </div>
          <div className="flex items-center gap-1.5">
            <User size={12} className="text-primary" />
            {task.assignee.name.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="bg-muted/10 p-2 flex gap-2 border-t-2 border-border">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex-1 px-3 py-2 bg-surface border-2 border-foreground text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          MOTIVO
        </button>
        <button 
          onClick={() => onEdit(task.id)}
          className="px-3 py-2 bg-surface border-2 border-foreground hover:text-primary transition-colors"
          title="Editar"
        >
          <Edit2 size={14} />
        </button>
        <button 
          onClick={() => onViewDetails(task.id)}
          className="px-3 py-2 bg-surface border-2 border-foreground hover:text-primary transition-colors"
          title="Visualizar"
        >
          <ExternalLink size={14} />
        </button>
        <button 
          onClick={() => onComplete(task.id)}
          className="px-3 py-2 bg-primary text-primary-foreground border-2 border-foreground font-black uppercase text-[10px] flex items-center gap-2 hover:translate-x-[-2px] hover:translate-y-[-2px] shadow-[2px_2px_0_0_var(--foreground)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
        >
          <CheckCircle2 size={14} />
          CONCLUIR
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden bg-primary/5"
          >
            <div className="p-4 text-[11px] font-mono leading-relaxed border-t-2 border-border">
              <div className="flex items-center gap-2 text-primary mb-2 font-black italic">
                <AlertCircle size={14} />
                REGISTRO DE RETRABALHO
              </div>
              <p className="text-foreground/80">
                {task.reasonForRework || "Nenhum motivo específico detalhado pelo revisor."}
              </p>
              <div className="mt-3 text-muted-foreground/60 flex items-center gap-2 uppercase tracking-tighter">
                <History size={12} />
                Status anterior: {task.originalStatus}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

function ReworkPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ReworkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "assignee">("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Simulação de carregamento dinâmico
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError(null);
      try {
        // Simulando delay de rede
        await new Promise(r => setTimeout(r, 1200));
        
        // Dados mockados conforme contrato sugerido
        const mockData: ReworkTask[] = [
          {
            id: "1",
            title: "Revisão de Arquitetura Backend",
            description: "Ajustar os endpoints de autenticação para suportar OAuth 2.0 nativo conforme especificações do time de infra.",
            assignee: { id: "u1", name: "Gabriel Silva", avatarUrl: "https://i.pravatar.cc/150?u=u1" },
            dueDate: "2026-06-01T10:00:00Z",
            currentStatus: "rework_required",
            originalStatus: "pending_review",
            reasonForRework: "O fluxo de refresh token não está persistindo os scopes originais corretamente. É necessário refatorar o interceptor.",
            priority: "high"
          },
          {
            id: "2",
            title: "Refatoração de CSS (Brutalist Style)",
            description: "Padronizar o uso de variáveis CSS para as sombras offset e as bordas grossas nos modais do sistema.",
            assignee: { id: "u2", name: "Ana Beatriz", avatarUrl: "https://i.pravatar.cc/150?u=u2" },
            dueDate: "2026-05-28T18:00:00Z",
            currentStatus: "rework_required",
            originalStatus: "draft",
            reasonForRework: "Algumas cores de background estão hardcoded. Use o sistema de OKLCH definido no global.css.",
            priority: "medium"
          },
          {
            id: "3",
            title: "Tradução de Termos Técnicos",
            description: "Garantir que todos os termos do dashboard estejam em português para o lançamento beta nacional.",
            assignee: { id: "u1", name: "Gabriel Silva" },
            dueDate: "2026-06-05T12:00:00Z",
            currentStatus: "pending_review",
            originalStatus: "rework_required",
            priority: "low"
          }
        ];
        
        setTasks(mockData);
      } catch (err) {
        setError("Não foi possível carregar a lista de tarefas. Verifique sua conexão ou tente novamente mais tarde.");
        notify("ERRO AO CARREGAR TAREFAS");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const handleComplete = useCallback(async (id: string) => {
    try {
      // Simulando chamada PATCH /api/tasks/:id
      notify("ATUALIZANDO STATUS...");
      await new Promise(r => setTimeout(r, 800));
      
      setTasks(prev => prev.filter(t => t.id !== id));
      notify("TAREFA CONCLUÍDA COM SUCESSO");
    } catch (err) {
      notify("ERRO AO ATUALIZAR TAREFA");
    }
  }, []);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks.filter(t => 
      t.title.toLowerCase().includes(search.toLowerCase()) || 
      t.assignee.name.toLowerCase().includes(search.toLowerCase())
    );

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "dueDate") {
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortBy === "priority") {
        const pMap = { low: 1, medium: 2, high: 3 };
        comparison = pMap[a.priority] - pMap[b.priority];
      } else if (sortBy === "assignee") {
        comparison = a.assignee.name.localeCompare(b.assignee.name);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [tasks, search, sortBy, sortOrder]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 relative min-h-[80vh]">
      <div className="fixed inset-0 bg-obsidian-grid pointer-events-none opacity-40" />
      <NotificationContainer />

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-accent flex items-center justify-center border-4 border-foreground shadow-[4px_4px_0_0_var(--foreground)] rotate-[3deg]">
            <RefreshCcw size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
              REWORK_HUB
            </h1>
            <p className="text-xs text-accent font-mono font-bold tracking-[0.2em] uppercase mt-1">
              {loading ? "FETCHING_DATA..." : `${filteredAndSortedTasks.length} TAREFAS PENDENTES`}
            </p>
          </div>
        </div>

        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text"
            placeholder="BUSCAR TAREFA OU NOME..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-obsidian w-full pl-12 pr-4 py-3 text-sm focus:ring-0 placeholder:text-muted-foreground/40"
          />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 relative z-10 bg-surface/50 p-2 border-2 border-border backdrop-blur-sm">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">ORDENAR POR:</span>
        {[
          { id: "dueDate", label: "DATA", icon: Calendar },
          { id: "priority", label: "PRIORIDADE", icon: AlertCircle },
          { id: "assignee", label: "RESPONSÁVEL", icon: User },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => toggleSort(btn.id as any)}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase flex items-center gap-2 transition-all border-2 ${
              sortBy === btn.id 
              ? "bg-primary/20 text-primary border-primary shadow-[2px_2px_0_0_var(--primary)]" 
              : "text-muted-foreground hover:text-white border-transparent"
            }`}
          >
            <btn.icon size={12} />
            {btn.label}
            {sortBy === btn.id && <ArrowUpDown size={10} className={sortOrder === "desc" ? "rotate-180" : ""} />}
          </button>
        ))}
      </div>

      <div className="relative z-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="card-brutal h-64 bg-surface animate-pulse border-dashed" />
            ))}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-primary" size={40} />
                <span className="text-xs font-mono font-bold uppercase tracking-widest">Sincronizando tarefas...</span>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="card-brutal bg-destructive/10 p-12 text-center border-destructive">
            <AlertCircle size={48} className="text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2 uppercase italic">ERRO NO CARREGAMENTO</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-destructive text-white font-black uppercase tracking-widest border-2 border-foreground shadow-[4px_4px_0_0_var(--foreground)]"
            >
              TENTAR NOVAMENTE
            </button>
          </div>
        ) : filteredAndSortedTasks.length === 0 ? (
          <div className="card-brutal bg-primary/5 p-16 text-center border-dashed border-primary/20">
            <CheckCircle2 size={48} className="text-primary/40 mx-auto mb-4" />
            <h2 className="text-xl font-black text-white mb-2 uppercase">MISSÃO CUMPRIDA</h2>
            <p className="text-sm text-muted-foreground font-mono tracking-tight uppercase">
              {search ? "Nenhuma tarefa corresponde à sua busca." : "Nenhuma tarefa de retrabalho encontrada no momento."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedTasks.map((task) => (
                <TaskItemCard 
                  key={task.id} 
                  task={task} 
                  onComplete={handleComplete}
                  onViewDetails={(id) => navigate({ to: `/dashboard` })} // Link simulado
                  onEdit={(id) => notify(`EDITAR TAREFA ${id} (SIMULADO)`)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {!loading && tasks.length > 0 && (
        <div className="relative z-10 flex items-center justify-between border-t-2 border-border pt-8">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">
            Page 1 of 1 • System Uptime: 99.9%
          </div>
          <div className="flex gap-2">
            <button disabled className="px-4 py-2 border-2 border-border text-[10px] font-black uppercase opacity-30 cursor-not-allowed">Anterior</button>
            <button disabled className="px-4 py-2 border-2 border-border text-[10px] font-black uppercase opacity-30 cursor-not-allowed">Próxima</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReworkPage;