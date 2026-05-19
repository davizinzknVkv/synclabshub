import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Loader2,
  Play,
  CheckCircle,
  RefreshCw,
  Search,
  Zap,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  loginPreparaSp,
  getTopics,
  getTopicDetails,
  autoAnswerContentRound,
  type PreparaSpAuth,
  type PreparaSpUser,
  type TopicSummary,
} from "@/lib/preparasp";
import { NotificationContainer, notify } from "@/components/Notification";

export const Route = createFileRoute("/dashboard/preparasp")({
  component: PreparaSpPage,
  head: () => ({ meta: [{ title: "Prepara SP - SYNC LABS HUB" }] }),
});

interface TopicWithStatus extends TopicSummary {
  status: "idle" | "running" | "done" | "error";
  message?: string;
}

function PreparaSpPage() {
  const session = getSession();
  const [auth, setAuth] = useState<PreparaSpAuth | null>(null);
  const [user, setUser] = useState<PreparaSpUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [topics, setTopics] = useState<TopicWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending">("pending");

  // ── Autenticar com a chave IP.TV da sessão SYNC HUB ──
  const handleConnect = useCallback(async () => {
    if (!session || loading) return;
    setLoading(true);
    try {
      notify("CONECTANDO AO PREPARA SP...");
      const res = await loginPreparaSp(session.authToken);
      setAuth(res.auth);
      setUser(res.data);
      notify(`AUTENTICADO: ${res.data.name?.toUpperCase() || "USUÁRIO"}`);

      notify("CARREGANDO TÓPICOS...");
      const topicsRes = await getTopics(res.auth);
      setUserId(topicsRes.data.userId);
      setTopics(
        topicsRes.data.topics.map((t) => ({ ...t, status: "idle" as const })),
      );
      notify(`${topicsRes.data.topics.length} TÓPICOS ENCONTRADOS`);
    } catch (err) {
      notify(err instanceof Error ? err.message.toUpperCase() : "ERRO");
    } finally {
      setLoading(false);
    }
  }, [session, loading]);

  // ── Auto-resolver um tópico inteiro ──
  const handleAutoAnswer = useCallback(
    async (topic: TopicWithStatus) => {
      if (!auth || !userId || busy) return;
      setBusy(true);
      setTopics((prev) =>
        prev.map((t) =>
          t.id === topic.id ? { ...t, status: "running", message: "Iniciando..." } : t,
        ),
      );

      try {
        const det = await getTopicDetails(auth, topic.id);
        const topicDetail = det.data.topic;
        if (!topicDetail) throw new Error("Tópico não encontrado");

        let totalOk = 0;
        let totalFail = 0;
        let crIndex = 0;
        const pendingRounds = topicDetail.contentRounds.filter(
          (cr) => !cr.report?.isContentRoundCompleted && cr.contents.length > 0,
        );

        for (const cr of pendingRounds) {
          crIndex++;
          const { ok, fail } = await autoAnswerContentRound(
            auth,
            cr,
            userId,
            (current, total) => {
              setTopics((prev) =>
                prev.map((t) =>
                  t.id === topic.id
                    ? {
                        ...t,
                        message: `Quiz ${crIndex}/${pendingRounds.length} — ${current}/${total}`,
                      }
                    : t,
                ),
              );
            },
          );
          totalOk += ok;
          totalFail += fail;
        }

        setTopics((prev) =>
          prev.map((t) =>
            t.id === topic.id
              ? {
                  ...t,
                  status: totalFail === 0 ? "done" : "error",
                  message:
                    totalFail === 0
                      ? `✓ ${totalOk} respondidas`
                      : `${totalOk} ok, ${totalFail} falharam`,
                  completedQuestions: t.completedQuestions + totalOk,
                  isCompleted: totalFail === 0 ? true : t.isCompleted,
                }
              : t,
          ),
        );

        if (totalFail === 0) {
          notify(`"${topic.name.toUpperCase()}" CONCLUÍDO (${totalOk} respostas)`);
        } else {
          notify(`"${topic.name.toUpperCase()}" — ${totalFail} FALHAS`);
        }
      } catch (err) {
        setTopics((prev) =>
          prev.map((t) =>
            t.id === topic.id
              ? {
                  ...t,
                  status: "error",
                  message: err instanceof Error ? err.message : "Erro",
                }
              : t,
          ),
        );
        notify(err instanceof Error ? err.message.toUpperCase() : "ERRO");
      } finally {
        setBusy(false);
      }
    },
    [auth, userId, busy],
  );

  // ── Auto-resolver todos os pendentes em sequência ──
  const handleAutoAnswerAll = useCallback(async () => {
    if (!auth || busy) return;
    const pending = topics.filter((t) => !t.isCompleted && t.status !== "done");
    if (pending.length === 0) {
      notify("NENHUM TÓPICO PENDENTE");
      return;
    }
    for (const t of pending) {
      // eslint-disable-next-line no-await-in-loop
      await handleAutoAnswer(t);
    }
  }, [auth, busy, topics, handleAutoAnswer]);

  // Filtra e busca client-side
  const visibleTopics = topics.filter((t) => {
    if (filter === "pending" && t.isCompleted) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    // auto-connect ao entrar na página, se tiver sessão
    if (session && !auth && !loading) handleConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) {
    return (
      <div className="p-6 text-center text-muted-foreground font-mono text-xs">
        Faça login no SYNC HUB primeiro.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
        Home / <span className="text-foreground">Prepara SP</span>
      </p>

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blood-muted border border-primary/20 rounded-sm flex items-center justify-center">
          <GraduationCap size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white font-mono uppercase tracking-[0.15em]">
            Prepara SP — Auto-Resposta
          </h1>
          <p className="text-[9px] text-muted-foreground font-mono">
            {user ? `${user.name} • ${user.email}` : "Jovens Gênios"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleConnect}
          disabled={loading || busy}
          className="px-3 py-2 rounded-sm text-[10px] font-mono font-medium uppercase tracking-wider border border-primary bg-blood-muted text-primary hover:bg-primary/15 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" />
              Conectando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <RefreshCw size={12} />
              {auth ? "Atualizar" : "Conectar"}
            </span>
          )}
        </button>

        {auth && (
          <>
            <button
              onClick={() => setFilter(filter === "pending" ? "all" : "pending")}
              className="px-3 py-2 rounded-sm text-[10px] font-mono font-medium uppercase tracking-wider border border-glass-border bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              {filter === "pending" ? "Mostrar tudo" : "Só pendentes"}
            </button>

            <div className="flex items-center gap-2 px-3 py-2 rounded-sm border border-glass-border bg-card">
              <Search size={12} className="text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar tópico..."
                className="bg-transparent text-[10px] font-mono text-white placeholder:text-muted-foreground outline-none w-40"
              />
            </div>

            <button
              onClick={handleAutoAnswerAll}
              disabled={busy || visibleTopics.filter((t) => !t.isCompleted).length === 0}
              className="ml-auto px-3 py-2 rounded-sm text-[10px] font-mono font-semibold uppercase tracking-wider border border-primary bg-primary/20 text-primary hover:bg-primary/30 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Zap size={12} />
                  Resolver Pendentes ({visibleTopics.filter((t) => !t.isCompleted).length})
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Grid de tópicos */}
      {!auth ? (
        <div className="text-center py-20 text-muted-foreground">
          <GraduationCap size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-xs font-mono uppercase tracking-widest">
            Conectando ao Prepara SP...
          </p>
        </div>
      ) : visibleTopics.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CheckCircle size={32} className="mx-auto mb-3 opacity-30 text-emerald-400" />
          <p className="text-xs font-mono uppercase tracking-widest">
            {topics.length === 0
              ? "Nenhum tópico encontrado"
              : "Tudo concluído! 🎉"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {visibleTopics.map((topic, i) => {
            const pct =
              topic.totalQuestions > 0
                ? (topic.completedQuestions / topic.totalQuestions) * 100
                : 0;
            const isDone = topic.isCompleted || topic.status === "done";
            const isRunning = topic.status === "running";
            const isError = topic.status === "error";

            return (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`bg-card border rounded-sm p-4 flex flex-col gap-2 transition-colors ${
                  isDone
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : isError
                    ? "border-red-500/30 bg-red-500/5"
                    : isRunning
                    ? "border-yellow-500/30 bg-yellow-500/5"
                    : "border-glass-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground truncate font-mono">
                    {topic.category || "Geral"}
                  </p>
                  {isDone ? (
                    <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                  ) : isRunning ? (
                    <Loader2 size={14} className="text-yellow-400 animate-spin shrink-0" />
                  ) : null}
                </div>

                <h3 className="text-xs font-medium text-white line-clamp-2 leading-snug min-h-[2.5rem]">
                  {topic.name}
                </h3>

                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-mono">
                    <span className="text-muted-foreground">
                      {topic.completedQuestions}/{topic.totalQuestions}
                    </span>
                    <span
                      className={
                        isDone
                          ? "text-emerald-400"
                          : isRunning
                          ? "text-yellow-400"
                          : "text-muted-foreground"
                      }
                    >
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isDone
                          ? "bg-emerald-500"
                          : isRunning
                          ? "bg-yellow-500"
                          : "bg-primary/50"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  {topic.message && (
                    <p
                      className={`text-[9px] font-mono uppercase tracking-wider ${
                        isDone
                          ? "text-emerald-400"
                          : isError
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {topic.message}
                    </p>
                  )}

                  {!isDone && (
                    <button
                      onClick={() => handleAutoAnswer(topic)}
                      disabled={busy}
                      className="w-full px-2 py-1.5 rounded-sm text-[9px] font-mono font-semibold uppercase tracking-wider border border-primary/40 bg-blood-muted text-primary hover:bg-primary/15 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Play size={10} />
                      {isRunning ? "Processando..." : "Resolver"}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <NotificationContainer />
    </div>
  );
}
