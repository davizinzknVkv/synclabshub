import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TaskItem } from "@/lib/api";

interface TaskModalProps {
  open: boolean;
  tasks: TaskItem[];
  onClose: () => void;
  onSubmit: (tasks: TaskItem[], isDraft: boolean, minTime: number, maxTime: number) => void;
}

export function TaskModal({ open, tasks, onClose, onSubmit }: TaskModalProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [scores, setScores] = useState<Record<number, number>>({});
  const [minTime, setMinTime] = useState(1);
  const [maxTime, setMaxTime] = useState(2);

  const allSelected = useMemo(() => tasks.length > 0 && selected.size === tasks.length, [tasks, selected]);

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(tasks.map(t => t.id)));
  };

  const toggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getSelectedTasks = (): TaskItem[] =>
    tasks.filter(t => selected.has(t.id)).map(t => ({ ...t, score: scores[t.id] ?? 100 }));

  const handleAllTasks = (draft: boolean) => {
    onSubmit(tasks.map(t => ({ ...t, score: scores[t.id] ?? 100 })), draft, minTime, maxTime);
  };

  const handleSelectedTasks = (draft: boolean) => {
    const sel = getSelectedTasks();
    if (sel.length === 0) return;
    onSubmit(sel, draft, minTime, maxTime);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="glass-strong rounded-3xl border border-surface-border shadow-elevated w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col relative"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-primary" />
            
            <div className="flex items-center justify-between p-6 border-b border-surface-border/50">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Configurar Execução</h2>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Sincronização via Catalyst API</p>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface border border-surface-border flex items-center justify-center text-muted-foreground hover:text-white transition-all">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <label className="flex items-center gap-3 bg-surface p-3 rounded-lg border border-surface-border cursor-pointer">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-primary" />
                <span className="font-medium text-foreground">Selecionar Todas</span>
              </label>

              <div className="bg-surface rounded-lg border border-surface-border overflow-hidden">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => toggleOne(task.id)}
                    className="flex items-center gap-3 p-3 border-b border-border last:border-b-0 hover:bg-surface-hover cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(task.id)}
                      onChange={() => toggleOne(task.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="flex-1 text-sm text-foreground">{task.title}</span>
                    <select
                      value={scores[task.id] ?? 100}
                      onChange={e => { e.stopPropagation(); setScores(p => ({ ...p, [task.id]: +e.target.value })); }}
                      onClick={e => e.stopPropagation()}
                      className="bg-surface border border-border rounded-md text-foreground text-xs p-1.5 min-w-16"
                    >
                      {[100, 90, 80, 70, 60, 50].map(v => (
                        <option key={v} value={v}>{v}%</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Tempo Mínimo (min)</label>
                  <input
                    type="number" value={minTime} min={0} max={60}
                    onChange={e => setMinTime(+e.target.value)}
                    className="w-16 bg-transparent border border-border rounded-md text-foreground text-center p-1.5 text-sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Tempo Máximo (min)</label>
                  <input
                    type="number" value={maxTime} min={1} max={60}
                    onChange={e => setMaxTime(+e.target.value)}
                    className="w-16 bg-transparent border border-border rounded-md text-foreground text-center p-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <button onClick={() => handleSelectedTasks(false)} className="w-full py-3 bg-surface hover:bg-surface-hover border border-border rounded-lg font-semibold text-sm text-foreground transition-colors">
                  Fazer Lições Selecionadas
                </button>
                <button onClick={() => handleSelectedTasks(true)} className="w-full py-3 bg-surface hover:bg-surface-hover border border-border rounded-lg font-semibold text-sm text-foreground transition-colors">
                  Fazer Selecionadas como Rascunho
                </button>
                <button onClick={() => handleAllTasks(false)} className="w-full py-3 bg-surface hover:bg-surface-hover border border-border rounded-lg font-semibold text-sm text-foreground transition-colors">
                  Fazer Todas as Lições
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
