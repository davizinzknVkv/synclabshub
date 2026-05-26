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
    meta: [{ title: "Redação Paulista - SYNC LABS HUB" }],
  }),
});

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
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = useCallback(async () => {
    if (!session || !preview || submitting) return;
    setSubmitting(true);
    try {
      await submitRedacao(preview, session.authToken, (msg: string) => {
        notify(msg);
      }, editTitle, editBody);
      setRedacoes((prev) => prev.filter((r) => r.id !== preview.redacao.id));
      setSelectedId(null);
      setPreview(null);
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
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-primary/30 rounded-xl p-6 flex flex-col items-center gap-3"
        >
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-foreground font-semibold">{processMsg}</p>
          <p className="text-sm text-muted-foreground">Não feche esta página</p>
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
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !editBody.trim()}
                  className="flex-1 py-3 rounded-xl text-sm font-bold border border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {submitting ? (
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
                  onClick={handleGenerate}
                  disabled={submitting}
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
        <div className="text-center py-20 text-muted-foreground">
          <PenTool size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">Clique em "Buscar Redações" para encontrar suas redações</p>
        </div>
      ) : redacoes.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CheckCircle size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">Nenhuma redação encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {redacoes
            .sort((a, b) => (a.status === "pending" && b.status === "draft" ? -1 : a.status === "draft" && b.status === "pending" ? 1 : 0))
            .map((redacao, i) => (
              <motion.div
                key={redacao.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => !processing && !preview && setSelectedId(redacao.id)}
                className={`bg-card border rounded-xl p-4 cursor-pointer transition-all flex items-center gap-4 ${
                  selectedId === redacao.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selectedId === redacao.id
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  }`}
                >
                  {selectedId === redacao.id && (
                    <div className="w-2 h-2 rounded-full bg-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {redacao.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {redacao.room_name_for_apply || "—"}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded whitespace-nowrap ${
                    redacao.status === "pending"
                      ? "bg-primary/20 text-primary"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {redacao.status === "pending" ? "Pendente" : "Rascunho"}
                </span>
              </motion.div>
            ))}

          {/* Action button */}
          {selectedId && !processing && !preview && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <button
                onClick={handleGenerate}
                className="w-full py-3 rounded-xl text-sm font-bold border border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
              >
                <PenTool size={16} />
                Fazer Redação Selecionada
              </button>
            </motion.div>
          )}
        </div>
      )}

      <NotificationContainer />
    </div>
  );
}