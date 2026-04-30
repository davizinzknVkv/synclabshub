import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { PenTool, Loader2, CheckCircle, FileText } from "lucide-react";
import { getSession } from "@/lib/auth";
import { fetchRedacoes, processRedacao } from "@/lib/redacao";
import type { RedacaoItem } from "@/lib/redacao";
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

  const handleFetch = useCallback(async () => {
    if (!session || loading) return;
    setLoading(true);
    try {
      const result = await fetchRedacoes(session.authToken, notify);
      setRedacoes(result);
      setFetched(true);
    } catch (err) {
      notify(err instanceof Error ? err.message : "ERRO AO BUSCAR REDAÇÕES");
    } finally {
      setLoading(false);
    }
  }, [session, loading]);

  const handleProcess = useCallback(async () => {
    if (!session || !selectedId || processing) return;
    const redacao = redacoes.find((r) => r.id === selectedId);
    if (!redacao) return;

    setProcessing(true);
    setProcessMsg("Iniciando...");
    try {
      await processRedacao(redacao, session.authToken, (msg) => {
        setProcessMsg(msg);
        notify(msg);
      });
      // Remove from list after success
      setRedacoes((prev) => prev.filter((r) => r.id !== selectedId));
      setSelectedId(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : "ERRO AO PROCESSAR REDAÇÃO");
    } finally {
      setProcessing(false);
      setProcessMsg("");
    }
  }, [session, selectedId, processing, redacoes]);

  const pendingCount = redacoes.filter((r) => r.status === "pending").length;
  const draftCount = redacoes.filter((r) => r.status === "draft").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <p className="text-sm text-muted-foreground">
        Home / <span className="text-foreground">Redação Paulista</span>
      </p>

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
          <PenTool size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Redação Paulista</h1>
          <p className="text-sm text-muted-foreground">Gere e envie redações automaticamente com IA</p>
        </div>
      </div>

      {/* Search button */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleFetch}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <FileText size={16} />
              Buscar Redações
            </>
          )}
        </button>

        {fetched && redacoes.length > 0 && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="px-2 py-1 rounded bg-primary/10 text-primary font-medium">
              {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
            </span>
            {draftCount > 0 && (
              <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 font-medium">
                {draftCount} rascunho{draftCount !== 1 ? "s" : ""}
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
                onClick={() => !processing && setSelectedId(redacao.id)}
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
          {selectedId && !processing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <button
                onClick={handleProcess}
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
