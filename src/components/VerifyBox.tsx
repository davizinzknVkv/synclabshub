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
      className={`flex items-center gap-3 px-5 py-3 rounded-lg border-2 font-semibold text-lg cursor-pointer select-none transition-colors mx-auto ${
        state === "verified"
          ? "bg-primary border-primary text-primary-foreground"
          : "bg-card border-border text-card-foreground hover:border-muted-foreground"
      }`}
    >
      <div
        className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center text-xs transition-all ${
          state === "verified"
            ? "bg-primary-foreground border-primary-foreground text-primary font-bold"
            : "border-muted-foreground text-transparent"
        }`}
      >
        {state === "loading" ? (
          <div className="w-4 h-4 border-2 border-muted-foreground border-t-primary rounded-full animate-spin" />
        ) : (
          "✔"
        )}
      </div>
      <span>{state === "verified" ? "Verificado ✅" : state === "loading" ? "" : "SOU HUMANO"}</span>
    </motion.button>
  );
}
