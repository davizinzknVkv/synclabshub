import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, Clock } from "lucide-react";

export const Route = createFileRoute("/dashboard/preparasp")({
  component: PreparaSpPage,
  head: () => ({ meta: [{ title: "Prepara SP - SYNC LABS HUB" }] }),
});

function PreparaSpPage() {
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-sm bg-blood-muted border border-primary/20 flex items-center justify-center">
          <GraduationCap size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-medium text-white tracking-tight">Prepara SP</h1>
          <p className="text-xs text-muted-foreground font-mono tracking-wider">
            Preparatório oficial — SEDUC SP
          </p>
        </div>
      </div>

      <div className="bg-card border border-glass-border rounded-sm p-8 text-center space-y-5 max-w-lg mx-auto mt-8">
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <Clock size={28} className="text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-medium text-white">Em breve</h2>
          <p className="text-sm text-muted-foreground font-mono leading-relaxed">
            A automação do Prepara SP está em desenvolvimento. Em breve disponível aqui no hub.
          </p>
        </div>
      </div>
    </div>
  );
}
