import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BookOpen, Play, CheckCircle, XCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { fetchReadings, completeAllReadings, completeReading } from "@/lib/leiasp";
import type { ReadingItem } from "@/lib/leiasp";
import { NotificationContainer, notify } from "@/components/Notification";

export const Route = createFileRoute("/dashboard/leiasp")({
  component: LeiaSPPage,
  head: () => ({
    meta: [{ title: "Leia SP - SYNC LABS HUB" }],
  }),
});

function LeiaSPPage() {
  const session = getSession();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [readings, setReadings] = useState<ReadingItem[]>([]);
  const [fetched, setFetched] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [failed, setFailed] = useState<Set<number>>(new Set());

  const handleFetch = useCallback(async () => {
    if (!session || loading) return;
    setLoading(true);
    setCompleted(new Set());
    setFailed(new Set());
    try {
      const result = await fetchReadings(session.authToken, notify, session.nick);
      setReadings(result.readings);
      setSelected(new Set(result.readings.map(r => r.id)));
      setFetched(true);
      notify(`${result.readings.length} LEITURAS ENCONTRADAS`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "ERRO AO BUSCAR LEITURAS");
    } finally {
      setLoading(false);
    }
  }, [session, loading]);

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === readings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(readings.map(r => r.id)));
    }
  };

  const handleCompleteAll = useCallback(async () => {
    if (!session || processing) return;
    const selectedReadings = readings.filter(r => selected.has(r.id));
    if (selectedReadings.length === 0) {
      notify("SELECIONE AO MENOS UMA LEITURA");
      return;
    }

    setProcessing(true);
    notify(`PROCESSANDO ${selectedReadings.length} LEITURAS...`);

    for (const reading of selectedReadings) {
      const ok = await completeReading(reading, session.authToken, notify);
      if (ok) {
        setCompleted(prev => new Set(prev).add(reading.id));
      } else {
        setFailed(prev => new Set(prev).add(reading.id));
      }
      await new Promise(r => setTimeout(r, 500));
    }

    setProcessing(false);
  }, [session, processing, readings, selected]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
        Home / <span className="text-foreground">Leia SP</span>
      </p>

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blood-muted border border-primary/20 rounded-sm flex items-center justify-center">
          <BookOpen size={16} className="text-primary" />
        </div>
        <h1 className="text-sm font-bold text-white font-mono uppercase tracking-[0.15em]">Leia SP</h1>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleFetch}
          disabled={loading || processing}
          className="px-3 py-2 rounded-sm text-[10px] font-mono font-medium uppercase tracking-wider border border-primary bg-blood-muted text-primary hover:bg-primary/15 transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Buscando...
            </span>
          ) : (
            "Buscar Leituras"
          )}
        </button>

        {readings.length > 0 && (
          <>
            <button
              onClick={selectAll}
              className="px-3 py-2 rounded-sm text-[10px] font-mono font-medium uppercase tracking-wider border border-glass-border bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              {selected.size === readings.length ? "Desmarcar Todos" : "Selecionar Todos"}
            </button>
            <button
              onClick={handleCompleteAll}
              disabled={processing || selected.size === 0}
              className="ml-auto px-3 py-2 rounded-sm text-[10px] font-mono font-semibold uppercase tracking-wider border border-primary bg-primary/20 text-primary hover:bg-primary/30 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Processando...
                </span>
              ) : (
                <>
                  <Play size={12} />
                  Completar ({selected.size})
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Reading cards */}
      {!fetched ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-xs font-mono uppercase tracking-widest">Clique em "Buscar Leituras" para começar</p>
        </div>
      ) : readings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-xs font-mono uppercase tracking-widest">Nenhuma leitura encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {readings.map((reading, i) => {
            const isCompleted = completed.has(reading.id);
            const isFailed = failed.has(reading.id);
            const isSelected = selected.has(reading.id);

            return (
              <motion.div
                key={reading.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => !processing && toggleSelect(reading.id)}
                className={`bg-card border rounded-sm p-4 flex flex-col gap-2 cursor-pointer transition-colors ${
                  isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : isFailed
                    ? "border-red-500/30 bg-red-500/5"
                    : isSelected
                    ? "border-primary/30 bg-blood-muted"
                    : "border-glass-border hover:border-primary/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground truncate font-mono">
                    {reading.room || "—"}
                  </p>
                  {isCompleted ? (
                    <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                  ) : isFailed ? (
                    <XCircle size={14} className="text-red-400 shrink-0" />
                  ) : (
                    <span
                      className={`w-3.5 h-3.5 rounded-sm border shrink-0 transition-colors ${
                        isSelected ? "border-primary bg-primary/30" : "border-glass-border"
                      }`}
                    />
                  )}
                </div>
                <h3 className="text-xs font-medium text-white line-clamp-2 leading-snug">
                  {reading.title}
                </h3>
                {isCompleted && (
                  <p className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider">Concluída</p>
                )}
                {isFailed && (
                  <p className="text-[9px] font-mono text-red-400 uppercase tracking-wider">Falhou</p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <NotificationContainer />
    </div>
  );
}
