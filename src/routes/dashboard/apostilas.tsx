import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, BookOpen } from "lucide-react";

export const Route = createFileRoute("/dashboard/apostilas")({
  component: ApostilasPage,
  head: () => ({ meta: [{ title: "Apostilas - FLUX HUB" }] }),
});

function ApostilasPage() {
  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-12 bg-aurora min-h-screen">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-primary p-0.5 shadow-glow-violet">
          <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
            <BookOpen size={24} className="text-primary" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Apostilas</h1>
          <p className="text-xs text-muted-foreground font-mono tracking-widest uppercase opacity-80">
            Material didático digital — Currículo SP
          </p>
        </div>
      </div>

      <div className="glass-strong rounded-3xl p-12 text-center space-y-8 max-w-2xl mx-auto mt-12 border-surface-border/50 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="w-20 h-20 rounded-2xl bg-surface border border-surface-border flex items-center justify-center mx-auto shadow-glow-violet/20 group-hover:shadow-glow-violet/40 transition-all duration-500">
          <BookOpen size={36} className="text-primary" />
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Migração Concluída</h2>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-md mx-auto">
            Expandimos nosso ecossistema. O conteúdo de apostilas agora vive em uma plataforma dedicada, otimizada para leitura e downloads rápidos.
          </p>
        </div>
        <a
          href="https://syncapostila.lovable.app"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-premium inline-flex items-center gap-3 px-8 py-4 text-sm"
        >
          <ExternalLink size={18} />
          ACESSAR FLUX APOSTILA
        </a>
      </div>
    </div>
  );
}
