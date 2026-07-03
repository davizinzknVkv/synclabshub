import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Heart, X, Sparkles, ExternalLink } from "lucide-react";

const STORAGE_KEY = "sync_welcome_seen_v1";
const DISCORD_URL = "https://discord.gg/y5tNWGVPSU";
const DONATE_URL = "https://livepix.gg/davizinzkn";

export function WelcomePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md glass-strong rounded-3xl border border-white/10 overflow-hidden"
          >
            {/* Aurora bg */}
            <div className="absolute inset-0 pointer-events-none opacity-50"
              style={{ background: "radial-gradient(60% 60% at 30% 20%, oklch(0.66 0.24 280 / 0.35), transparent), radial-gradient(50% 50% at 80% 80%, oklch(0.78 0.16 200 / 0.25), transparent)" }} />

            <button onClick={close} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
              <X size={15} />
            </button>

            <div className="relative p-6 sm:p-7 space-y-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-[10px] font-mono uppercase tracking-widest text-primary">
                  <Sparkles size={11} /> Bem-vindo
                </div>
                <h2 className="text-2xl font-black text-white tracking-tighter font-display leading-tight">
                  Apoie o <span className="text-gradient">Flux Hub</span>
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Entre no nosso servidor para novidades, suporte e ajude o projeto a continuar gratuito.
                </p>
              </div>

              <div className="space-y-2.5">
                <a
                  href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
                  onClick={close}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-[#5865F2]/15 border border-[#5865F2]/40 hover:bg-[#5865F2]/25 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#5865F2] flex items-center justify-center text-white">
                    <MessageCircle size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white">Entrar no Discord</div>
                    <div className="text-[11px] text-muted-foreground">Comunidade oficial Flux Hub</div>
                  </div>
                  <ExternalLink size={14} className="text-muted-foreground group-hover:text-white transition-colors" />
                </a>

                <a
                  href={DONATE_URL} target="_blank" rel="noopener noreferrer"
                  onClick={close}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-pink-500/15 border border-pink-500/40 hover:bg-pink-500/25 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-pink-500 flex items-center justify-center text-white">
                    <Heart size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white">Fazer uma doação</div>
                    <div className="text-[11px] text-muted-foreground">Mantenha os servidores no ar</div>
                  </div>
                  <ExternalLink size={14} className="text-muted-foreground group-hover:text-white transition-colors" />
                </a>
              </div>

              <button
                onClick={close}
                className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white border border-white/10 hover:border-white/20 transition-all"
              >
                Agora não
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
