import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenTool, Loader2, CheckCircle, FileText, Send, X, RefreshCw } from "lucide-react";
import { getSession } from "@/lib/auth";
import { fetchRedacoes, generateRedacao, submitRedacao } from "@/lib/redacao";
import type { RedacaoItem, GeneratedRedacao } from "@/lib/redacao";
import { NotificationContainer, notify } from "@/components/Notification";

export const Route = createFileRoute("/dashboard/redacao")({
  component: RedacaoPage,
  head: () => ({
    meta: [{ title: "Redação Paulista - FLUX HUB" }],
  }),
});

type SubmitMode = "submitted" | "draft";

function RedacaoPage() {
  const session = getSession();
  const [loading, setLoading] = useState(false);
  const [redacoes, setRedacoes] = useState<RedacaoItem[]>([]);
  const [fetched, setFetched] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processMsg, setProcessMsg] = useState("");

  // Preview state
  const [preview, setPreview] = useState<GeneratedRedacao | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [submitting, setSubmitting] = useState<false | SubmitMode>(false);

  const handleFetch = useCallback(async () => {
    if (!session || loading) return;
    setLoading(true);
    try {
      const result = await fetchRedacoes(session.authToken, notify, session.nick);
      setRedacoes(result);
      setFetched(true);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "ERRO AO BUSCAR REDAÇÕES");
    } finally {
      setLoading(false);
    }
  }, [session, loading]);

  const handleGenerate = useCallback(async () => {
    if (!session || !selectedId || processing) return;
    const redacao = redacoes.find((r) => r.id === selectedId);
    if (!redacao) return;

    setProcessing(true);
    setProcessMsg("Iniciando...");
    try {
      const result = await generateRedacao(redacao, session.authToken, (msg: string) => {
        setProcessMsg(msg);
        notify(msg);
      });
      setPreview(result);
      setEditTitle(result.title);
      setEditBody(result.body);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "ERRO AO GERAR REDAÇÃO");
    } finally {
      setProcessing(false);
      setProcessMsg("");
    }
  }, [session, selectedId, processing, redacoes]);

  const handleSubmit = useCallback(async (mode: SubmitMode = "submitted") => {
    if (!session || !preview || submitting) return;
    setSubmitting(mode);
    try {
      await submitRedacao(preview, session.authToken, (msg: string) => {
        notify(msg);
      }, editTitle, editBody, mode);
      if (mode === "submitted") {
        setRedacoes((prev) => prev.filter((r) => r.id !== preview.redacao.id));
        setSelectedId(null);
        setPreview(null);
      } else {
        setRedacoes((prev) => prev.map((r) => r.id === preview.redacao.id ? { ...r, status: "draft" } : r));
      }
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "ERRO AO ENVIAR REDAÇÃO");
    } finally {
      setSubmitting(false);
    }
  }, [session, preview, submitting, editTitle, editBody]);

  const handleClosePreview = () => {
    setPreview(null);
    setEditTitle("");
    setEditBody("");
  };

  const pendingCount = redacoes.filter((r) => r.status === "pending").length;
  const draftCount = redacoes.filter((r) => r.status === "draft").length;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10 min-h-screen bg-aurora">
      <nav className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em]">
        <span className="opacity-50">Home</span>
        <span className="opacity-30">/</span>
        <span className="text-primary font-bold">Redação Paulista</span>
      </nav>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-hero p-0.5 shadow-glow-violet rotate-[-2deg]">
          <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
            <PenTool size={32} className="text-primary" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Redação Paulista</h1>
          <p className="text-xs text-muted-foreground font-mono tracking-widest uppercase opacity-80">Escrita Criativa com Inteligência Artificial</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 p-4 glass rounded-2xl border-surface-border">
        <button
          onClick={handleFetch}
          disabled={loading}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
            fetched 
              ? "border-surface-border bg-surface text-white" 
              : "border-primary bg-primary/20 text-primary shadow-glow-violet"
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Sincronizando...
            </span>
          ) : (
            "Listar Propostas"
          )}
        </button>

        {fetched && redacoes.length > 0 && (
          <div className="flex items-center gap-3 ml-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
              {pendingCount} Pendentes
            </span>
            {draftCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] font-black uppercase tracking-widest border border-yellow-500/20">
                {draftCount} Rascunhos
              </span>
            )}
          </div>
        )}
      </div>

      {/* Processing overlay */}
      {processing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-3xl p-10 flex flex-col items-center justify-center gap-6 border-primary/30"
        >
          <div className="relative">
            <Loader2 size={48} className="animate-spin text-primary" />
            <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-xl font-black text-white uppercase tracking-tighter">{processMsg}</p>
            <p className="text-xs text-muted-foreground font-mono tracking-widest uppercase opacity-60">A inteligência artificial está redigindo seu texto</p>
          </div>
        </motion.div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-card border border-primary/30 rounded-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-primary/5">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <PenTool size={16} className="text-primary" />
                Pré-visualização da Redação
              </h2>
              <button
                onClick={handleClosePreview}
                className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                  Título
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Body */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                  Texto da Redação
                </label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={14}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm leading-relaxed resize-y focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Word count */}
              <p className="text-xs text-muted-foreground">
                {editBody.split(/\s+/).filter(Boolean).length} palavras · {editBody.length} caracteres
              </p>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => handleSubmit("submitted")}
                  disabled={!!submitting || !editBody.trim()}
                  className="flex-1 min-w-[180px] py-3 rounded-xl text-sm font-bold border border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {submitting === "submitted" ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Enviar Redação
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleSubmit("draft")}
                  disabled={!!submitting || !editBody.trim()}
                  className="py-3 px-5 rounded-xl text-sm font-bold border border-yellow-500/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors flex items-center gap-2 disabled:opacity-40"
                >
                  {submitting === "draft" ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FileText size={16} />
                      Salvar Rascunho
                    </>
                  )}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!!submitting}
                  className="py-3 px-5 rounded-xl text-sm font-bold border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Regerar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Redações list */}
      {!fetched ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-6 glass rounded-3xl border-dashed border-surface-border/30">
          <div className="w-20 h-20 rounded-2xl bg-surface border border-surface-border flex items-center justify-center text-muted-foreground/30">
            <PenTool size={48} />
          </div>
          <p className="text-xs font-mono uppercase tracking-[0.4em] text-muted-foreground">Listar propostas pendentes para começar</p>
        </div>
      ) : redacoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4 glass rounded-3xl border-dashed border-surface-border/30">
          <CheckCircle size={48} className="text-emerald-500/30 mb-2" />
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Todas as redações foram concluídas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {redacoes
            .sort((a, b) => (a.status === "pending" && b.status === "draft" ? -1 : a.status === "draft" && b.status === "pending" ? 1 : 0))
            .map((redacao, i) => (
              <motion.div
                key={redacao.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => !processing && !preview && setSelectedId(redacao.id)}
                className={`card-premium group cursor-pointer transition-all duration-300 ${
                  selectedId === redacao.id
                    ? "border-primary bg-primary/5 shadow-glow-violet/20"
                    : "border-surface-border/50"
                }`}
              >
                <div className="p-5 flex items-center gap-4">
                  <div
                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                      selectedId === redacao.id
                        ? "border-primary bg-primary shadow-glow-violet"
                        : "border-surface-border bg-surface"
                    }`}
                  >
                    {selectedId === redacao.id && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                      {redacao.title}
                    </p>
                    <p className="text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
                      {redacao.room_name_for_apply || "TEMA GERAL"}
                    </p>
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${
                      redacao.status === "pending"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    }`}
                  >
                    {redacao.status === "pending" ? "Pendente" : "Rascunho"}
                  </span>
                </div>
              </motion.div>
            ))}

          {/* Action button */}
          {selectedId && !processing && !preview && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-2 pt-4"
            >
              <button
                onClick={handleGenerate}
                className="w-full btn-premium py-4 text-sm flex items-center justify-center gap-3"
              >
                <PenTool size={18} />
                INICIAR REDAÇÃO SELECIONADA
              </button>
            </motion.div>
          )}
        </div>
      )}

      <NotificationContainer />
    </div>
  );
}