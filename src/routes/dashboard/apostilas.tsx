import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, BookOpen } from "lucide-react";

export const Route = createFileRoute("/dashboard/apostilas")({
  component: ApostilasPage,
  head: () => ({ meta: [{ title: "Apostilas - SYNC LABS HUB" }] }),
});

function ApostilasPage() {
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-sm bg-blood-muted border border-primary/20 flex items-center justify-center">
          <BookOpen size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-medium text-white tracking-tight">Apostilas</h1>
          <p className="text-xs text-muted-foreground font-mono tracking-wider">
            Material didático digital — Currículo SP
          </p>
        </div>
      </div>

      <div className="bg-card border border-glass-border rounded-sm p-8 text-center space-y-5 max-w-lg mx-auto mt-8">
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <BookOpen size={28} className="text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-medium text-white">Acesse as apostilas</h2>
          <p className="text-sm text-muted-foreground font-mono leading-relaxed">
            O conteúdo de apostilas foi movido para uma plataforma dedicada com experiência aprimorada.
          </p>
        </div>
        <a
          href="https://syncapostila.lovable.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary/30 rounded-sm text-sm font-mono text-primary hover:bg-primary/20 hover:border-primary/50 transition-all"
        >
          <ExternalLink size={14} />
          Ir para SYNC Apostila
        </a>
      </div>
    </div>
  );
}
