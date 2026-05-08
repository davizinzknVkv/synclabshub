import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { BookOpen, Download, Search, FileText, X, ExternalLink, Sparkles } from "lucide-react";
import { CATEGORIAS } from "@/lib/apostilas";
import { detectUserSerie, serieMatches, type DetectedSerie } from "@/lib/userSerie";

export const Route = createFileRoute("/dashboard/apostilas")({
  component: ApostilasPage,
  head: () => ({ meta: [{ title: "Apostilas - SYNC LABS HUB" }] }),
});

function proxied(url: string) {
  return `/api/pdf-proxy?url=${encodeURIComponent(url)}`;
}

const PAGE_SIZE = 4;

function ApostilasPage() {
  const [activeCat, setActiveCat] = useState(CATEGORIAS[0].id);
  const [query, setQuery] = useState("");
  const [viewer, setViewer] = useState<{ title: string; url: string } | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [detected, setDetected] = useState<DetectedSerie | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = detectUserSerie();
    if (d) {
      setDetected(d);
      setOnlyMine(true);
    }
  }, []);

  const cat = CATEGORIAS.find((c) => c.id === activeCat)!;

  const filteredSeries = useMemo(() => {
    let series = cat.series;
    if (onlyMine && detected) {
      const mine = series.filter((s) => serieMatches(s.name, detected));
      if (mine.length > 0) series = mine;
    } else if (detected) {
      // Reordena: a série do aluno primeiro, mantendo o restante na ordem original
      series = [...series].sort((a, b) => {
        const am = serieMatches(a.name, detected) ? 0 : 1;
        const bm = serieMatches(b.name, detected) ? 0 : 1;
        return am - bm;
      });
    }
    if (!query.trim()) return series;
    const q = query.toLowerCase();
    return series
      .map((s) => ({
        ...s,
        volumes: s.volumes
          .map((v) => ({ ...v, items: v.items.filter((i) => i.title.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) }))
          .filter((v) => v.items.length > 0),
      }))
      .filter((s) => s.volumes.length > 0);
  }, [cat, query, detected, onlyMine]);

  // Reset paginação quando filtros mudam
  useEffect(() => { setVisible(PAGE_SIZE); }, [activeCat, query, onlyMine]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisible((v) => Math.min(v + PAGE_SIZE, filteredSeries.length));
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [filteredSeries.length]);

  const visibleSeries = filteredSeries.slice(0, visible);
  const hasMore = visible < filteredSeries.length;

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

      {detected && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-sm">
          <Sparkles size={14} className="text-primary shrink-0" />
          <p className="text-xs font-mono text-white flex-1 min-w-0 truncate">
            Detectamos sua série: <span className="text-primary font-bold">{detected.label}</span>
          </p>
          <button
            onClick={() => setOnlyMine((v) => !v)}
            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-sm border transition-all shrink-0 ${
              onlyMine
                ? "bg-primary/20 border-primary/40 text-primary"
                : "border-glass-border text-muted-foreground hover:text-white"
            }`}
          >
            {onlyMine ? "Só minha série" : "Todas"}
          </button>
        </div>
      )}

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

      <div className="space-y-6">
        {filteredSeries.length === 0 && (
          <p className="text-sm text-muted-foreground font-mono text-center py-8">Nenhuma apostila encontrada.</p>
        )}
        {visibleSeries.map((serie) => {
          const isMine = detected && serieMatches(serie.name, detected);
          return (
            <div key={serie.name} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`w-0.5 h-4 rounded-full ${isMine ? "bg-acid" : "bg-primary"}`} />
                <h2 className="text-xs font-bold text-white uppercase tracking-[0.15em] font-mono">{serie.name}</h2>
                {isMine && (
                  <span className="text-[9px] font-mono uppercase tracking-wider text-acid border border-acid/40 px-1.5 py-0.5 rounded-sm">
                    sua série
                  </span>
                )}
              </div>
              {serie.volumes.map((vol) => (
                <div key={vol.label} className="space-y-2">
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider pl-3">{vol.label}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {vol.items.map((item) => (
                      <button
                        key={item.url}
                        onClick={() => setViewer({ title: item.title, url: item.url })}
                        className="flex items-start gap-3 p-3 bg-card border border-glass-border rounded-sm hover:border-primary/30 hover:bg-blood-muted transition-all group text-left"
                      >
                        <FileText size={16} className="text-primary mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono font-medium text-white group-hover:text-primary transition-colors line-clamp-2">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-1 flex items-center gap-1">
                            <FileText size={10} /> Visualizar PDF
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {hasMore && (
          <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-6">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <button
              onClick={() => setVisible((v) => Math.min(v + PAGE_SIZE, filteredSeries.length))}
              className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary"
            >
              Carregar mais ({filteredSeries.length - visible} restantes)
            </button>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground font-mono text-center pt-4 border-t border-glass-border">
        Fontes: apostilas.cupiditys.lol · apostilas.nejizzuki.xyz
      </p>

      {viewer && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between gap-3 p-3 border-b border-glass-border bg-card">
            <p className="text-xs font-mono text-white truncate flex-1">{viewer.title}</p>
            <a
              href={proxied(viewer.url)}
              download
              className="p-2 rounded-sm border border-glass-border text-muted-foreground hover:text-primary hover:border-primary/30"
              title="Baixar"
            >
              <Download size={14} />
            </a>
            <a
              href={proxied(viewer.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-sm border border-glass-border text-muted-foreground hover:text-primary hover:border-primary/30"
              title="Abrir em nova aba"
            >
              <ExternalLink size={14} />
            </a>
            <button
              onClick={() => setViewer(null)}
              className="p-2 rounded-sm border border-glass-border text-muted-foreground hover:text-primary hover:border-primary/30"
              title="Fechar"
            >
              <X size={14} />
            </button>
          </div>
          <iframe
            src={proxied(viewer.url)}
            className="flex-1 w-full bg-white"
            title={viewer.title}
          />
        </div>
      )}
    </div>
  );
}
