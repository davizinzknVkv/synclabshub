import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { GraduationCap, Loader2, Zap } from "lucide-react";
import {
  autoSolveQuiz,
  type PreparaSpAuth,
  type SolveQuizResult,
} from "@/lib/preparasp";
import { NotificationContainer, notify } from "@/components/Notification";

export const Route = createFileRoute("/dashboard/preparasp")({
  component: PreparaSpPage,
  head: () => ({ meta: [{ title: "Prepara SP - SYNC LABS HUB" }] }),
});

function PreparaSpPage() {
  const [bearerToken, setBearer] = useState("");
  const [sessionToken, setSession] = useState("");
  const [userId, setUser] = useState("");
  const [analyticsSessionId, setAnalytics] = useState("");
  const [quizId, setQuizId] = useState("");
  const [questionIds, setQuestionIds] = useState("");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<SolveQuizResult | undefined>();

  const append = (m: string) =>
    setLog((l) => [...l, `[${new Date().toLocaleTimeString()}] ${m}`].slice(-200));

  const run = useCallback(async () => {
    if (running) return;
    if (!bearerToken || !sessionToken || !userId || !quizId) {
      notify("PREENCHA BEARER, SESSION, USER-ID E QUIZ-ID");
      return;
    }
    const ids = questionIds
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      notify("COLE AO MENOS 1 QUESTION_ID");
      return;
    }
    const auth: PreparaSpAuth = {
      bearerToken: bearerToken.trim(),
      sessionToken: sessionToken.trim(),
      userId: userId.trim(),
      analyticsSessionId: analyticsSessionId.trim() || undefined,
    };
    setRunning(true);
    append(`▶ resolvendo ${ids.length} questões do quiz ${quizId.slice(0, 8)}…`);
    try {
      const { ok, fail, lastResult } = await autoSolveQuiz(
        auth,
        quizId.trim(),
        ids,
        (cur, tot) => append(`  · ${cur}/${tot}`),
      );
      setLastResult(lastResult);
      append(`✓ ${ok} ok, ${fail} falhas`);
      notify(`${ok} OK • ${fail} FALHAS`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      append(`✖ ${msg}`);
      notify(msg.toUpperCase());
    } finally {
      setRunning(false);
    }
  }, [bearerToken, sessionToken, userId, analyticsSessionId, quizId, questionIds, running]);

  const inputCls =
    "w-full bg-blood-muted border border-glass-border rounded-sm px-2 py-1.5 text-[11px] font-mono text-white placeholder:text-muted-foreground outline-none focus:border-primary/50";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
        Home / <span className="text-foreground">Prepara SP</span>
      </p>

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blood-muted border border-primary/20 rounded-sm flex items-center justify-center">
          <GraduationCap size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white font-mono uppercase tracking-[0.15em]">
            Prepara SP — Praxis (crimsonzerohub)
          </h1>
          <p className="text-[9px] text-muted-foreground font-mono">
            Cole os tokens capturados pelo interceptor e os question_ids do quiz.
          </p>
        </div>
      </div>

      <div className="bg-card border border-glass-border rounded-sm p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">bearer-token</span>
            <input className={inputCls} value={bearerToken} onChange={(e) => setBearer(e.target.value)} placeholder="lBuNL4W6..." />
          </label>
          <label className="space-y-1">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">session-token</span>
            <input className={inputCls} value={sessionToken} onChange={(e) => setSession(e.target.value)} placeholder="lBuNL4W6...%2F..." />
          </label>
          <label className="space-y-1">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">user-id</span>
            <input className={inputCls} value={userId} onChange={(e) => setUser(e.target.value)} placeholder="019bddfd-..." />
          </label>
          <label className="space-y-1">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">analytics-session-id (opcional)</span>
            <input className={inputCls} value={analyticsSessionId} onChange={(e) => setAnalytics(e.target.value)} placeholder="019e48ca-..." />
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">quiz_id</span>
          <input className={inputCls} value={quizId} onChange={(e) => setQuizId(e.target.value)} placeholder="019e48ca-a32d-..." />
        </label>

        <label className="space-y-1 block">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">question_ids (1 por linha ou separados por vírgula)</span>
          <textarea
            className={`${inputCls} min-h-[120px] resize-y`}
            value={questionIds}
            onChange={(e) => setQuestionIds(e.target.value)}
            placeholder={"019c07f7-570c-748f-8a3c-390db2d17da9\n019c07f7-56f4-72b0-b38c-cf9cab3794bd\n…"}
          />
        </label>

        <button
          onClick={run}
          disabled={running}
          className="px-3 py-2 rounded-sm text-[10px] font-mono font-semibold uppercase tracking-wider border border-primary bg-primary/20 text-primary hover:bg-primary/30 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          {running ? "Resolvendo…" : "Resolver quiz"}
        </button>
      </div>

      {(log.length > 0 || lastResult) && (
        <div className="bg-blood-muted border border-glass-border rounded-sm p-3 space-y-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">Log</p>
          <pre className="text-[10px] font-mono text-white/80 max-h-64 overflow-auto whitespace-pre-wrap">
            {log.join("\n")}
          </pre>
          {lastResult?.finalize_result ? (
            <pre className="text-[10px] font-mono text-emerald-400 max-h-48 overflow-auto whitespace-pre-wrap">
              {JSON.stringify(lastResult.finalize_result, null, 2)}
            </pre>
          ) : null}
        </div>
      )}

      <NotificationContainer />
    </div>
  );
}
