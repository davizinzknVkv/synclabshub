import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap, Loader2, LogOut, Play, Plus, Trash2,
  ChevronDown, ChevronRight, KeyRound, CheckCircle2, AlertCircle, X,
} from "lucide-react";
import { autoSolveQuiz, type PreparaSpAuth } from "@/lib/preparasp";
import {
  loadAuth, saveAuth, loadActivities, saveActivities,
  SUBJECTS, subjectMeta, WEEKDAYS, type Activity, type ActivityStatus,
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
    
    setActivities(prev => prev.map(x => x.id === act.id ? { ...x, status: "running" as const, lastMessage: "resolvendo…" } : x));
    
    try {
      const { ok, fail } = await autoSolveQuiz(auth, act.quizId, act.questionIds);
      const status = (fail === 0 ? "done" : "error") as ActivityStatus;
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
        const next = prev.map(x => x.id === act.id ? { ...x, status: "error" as const, lastMessage: msg } : x);
        saveActivities(next);
        return next;
      });
      notify(msg.toUpperCase());
    }
  }, [auth]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 relative">
      <div className="fixed inset-0 bg-obsidian-grid pointer-events-none opacity-40" />
      <NotificationContainer />

      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary flex items-center justify-center border-4 border-foreground shadow-[4px_4px_0_0_var(--foreground)] rotate-[-2deg]">
            <GraduationCap size={28} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
              PREPARA SP
            </h1>
            <p className="text-xs text-primary font-mono font-bold tracking-[0.2em] uppercase mt-1">
              {auth ? "STUDENT_LOGGED_IN" : "SYSTEM_AUTH_REQUIRED"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setAdding(true)}
            className="btn-blood px-4 py-2 text-xs flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            <Plus size={16} /> NOVA TAREFA
          </button>
          <button
            onClick={() => setShowAuth(true)}
            className="px-4 py-2 bg-surface border-2 border-foreground text-xs font-bold text-white shadow-[4px_4px_0_0_var(--foreground)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_var(--primary)] transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            <KeyRound size={14} /> TOKENS {auth ? "✓" : "—"}
          </button>
          {auth && (
            <button
              onClick={() => { saveAuth(null); setAuth(null); notify("TOKENS LIMPOS"); }}
              className="px-4 py-2 border-2 border-destructive/50 text-xs font-bold text-destructive hover:bg-destructive hover:text-white transition-colors"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </header>

      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2 p-1 bg-surface/50 border-2 border-border backdrop-blur-md">
          <button
            onClick={() => setShowAllDays(true)}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
              showAllDays 
              ? "bg-primary text-primary-foreground" 
              : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            TUDO
          </button>
          <div className="h-4 w-px bg-border mx-1" />
          {WEEKDAYS.map((d, i) => {
            const sel = !showAllDays && filterDay === i;
            const count = activities.filter((a) => a.weekday === i).length;
            return (
              <button
                key={i}
                onClick={() => { setShowAllDays(false); setFilterDay(i); }}
                className={`px-4 py-2 text-xs font-bold uppercase transition-all ${
                  sel 
                  ? "bg-primary/20 text-primary border-b-2 border-primary" 
                  : "text-muted-foreground hover:text-white"
                }`}
              >
                {d.short} {count > 0 && <span className="text-[10px] ml-1 opacity-50">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 space-y-4">
        {visible.length === 0 ? (
          <div className="card-brutal bg-surface/30 p-12 text-center">
            <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-border">
              <Plus size={24} className="text-muted-foreground" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2 uppercase">Nenhuma tarefa encontrada</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
              Adicione uma nova atividade para começar a resolver automaticamente.
            </p>
            <button
              onClick={() => setAdding(true)}
              className="btn-blood px-8 py-3"
            >
              CRIAR PRIMEIRA TAREFA
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {visible.map((a) => (
              <ActivityRow
                key={a.id}
                activity={a}
                open={openId === a.id}
                onToggle={() => setOpenId((p) => p === a.id ? null : a.id)}
                onSolve={() => solve(a)}
                onDelete={() => {
                  const next = activities.filter((x) => x.id !== a.id);
                  setActivities(next);
                  saveActivities(next);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {activities.length > 0 && (
        <div className="relative z-10 p-6 bg-surface border-2 border-border shadow-[4px_4px_0_0_var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Status do Sistema</span>
            <span className="text-xs font-mono font-bold text-primary">{totalDone}/{activities.length} COMPLETADO</span>
          </div>
          <div className="h-4 bg-background border-2 border-border p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 shadow-[0_0_15px_rgba(235,255,0,0.3)]"
              style={{ width: `${progress}%` }}
            />
          </div>
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
          onSave={(act) => {
            const next = [...activities, act];
            setActivities(next);
            saveActivities(next);
            setAdding(false);
          }}
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
    <div className="card-brutal rounded-none bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-surface-hover/50 transition-all text-left group"
      >
        <div className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
          <ChevronRight size={16} className="text-primary" />
        </div>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 shadow-inner"
          style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}
        >
          {meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold uppercase tracking-wide text-white group-hover:text-primary transition-colors">
            {activity.title}
          </h3>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            {meta.label} • {activity.questionIds.length} questões
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-surface-border overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: activity.status === "error" ? "var(--destructive)" : "var(--primary)",
                boxShadow: activity.status !== "pending" ? "0 0 10px var(--primary)" : "none"
              }}
            />
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t-2 border-border p-4 bg-surface/50 space-y-4 animate-in slide-in-from-top-2">
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase bg-surface text-foreground border border-border">
              {WEEKDAYS[activity.weekday].long}
            </span>
            {StatusIcon && (
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase flex items-center gap-1.5 ${
                activity.status === "done" ? "bg-primary/10 text-primary border border-primary/20" :
                activity.status === "error" ? "bg-destructive/10 text-destructive border border-destructive/20" :
                "bg-accent/10 text-accent border border-accent/20"
              }`}>
                <StatusIcon size={12} className={activity.status === "running" ? "animate-spin" : ""} />
                {activity.lastMessage || activity.status}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onSolve}
              disabled={activity.status === "running"}
              className="btn-blood flex-1 py-2 text-[11px] flex items-center justify-center gap-2"
            >
              {activity.status === "running" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              RESOLVER
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-2 rounded-none bg-surface border-2 border-border text-muted-foreground hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all"
            >
              <Trash2 size={14} />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="bg-surface border-4 border-foreground shadow-[12px_12px_0_0_rgba(0,0,0,0.5)] w-full max-w-md max-h-[90vh] overflow-auto animate-in zoom-in-95 duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b-2 border-border bg-muted/20">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">{title}</h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-destructive hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text"
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string, type?: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{label}</span>
      <input
        type={type}
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
        className="input-obsidian w-full px-4 py-3 text-sm focus:ring-0"
      />
    </label>
  );
}
        className="w-full bg-blood-muted border border-glass-border rounded-sm px-2 py-1.5 text-[11px] font-mono text-white placeholder:text-muted-foreground outline-none focus:border-primary/50"
      />
    </label>
  );
}
