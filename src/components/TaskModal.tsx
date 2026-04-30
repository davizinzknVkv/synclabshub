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
          className="fixed inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-card-foreground">Selecionar Lições</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl font-bold">×</button>
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
