import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { BookOpen, Download, Search, FileText } from "lucide-react";
import { CATEGORIAS } from "@/lib/apostilas";

export const Route = createFileRoute("/dashboard/apostilas")({
  component: ApostilasPage,
  head: () => ({ meta: [{ title: "Apostilas - SYNC LABS HUB" }] }),
});

function ApostilasPage() {
  const [activeCat, setActiveCat] = useState(CATEGORIAS[0].id);
  const [query, setQuery] = useState("");

  const cat = CATEGORIAS.find((c) => c.id === activeCat)!;

  const filteredSeries = useMemo(() => {
    if (!query.trim()) return cat.series;
    const q = query.toLowerCase();
    return cat.series
      .map((s) => ({
        ...s,
        volumes: s.volumes
          .map((v) => ({ ...v, items: v.items.filter((i) => i.title.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) }))
          .filter((v) => v.items.length > 0),
      }))
      .filter((s) => s.volumes.length > 0);
  }, [cat, query]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-sm bg-blood-muted border border-primary/20 flex items-center justify-center">
          <BookOpen size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-medium text-white tracking-tight">Apostilas</h1>
          <p className="text-xs text-muted-foreground font-mono tracking-wider">
            Material didático digital — Currículo SP
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar apostila..."
          className="w-full pl-9 pr-3 py-2.5 bg-card border border-glass-border rounded-sm text-sm text-white placeholder:text-muted-foreground font-mono focus:outline-none focus:border-primary/40"
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIAS.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCat(c.id)}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border transition-all ${
              activeCat === c.id
                ? "bg-primary/10 border-primary/40 text-primary"
                : "bg-card border-glass-border text-muted-foreground hover:border-primary/20 hover:text-white"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground font-mono">{cat.description}</p>

      {/* Series */}
      <div className="space-y-6">
        {filteredSeries.length === 0 && (
          <p className="text-sm text-muted-foreground font-mono text-center py-8">Nenhuma apostila encontrada.</p>
        )}
        {filteredSeries.map((serie) => (
          <div key={serie.name} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-0.5 h-4 bg-primary rounded-full" />
              <h2 className="text-xs font-bold text-white uppercase tracking-[0.15em] font-mono">{serie.name}</h2>
            </div>
            {serie.volumes.map((vol) => (
              <div key={vol.label} className="space-y-2">
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider pl-3">{vol.label}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {vol.items.map((item) => (
                    <a
                      key={item.url}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 bg-card border border-glass-border rounded-sm hover:border-primary/30 hover:bg-blood-muted transition-all group"
                    >
                      <FileText size={16} className="text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-medium text-white group-hover:text-primary transition-colors line-clamp-2">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-1 flex items-center gap-1">
                          <Download size={10} /> PDF
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground font-mono text-center pt-4 border-t border-glass-border">
        Fonte: apostilas.nejizzuki.xyz · OpenFuture
      </p>
    </div>
  );
}
