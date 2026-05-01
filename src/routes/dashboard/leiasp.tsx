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
    meta: [{ title: "Leia SP - SYNC LABS HUB" }],
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
        Home / <span className="text-foreground">Leia SP</span>
      </p>

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blood-muted border border-primary/20 rounded-sm flex items-center justify-center">
          <BookOpen size={16} className="text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white font-mono uppercase tracking-[0.15em]">
            Leia SP — Elefante
          </h1>
          <p className="text-[9px] text-muted-foreground font-mono">Leitura automática em background</p>
        </div>
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
              <Loader2 size={12} className="animate-spin" />
              Conectando...
            </span>
          ) : (
            "Buscar Livros"
          )}
        </button>

        {books.length > 0 && (
          <>
            <button
              onClick={selectAll}
              className="px-3 py-2 rounded-sm text-[10px] font-mono font-medium uppercase tracking-wider border border-glass-border bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              {selected.size === books.filter((b) => b.reading_percent < 100).length
                ? "Desmarcar"
                : "Selecionar Incompletos"}
            </button>
            <button
              onClick={handleStartReading}
              disabled={processing || selected.size === 0}
              className="ml-auto px-3 py-2 rounded-sm text-[10px] font-mono font-semibold uppercase tracking-wider border border-primary bg-primary/20 text-primary hover:bg-primary/30 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  Processando...
                </span>
              ) : (
                <>
                  <Play size={12} />
                  Ler ({selected.size})
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Book grid */}
      {!fetched ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-xs font-mono uppercase tracking-widest">
            Clique em "Buscar Livros" para conectar ao Elefante
          </p>
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-xs font-mono uppercase tracking-widest">Nenhum livro encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {books.map((book, i) => {
            const isSelected = selected.has(book.slug);
            const isComplete = book.reading_percent >= 100;
            const isReading = book.jobStatus === "reading";
            const isDone = book.jobStatus === "done";
            const isError = book.jobStatus === "error";

            return (
              <motion.div
                key={book.slug}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => !processing && !isComplete && toggleSelect(book.slug)}
                className={`bg-card border rounded-sm p-4 flex flex-col gap-2 transition-colors ${
                  isComplete || isDone
                    ? "border-emerald-500/30 bg-emerald-500/5 cursor-default"
                    : isError
                    ? "border-red-500/30 bg-red-500/5 cursor-pointer"
                    : isReading
                    ? "border-yellow-500/30 bg-yellow-500/5 cursor-default"
                    : isSelected
                    ? "border-primary/30 bg-blood-muted cursor-pointer"
                    : "border-glass-border hover:border-primary/20 cursor-pointer"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground truncate font-mono">
                    {book.author || "—"}
                  </p>
                  {isComplete || isDone ? (
                    <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                  ) : isError ? (
                    <XCircle size={14} className="text-red-400 shrink-0" />
                  ) : isReading ? (
                    <Loader2 size={14} className="text-yellow-400 animate-spin shrink-0" />
                  ) : (
                    <span
                      className={`w-3.5 h-3.5 rounded-sm border shrink-0 transition-colors ${
                        isSelected ? "border-primary bg-primary/30" : "border-glass-border"
                      }`}
                    />
                  )}
                </div>

                <h3 className="text-xs font-medium text-white line-clamp-2 leading-snug">
                  {book.title}
                </h3>

                {/* Progress bar */}
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono text-muted-foreground">
                      {Math.round(book.reading_percent)}%
                    </span>
                    {isReading && book.jobId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckJob(book);
                        }}
                        className="text-[9px] font-mono text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                      >
                        <RefreshCw size={10} />
                        Status
                      </button>
                    )}
                  </div>
                  <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isComplete || isDone
                          ? "bg-emerald-500"
                          : isReading
                          ? "bg-yellow-500"
                          : "bg-primary/50"
                      }`}
                      style={{ width: `${Math.min(book.reading_percent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Status message */}
                {book.jobMessage && (
                  <p
                    className={`text-[9px] font-mono uppercase tracking-wider ${
                      isDone ? "text-emerald-400" : isError ? "text-red-400" : "text-yellow-400"
                    }`}
                  >
                    {book.jobMessage}
                  </p>
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
