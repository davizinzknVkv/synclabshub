import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap, Loader2, LogOut, Play, Plus, Trash2,
  ChevronDown, ChevronRight, KeyRound, CheckCircle2, AlertCircle, X,
} from "lucide-react";
import { autoSolveQuiz, type PreparaSpAuth } from "@/lib/preparasp";
import {
  loadAuth, saveAuth, loadActivities, saveActivities,
  SUBJECTS, subjectMeta, WEEKDAYS, type Activity,
} from "@/lib/preparaspStore";
import { NotificationContainer, notify } from "@/components/Notification";

export const Route = createFileRoute("/dashboard/preparasp")({
  component: PreparaSpPage,
  head: () => ({ meta: [{ title: "Prepara SP - SYNC LABS HUB" }] }),
});

function PreparaSpPage() {
  const [auth, setAuth] = useState<PreparaSpAuth | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [adding, setAdding] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filterDay, setFilterDay] = useState<number>(new Date().getDay());
  const [showAllDays, setShowAllDays] = useState(false);

  useEffect(() => { setActivities(loadActivities()); }, []);
  useEffect(() => { const a = loadAuth(); setAuth(a); }, []);

  const persist = (next: Activity[]) => { setActivities(next); saveActivities(next); };

  const visible = useMemo(() => {
    const sorted = [...activities].sort((a, b) => {
      if (a.status === "running") return -1;
      if (b.status === "running") return 1;
      return 0;
    });
    return showAllDays ? sorted : sorted.filter((a) => a.weekday === filterDay);
  }, [activities, filterDay, showAllDays]);

  const totalDone = activities.filter((a) => a.status === "done").length;
  const progress = activities.length ? Math.round((totalDone / activities.length) * 100) : 0;

  const solve = useCallback(async (act: Activity) => {
    if (!auth) { notify("CONFIGURE OS TOKENS PRIMEIRO"); setShowAuth(true); return; }
    if (!act.quizId || act.questionIds.length === 0) { notify("ATIVIDADE SEM QUIZ_ID/QUESTIONS"); return; }
    
    // Usamos o setter direto para garantir que pegamos o estado mais recente se houver múltiplas chamadas
    setActivities(prev => prev.map(x => x.id === act.id ? { ...x, status: "running", lastMessage: "resolvendo…" } : x));
    
    try {
      const { ok, fail } = await autoSolveQuiz(auth, act.quizId, act.questionIds);
      const status = fail === 0 ? "done" : "error";
      const lastMessage = `${ok} ok · ${fail} falhas`;
      
      setActivities(prev => {
        const next = prev.map(x => x.id === act.id ? { ...x, status, lastMessage } : x);
        saveActivities(next);
        return next;
      });
      
      notify(`${act.title.toUpperCase()} • ${ok} OK • ${fail} FALHAS`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      setActivities(prev => {
        const next = prev.map(x => x.id === act.id ? { ...x, status: "error", lastMessage: msg } : x);
        saveActivities(next);
        return next;
      });
      notify(msg.toUpperCase());
    }
  }, [auth]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <NotificationContainer />

      {/* header igual khan */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-blood-muted border border-primary/20 flex items-center justify-center">
            <GraduationCap size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-medium text-white tracking-tight font-mono uppercase">
              Prepara SP
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">
              {auth ? "estudante" : "configure os tokens praxis"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAdding(true)}
            className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary flex items-center gap-1.5 px-3 py-1.5 border border-glass-border rounded-sm"
          >
            <Plus size={11} /> Nova
          </button>
          <button
            onClick={() => setShowAuth(true)}
            className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary flex items-center gap-1.5 px-3 py-1.5 border border-glass-border rounded-sm"
          >
            <KeyRound size={11} /> Tokens {auth ? "✓" : "—"}
          </button>
          {auth && (
            <button
              onClick={() => { saveAuth(null); setAuth(null); notify("TOKENS LIMPOS"); }}
              className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary flex items-center gap-1.5 px-3 py-1.5 border border-glass-border rounded-sm"
            >
              <LogOut size={11} /> Sair
            </button>
          )}
        </div>
      </header>

      {/* filtro dias */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setShowAllDays(true)}
          className={`px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider border ${
            showAllDays ? "border-primary bg-primary/20 text-primary" : "border-glass-border bg-blood-muted text-muted-foreground hover:text-white"
          }`}
        >
          Tudo
        </button>
        {WEEKDAYS.map((d, i) => {
          const sel = !showAllDays && filterDay === i;
          const count = activities.filter((a) => a.weekday === i).length;
          return (
            <button
              key={i}
              onClick={() => { setShowAllDays(false); setFilterDay(i); }}
              className={`px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider border ${
                sel ? "border-primary bg-primary/20 text-primary" : "border-glass-border bg-blood-muted text-muted-foreground hover:text-white"
              }`}
            >
              {d.short} {count > 0 && <span className="opacity-60">·{count}</span>}
            </button>
          );
        })}
      </div>

      {/* lista */}
      {visible.length === 0 ? (
        <div className="bg-card border border-dashed border-glass-border rounded-sm p-8 text-center">
          <p className="text-[11px] text-muted-foreground font-mono">
            Nenhuma atividade {showAllDays ? "cadastrada" : `para ${WEEKDAYS[filterDay].long.toLowerCase()}`}.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="mt-3 px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-primary bg-primary/20 text-primary hover:bg-primary/30"
          >
            + Adicionar atividade
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((a) => (
            <ActivityRow
              key={a.id}
              activity={a}
              open={openId === a.id}
              onToggle={() => setOpenId((p) => p === a.id ? null : a.id)}
              onSolve={() => solve(a)}
              onDelete={() => persist(activities.filter((x) => x.id !== a.id))}
            />
          ))}
        </div>
      )}

      {activities.length > 0 && (
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          progresso geral · {totalDone}/{activities.length} ({progress}%)
        </div>
      )}

      {showAuth && (
        <AuthModal
          initial={auth}
          onClose={() => setShowAuth(false)}
          onSave={(a) => { setAuth(a); saveAuth(a); setShowAuth(false); notify("TOKENS SALVOS"); }}
        />
      )}
      {adding && (
        <AddActivityModal
          defaultDay={showAllDays ? new Date().getDay() : filterDay}
          onClose={() => setAdding(false)}
          onSave={(act) => { persist([...activities, act]); setAdding(false); }}
        />
      )}
    </div>
  );
}

