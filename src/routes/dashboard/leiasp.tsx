import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { BookOpen, Play, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  generateLeiaSpToken,
  loginElefante,
  getBooks,
  getBookDetails,
  getPreview,
  startBackgroundRead,
  checkJobStatus,
} from "@/lib/leiasp";
import type { BookItem, ElefanteSession } from "@/lib/leiasp";
import { NotificationContainer, notify } from "@/components/Notification";

export const Route = createFileRoute("/dashboard/leiasp")({
  component: LeiaSPPage,
  head: () => ({
    meta: [{ title: "Leia SP - FLUX HUB" }],
  }),
});

type JobStatus = "idle" | "reading" | "done" | "error";

interface BookWithJob extends BookItem {
  jobId?: string;
  jobStatus: JobStatus;
  jobMessage?: string;
}

function LeiaSPPage() {
  const session = getSession();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [books, setBooks] = useState<BookWithJob[]>([]);
  const [fetched, setFetched] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const elefanteRef = useRef<ElefanteSession | null>(null);

  // ─── Login to Elefante and fetch books ────────────────────────
  const handleFetch = useCallback(async () => {
    if (!session || loading) return;
    setLoading(true);
    try {
      notify("GERANDO TOKEN LEIA SP...");
      const leiaToken = await generateLeiaSpToken(session.authToken);

      notify("AUTENTICANDO NO ELEFANTE...");
      const elefante = await loginElefante(leiaToken);
      elefanteRef.current = elefante;

      notify("BUSCANDO LIVROS...");
      const bookList = await getBooks(elefante.bearerToken);

      const withJob: BookWithJob[] = bookList.map((b) => ({
        ...b,
        jobStatus: "idle" as JobStatus,
      }));
      setBooks(withJob);
      setSelected(new Set(withJob.filter((b) => b.reading_percent < 100).map((b) => b.slug)));
      setFetched(true);
      notify(`${bookList.length} LIVROS ENCONTRADOS`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "ERRO AO BUSCAR LIVROS");
    } finally {
      setLoading(false);
    }
  }, [session, loading]);

  // ─── Toggle selection ─────────────────────────────────────────
  const toggleSelect = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const selectAll = () => {
    const incomplete = books.filter((b) => b.reading_percent < 100);
    if (selected.size === incomplete.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(incomplete.map((b) => b.slug)));
    }
  };

  // ─── Start background reading for selected books ─────────────
  const handleStartReading = useCallback(async () => {
    const el = elefanteRef.current;
    if (!el || processing) return;

    const selectedBooks = books.filter(
      (b) => selected.has(b.slug) && b.reading_percent < 100 && b.jobStatus !== "reading"
    );
    if (selectedBooks.length === 0) {
      notify("NENHUM LIVRO SELECIONADO OU TODOS JÁ LIDOS");
      return;
    }

    setProcessing(true);

    for (const book of selectedBooks) {
      try {
        notify(`PREPARANDO: ${book.title.substring(0, 30)}...`);

        // Get details to know total pages
        let totalPages = book.total_pages || 100;
        try {
          const details = await getBookDetails(el.bearerToken, book.slug);
          if (details.total_pages) totalPages = details.total_pages;
        } catch {
          // Use default
        }

        // Get preview for recommended timing
        let timeMinutes = Math.ceil((40 * totalPages) / 60) + 2; // ~40s per page default
        try {
          const preview = await getPreview(el.bearerToken, book.slug);
          if (preview.success && preview.seconds_per_page_min) {
            const avgDelay = preview.seconds_per_page_min;
            timeMinutes = Math.ceil((avgDelay * totalPages) / 60) + 2;
          }
        } catch {
          // Use default timing
        }

        notify(`INICIANDO LEITURA: ${book.title.substring(0, 30)}... (~${timeMinutes}min)`);
        const result = await startBackgroundRead(
          el.bearerToken,
          el.refreshToken,
          book.slug,
          timeMinutes
        );

        if (result.success && result.job_id) {
          setBooks((prev) =>
            prev.map((b) =>
              b.slug === book.slug
                ? { ...b, jobId: result.job_id, jobStatus: "reading" as JobStatus, jobMessage: `~${timeMinutes}min` }
                : b
            )
          );
          notify(`✓ ${book.title.substring(0, 30)}... ENVIADO (Job: ${result.job_id})`);
        } else {
          setBooks((prev) =>
            prev.map((b) =>
              b.slug === book.slug
                ? { ...b, jobStatus: "error" as JobStatus, jobMessage: result.message || "Falha" }
                : b
            )
          );
          notify(`✗ ${book.title.substring(0, 30)}... ${result.message || "FALHA"}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro";
        setBooks((prev) =>
          prev.map((b) =>
            b.slug === book.slug ? { ...b, jobStatus: "error" as JobStatus, jobMessage: msg } : b
          )
        );
        notify(`✗ ${book.title.substring(0, 30)}... ${msg}`);
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    setProcessing(false);
    notify("TODOS OS LIVROS FORAM ENVIADOS PARA LEITURA EM BACKGROUND");
  }, [books, selected, processing]);

  // ─── Check job status for a book ──────────────────────────────
  const handleCheckJob = useCallback(
    async (book: BookWithJob) => {
      const el = elefanteRef.current;
      if (!el || !book.jobId) return;
      try {
        const status = await checkJobStatus(el.bearerToken, book.jobId);
        const state = status.status || status.state || "unknown";
        if (state === "completed" || state === "done") {
          setBooks((prev) =>
            prev.map((b) =>
              b.slug === book.slug
                ? { ...b, jobStatus: "done", jobMessage: "Concluído!", reading_percent: 100 }
                : b
            )
          );
          notify(`✓ "${book.title.substring(0, 25)}" — Concluído!`);
        } else if (state === "failed" || state === "error") {
          setBooks((prev) =>
            prev.map((b) =>
              b.slug === book.slug
                ? { ...b, jobStatus: "error", jobMessage: status.message || "Erro" }
                : b
            )
          );
        } else {
          const progress = status.progress || status.current_page || "";
          notify(`⏳ "${book.title.substring(0, 25)}" — ${state} ${progress ? `(${progress})` : ""}`);
        }
      } catch (err) {
        notify(`Erro ao verificar: ${err instanceof Error ? err.message : "Erro"}`);
      }
    },
    []
  );

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10 min-h-screen bg-aurora">
      <nav className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em]">
        <span className="opacity-50">Home</span>
        <span className="opacity-30">/</span>
        <span className="text-primary font-bold">Leia SP</span>
      </nav>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-hero p-0.5 shadow-glow-violet rotate-[2deg]">
          <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
            <BookOpen size={32} className="text-primary" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Leia SP</h1>
          <p className="text-xs text-muted-foreground font-mono tracking-widest uppercase opacity-80">Plataforma Elefante • Leitura Automatizada</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-4 p-4 glass rounded-2xl border-surface-border">
        <button
          onClick={handleFetch}
          disabled={loading || processing}
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
            "Conectar Elefante"
          )}
        </button>

        {books.length > 0 && (
          <>
            <button
              onClick={selectAll}
              className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-surface-border bg-surface text-muted-foreground hover:text-white"
            >
              {selected.size === books.filter((b) => b.reading_percent < 100).length
                ? "Limpar Seleção"
                : "Selecionar Pendentes"}
            </button>
            <button
              onClick={handleStartReading}
              disabled={processing || selected.size === 0}
              className="ml-auto btn-premium px-8 py-2.5 text-xs flex items-center gap-2 disabled:opacity-50"
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Processando...
                </span>
              ) : (
                <>
                  <Play size={16} />
                  Iniciar Leitura ({selected.size})
                </>
              )}
            </button>
          </>
        )}
      </div>

      {!fetched ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-6 glass rounded-3xl border-dashed border-surface-border/30">
          <div className="w-20 h-20 rounded-2xl bg-surface border border-surface-border flex items-center justify-center text-muted-foreground/30">
            <BookOpen size={48} />
          </div>
          <p className="text-xs font-mono uppercase tracking-[0.4em] text-muted-foreground">Conecte sua conta para listar as obras</p>
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4 glass rounded-3xl border-dashed border-surface-border/30">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">Nenhuma obra encontrada na biblioteca</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book, i) => {
            const isSelected = selected.has(book.slug);
            const isComplete = book.reading_percent >= 100;
            const isReading = book.jobStatus === "reading";
            const isDone = book.jobStatus === "done";
            const isError = book.jobStatus === "error";

            return (
              <motion.div
                key={book.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => !processing && !isComplete && toggleSelect(book.slug)}
                className={`card-premium group cursor-pointer transition-all duration-300 ${
                  isComplete || isDone
                    ? "border-emerald-500/20 bg-emerald-500/5 shadow-none"
                    : isError
                    ? "border-red-500/20 bg-red-500/5"
                    : isReading
                    ? "border-yellow-500/20 bg-yellow-500/5"
                    : isSelected
                    ? "border-primary/50 bg-primary/5 shadow-glow-violet/20"
                    : ""
                }`}
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground truncate">
                        {book.author || "AUTOR DESCONHECIDO"}
                      </p>
                      <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {book.title}
                      </h3>
                    </div>
                    {isComplete || isDone ? (
                      <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                    ) : isError ? (
                      <XCircle size={18} className="text-red-400 shrink-0" />
                    ) : isReading ? (
                      <Loader2 size={18} className="text-yellow-400 animate-spin shrink-0" />
                    ) : (
                      <div
                        className={`w-5 h-5 rounded-lg border-2 shrink-0 transition-all ${
                          isSelected ? "border-primary bg-primary shadow-glow-violet" : "border-surface-border bg-surface"
                        }`}
                      >
                        {isSelected && <div className="w-full h-full flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white" /></div>}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                         <div className={`w-1.5 h-1.5 rounded-full ${isComplete ? "bg-emerald-400" : isReading ? "bg-yellow-400 animate-pulse" : "bg-primary"}`} />
                         <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Progresso</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-white">
                        {Math.round(book.reading_percent)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden border border-surface-border">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(book.reading_percent, 100)}%` }}
                        className={`h-full rounded-full transition-all duration-1000 ${
                          isComplete || isDone
                            ? "bg-emerald-500"
                            : isReading
                            ? "bg-yellow-400"
                            : "bg-gradient-primary"
                        }`}
                      />
                    </div>
                  </div>

                  {book.jobMessage && (
                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest p-2 rounded-lg ${
                      isDone ? "bg-emerald-500/10 text-emerald-400" : isError ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"
                    }`}>
                      {isReading && <RefreshCw size={10} className="animate-spin" />}
                      {book.jobMessage}
                      {isReading && book.jobId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckJob(book);
                          }}
                          className="ml-auto underline opacity-80 hover:opacity-100"
                        >
                          ATUALIZAR
                        </button>
                      )}
                    </div>
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
