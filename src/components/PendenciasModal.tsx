import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, PenTool, Network, ArrowRight, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  counts?: { tarefas?: number; redacoes?: number; avaliacoes?: number };
}

const ITEMS = [
  { key: "tarefas", title: "Tarefas", icon: CheckSquare, url: "/dashboard/tarefas", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { key: "redacoes", title: "Redações", icon: PenTool, url: "/dashboard/redacao", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  { key: "avaliacoes", title: "Avaliações", icon: Network, url: "/dashboard/preparasp", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
] as const;

export function PendenciasModal({ open, onClose, counts }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm glass-strong rounded-2xl border border-white/10 p-5 space-y-4 relative"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Suas <span className="text-gradient">Pendências</span>
              </h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              {ITEMS.map((item) => {
                const count = counts?.[item.key] ?? 0;
                return (
                  <Link
                    key={item.key}
                    to={item.url}
                    onClick={onClose}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-primary/30 transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${item.bg}`}>
                      <item.icon size={18} className={item.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{item.title}</span>
                        {count > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive text-white tabular-nums min-w-[18px] text-center">
                            {count}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Ver pendências</p>
                    </div>
                    <ArrowRight size={15} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </Link>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-destructive border border-destructive/40 hover:bg-destructive/10 transition-all"
            >
              Fechar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