// ─────────── linha estilo khan ───────────
function ActivityRow({
  activity, open, onToggle, onSolve, onDelete,
}: {
  activity: Activity; open: boolean;
  onToggle: () => void; onSolve: () => void; onDelete: () => void;
}) {
  const meta = subjectMeta(activity.subject);
  const pct =
    activity.status === "done" ? 100 :
    activity.status === "running" ? 50 :
    activity.status === "error" ? 25 : 0;
  const StatusIcon =
    activity.status === "done" ? CheckCircle2 :
    activity.status === "error" ? AlertCircle :
    activity.status === "running" ? Loader2 : null;

  return (
    <div className="border border-glass-border rounded-sm bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-blood-muted/40 transition-colors text-left"
      >
        {open
          ? <ChevronDown size={14} className="text-muted-foreground shrink-0" />
          : <ChevronRight size={14} className="text-muted-foreground shrink-0" />
        }
        <div
          className="w-8 h-8 rounded-sm flex items-center justify-center text-base shrink-0"
          style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}
        >
          {meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-mono uppercase tracking-wider text-white truncate">
            {meta.label} — {activity.title}
          </p>
          <div className="mt-1.5 h-1 rounded-full bg-blood-muted overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${pct}%`,
                background: activity.status === "error" ? "#ef4444" : meta.color,
              }}
            />
          </div>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0">
          {pct}%
        </span>
      </button>

      {open && (
        <div className="border-t border-glass-border p-3 space-y-3 bg-blood-muted/30">
          <div className="flex flex-wrap gap-2 text-[10px] font-mono text-muted-foreground">
            <span className="px-2 py-0.5 rounded-sm bg-blood-muted border border-glass-border">
              {WEEKDAYS[activity.weekday].long}
            </span>
            <span className="px-2 py-0.5 rounded-sm bg-blood-muted border border-glass-border">
              quiz: {activity.quizId.slice(0, 8)}…
            </span>
            <span className="px-2 py-0.5 rounded-sm bg-blood-muted border border-glass-border">
              {activity.questionIds.length} questões
            </span>
            {StatusIcon && (
              <span className="px-2 py-0.5 rounded-sm bg-blood-muted border border-glass-border flex items-center gap-1">
                <StatusIcon size={10} className={activity.status === "running" ? "animate-spin" : ""} />
                {activity.lastMessage || activity.status}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSolve}
              disabled={activity.status === "running"}
              className="flex-1 px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-primary bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {activity.status === "running"
                ? <Loader2 size={11} className="animate-spin" />
                : <Play size={11} />}
              Resolver
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-glass-border bg-blood-muted text-muted-foreground hover:text-red-400 hover:border-red-500/40 flex items-center gap-1.5"
            >
              <Trash2 size={11} /> Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────── modais ───────────
function AuthModal({
  initial, onClose, onSave,
}: { initial: PreparaSpAuth | null; onClose: () => void; onSave: (a: PreparaSpAuth) => void }) {
  const [bearer, setBearer] = useState(initial?.bearerToken ?? "");
  const [session, setSession] = useState(initial?.sessionToken ?? "");
  const [user, setUser] = useState(initial?.userId ?? "");
  const [analytics, setAnalytics] = useState(initial?.analyticsSessionId ?? "");

  const submit = () => {
    if (!bearer.trim() || !session.trim() || !user.trim()) {
      notify("PREENCHA BEARER, SESSION E USER-ID"); return;
    }
    onSave({
      bearerToken: bearer.trim(),
      sessionToken: session.trim(),
      userId: user.trim(),
      analyticsSessionId: analytics.trim() || undefined,
    });
  };

  return (
    <Modal title="Tokens Praxis" onClose={onClose}>
      <div className="space-y-2">
        <Field label="bearer-token" value={bearer} onChange={setBearer} placeholder="lBuNL4W6…" />
        <Field label="session-token" value={session} onChange={setSession} placeholder="lBuNL4W6…%2F…" />
        <Field label="user-id" value={user} onChange={setUser} placeholder="019bddfd-…" />
        <Field label="analytics-session-id (opcional)" value={analytics} onChange={setAnalytics} placeholder="019e48ca-…" />
      </div>
      <div className="flex gap-2 mt-4 justify-end">
        <button onClick={onClose} className="px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-glass-border bg-blood-muted text-white">Cancelar</button>
        <button onClick={submit} className="px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-primary bg-primary/20 text-primary hover:bg-primary/30">Salvar</button>
      </div>
    </Modal>
  );
}

function AddActivityModal({
  defaultDay, onClose, onSave,
}: { defaultDay: number; onClose: () => void; onSave: (a: Activity) => void }) {
  const [subject, setSubject] = useState(SUBJECTS[0].id);
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(defaultDay);
  const [quizId, setQuizId] = useState("");
  const [ids, setIds] = useState("");

  const submit = () => {
    if (!title.trim() || !quizId.trim()) { notify("PREENCHA TÍTULO E QUIZ_ID"); return; }
    const questionIds = ids.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean);
    if (questionIds.length === 0) { notify("COLE AO MENOS 1 QUESTION_ID"); return; }
    onSave({
      id: crypto.randomUUID(),
      subject, title: title.trim(), weekday: day,
      quizId: quizId.trim(), questionIds,
      status: "pending",
    });
  };

  return (
    <Modal title="Nova atividade" onClose={onClose}>
      <div className="space-y-2">
        <label className="block space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">Matéria</span>
          <select
            value={subject} onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-blood-muted border border-glass-border rounded-sm px-2 py-1.5 text-[11px] font-mono text-white outline-none focus:border-primary/50"
          >
            {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
          </select>
        </label>
        <Field label="Título" value={title} onChange={setTitle} placeholder="Barroco" />
        <label className="block space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">Dia da semana</span>
          <select
            value={day} onChange={(e) => setDay(Number(e.target.value))}
            className="w-full bg-blood-muted border border-glass-border rounded-sm px-2 py-1.5 text-[11px] font-mono text-white outline-none focus:border-primary/50"
          >
            {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d.long}</option>)}
          </select>
        </label>
        <Field label="quiz_id" value={quizId} onChange={setQuizId} placeholder="019e48ca-…" />
        <label className="block space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">question_ids (1 por linha)</span>
          <textarea
            value={ids} onChange={(e) => setIds(e.target.value)}
            className="w-full bg-blood-muted border border-glass-border rounded-sm px-2 py-1.5 text-[11px] font-mono text-white min-h-[90px] resize-y outline-none focus:border-primary/50"
            placeholder={"019c07f7-…\n019c07f7-…"}
          />
        </label>
      </div>
      <div className="flex gap-2 mt-4 justify-end">
        <button onClick={onClose} className="px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-glass-border bg-blood-muted text-white">Cancelar</button>
        <button onClick={submit} className="px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-primary bg-primary/20 text-primary hover:bg-primary/30">Adicionar</button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-glass-border rounded-sm p-4 w-full max-w-md max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-widest">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">{label}</span>
      <input
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-blood-muted border border-glass-border rounded-sm px-2 py-1.5 text-[11px] font-mono text-white placeholder:text-muted-foreground outline-none focus:border-primary/50"
      />
    </label>
  );
}
