import { useState } from "react";
import { motion } from "framer-motion";

interface VerifyBoxProps {
  onVerified: () => void;
}

export function VerifyBox({ onVerified }: VerifyBoxProps) {
  const [state, setState] = useState<"idle" | "loading" | "verified">("idle");

  const handleClick = () => {
    if (state !== "idle") return;
    setState("loading");
    setTimeout(() => {
      setState("verified");
      onVerified();
    }, 2000);
  };

  return (
    <motion.button
      whileHover={{ scale: state === "idle" ? 1.02 : 1 }}
      whileTap={{ scale: state === "idle" ? 0.98 : 1 }}
      onClick={handleClick}
      className={`flex items-center gap-4 px-8 py-4 rounded-2xl border transition-all font-black text-xs uppercase tracking-[0.3em] shadow-lg select-none ${
        state === "verified"
          ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
          : "glass border-surface-border text-white hover:border-primary/50"
      }`}
    >
      <div
        className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center text-xs transition-all ${
          state === "verified"
            ? "bg-emerald-400 border-emerald-400 text-black font-bold"
            : "border-surface-border bg-surface"
        }`}
      >
        {state === "loading" ? (
          <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        ) : state === "verified" ? (
          "✓"
        ) : (
          null
        )}
      </div>
      <span>{state === "verified" ? "Identidade Confirmada" : state === "loading" ? "Processando..." : "SOU HUMANO"}</span>
    </motion.button>
  );
}
