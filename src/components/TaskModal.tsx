import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TASK_ALTCHA_CHALLENGE_URL, verifyTaskAltcha, type TaskItem } from "@/lib/api";

declare global {
  interface Window {
    __altchaLoaded?: boolean;
  }
  namespace JSX {
    interface IntrinsicElements {
      "altcha-widget": {
        challengeurl?: string;
        auto?: string;
        hidefooter?: string;
        hidelogo?: string;
        language?: string;
      };
    }
  }
}

interface TaskModalProps {
  open: boolean;
  tasks: TaskItem[];
  onClose: () => void;
  onSubmit: (tasks: TaskItem[], isDraft: boolean, minTime: number, maxTime: number, captchaToken: string) => void;
}

function loadAltchaScript() {
  if (typeof window === "undefined" || window.__altchaLoaded) return;
  window.__altchaLoaded = true;
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js";
  script.async = true;
  script.defer = true;
  script.type = "module";
  document.head.appendChild(script);
}

export function TaskModal({ open, tasks, onClose, onSubmit }: TaskModalProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [scores, setScores] = useState<Record<number, number>>({});
  const [minTime, setMinTime] = useState(1800);
  const [maxTime, setMaxTime] = useState(1800);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaStatus, setCaptchaStatus] = useState("Resolva a verificação para executar");
  const altchaRef = useRef<HTMLDivElement | null>(null);

  const allSelected = useMemo(() => tasks.length > 0 && selected.size === tasks.length, [tasks, selected]);

  useEffect(() => {
    if (!open) {
      setCaptchaToken("");
      setCaptchaStatus("Resolva a verificação para executar");
      return;
    }
    loadAltchaScript();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = altchaRef.current;
    if (!node) return;

    const handleStateChange = async (event: Event) => {
      const detail = (event as CustomEvent).detail as { state?: string; payload?: string } | undefined;
      if (detail?.state !== "verified" || !detail.payload) {
        setCaptchaToken("");
        return;
      }

      try {
        setCaptchaStatus("Validando verificação...");
        const token = await verifyTaskAltcha(detail.payload);
        setCaptchaToken(token);
        setCaptchaStatus("Verificação concluída");
      } catch (error) {
        setCaptchaToken("");
        setCaptchaStatus(error instanceof Error ? error.message : "Falha na verificação");
      }
    };

    node.addEventListener("statechange", handleStateChange);
    return () => node.removeEventListener("statechange", handleStateChange);
  }, [open]);

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
    if (!captchaToken) return;
    onSubmit(tasks.map(t => ({ ...t, score: scores[t.id] ?? 100 })), draft, minTime, maxTime, captchaToken);
  };

  const handleSelectedTasks = (draft: boolean) => {
    const sel = getSelectedTasks();
    if (sel.length === 0 || !captchaToken) return;
    onSubmit(sel, draft, minTime, maxTime, captchaToken);
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

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <label className="flex items-center gap-4 glass p-4 rounded-2xl border-surface-border cursor-pointer hover:bg-surface/50 transition-all">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-5 h-5 accent-primary rounded-lg border-surface-border bg-surface" />
                <span className="font-black text-[11px] uppercase tracking-[0.2em] text-white">Selecionar Lote Completo</span>
              </label>

              <div className="glass rounded-2xl border border-surface-border/50 overflow-hidden">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => toggleOne(task.id)}
                    className="flex items-center gap-4 p-4 border-b border-surface-border/30 last:border-b-0 hover:bg-primary/5 cursor-pointer transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(task.id)}
                      onChange={() => toggleOne(task.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-5 h-5 accent-primary rounded-lg border-surface-border bg-surface"
                    />
                    <span className="flex-1 text-xs font-medium text-muted-foreground group-hover:text-white transition-colors">{task.title}</span>
                    <select
                      value={scores[task.id] ?? 100}
                      onChange={e => { e.stopPropagation(); setScores(p => ({ ...p, [task.id]: +e.target.value })); }}
                      onClick={e => e.stopPropagation()}
                      className="bg-surface border border-surface-border rounded-xl text-white text-[10px] font-bold p-2 outline-none focus:border-primary/50 transition-all"
                    >
                      {[100, 90, 80, 70, 60, 50].map(v => (
                        <option key={v} value={v}>{v}%</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Configuração de Tempo</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => { setMinTime(1800); setMaxTime(1800); }}
                    className={`flex flex-col items-start p-4 rounded-2xl border transition-all ${
                      minTime === 1800 && maxTime === 1800
                        ? "border-primary bg-primary/10 text-white"
                        : "border-surface-border bg-surface text-muted-foreground hover:text-white hover:border-surface-border/80"
                    }`}
                  >
                    <span className="text-[11px] font-bold">Opção 1: Seguro</span>
                    <span className="text-[9px] opacity-70">~30 min por página</span>
                  </button>
                  <button
                    onClick={() => { setMinTime(2700); setMaxTime(2700); }}
                    className={`flex flex-col items-start p-4 rounded-2xl border transition-all ${
                      minTime === 2700 && maxTime === 2700
                        ? "border-primary bg-primary/10 text-white"
                        : "border-surface-border bg-surface text-muted-foreground hover:text-white hover:border-surface-border/80"
                    }`}
                  >
                    <span className="text-[11px] font-bold">Opção 2: Recomendado</span>
                    <span className="text-[9px] opacity-70">~45 min por página</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mínimo (s)</label>
                  <input
                    type="number"
                    value={minTime}
                    onChange={(e) => setMinTime(Math.max(1, Number(e.target.value) || 0))}
                    className="input-premium w-full text-center py-3 text-sm bg-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Máximo (s)</label>
                  <input
                    type="number"
                    value={maxTime}
                    onChange={(e) => setMaxTime(Math.max(1, Number(e.target.value) || 0))}
                    className="input-premium w-full text-center py-3 text-sm bg-transparent"
                  />
                </div>
              </div>

              <div className="space-y-3 glass p-4 rounded-2xl border-surface-border">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Verificação</label>
                <div ref={altchaRef} className="flex justify-center min-h-12">
                  {open &&
                    createElement("altcha-widget", {
                      challengeurl: TASK_ALTCHA_CHALLENGE_URL,
                      auto: "onfocus",
                      hidefooter: "true",
                      hidelogo: "true",
                      language: "pt-BR",
                    })}
                </div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground text-center">{captchaStatus}</p>
              </div>

              <div className="grid gap-3 pt-4">
                <button 
                  onClick={() => handleSelectedTasks(false)} 
                  disabled={!captchaToken}
                  className="btn-premium w-full py-4 text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
                >
                  EXECUTAR SELECIONADAS
                </button>
                <button 
                  onClick={() => handleSelectedTasks(true)} 
                  disabled={!captchaToken}
                  className="w-full py-4 glass hover:bg-surface rounded-2xl border-surface-border font-black text-[10px] uppercase tracking-widest text-white transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  SALVAR COMO RASCUNHO
                </button>
                <button 
                  onClick={() => handleAllTasks(false)} 
                  disabled={!captchaToken}
                  className="w-full py-4 bg-surface/50 hover:bg-surface rounded-2xl border border-surface-border font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-white transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  EXECUTAR TUDO ({tasks.length})
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
