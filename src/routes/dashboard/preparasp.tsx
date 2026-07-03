import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Loader2, LogOut, Play, Plus, Trash2,
  ChevronRight, KeyRound, CheckCircle2, AlertCircle, X,
} from "lucide-react";
import { autoSolveQuiz, type PreparaSpAuth } from "@/lib/preparasp";
import {
  loadAuth, saveAuth, loadActivities, saveActivities,
  SUBJECTS, subjectMeta, WEEKDAYS, type Activity, type ActivityStatus,
} from "@/lib/preparaspStore";
import { NotificationContainer, notify } from "@/components/Notification";

export const Route = createFileRoute("/dashboard/preparasp")({
  component: PreparaSpPage,
  head: () => ({ meta: [{ title: "Prepara SP - FLUX HUB" }] }),
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
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10 bg-aurora min-h-screen">
      <div className="fixed inset-0 bg-grid-lines pointer-events-none opacity-20" />
      <NotificationContainer />

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-hero p-0.5 shadow-glow-violet rotate-[-3deg]">
            <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
              <GraduationCap size={32} className="text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
              PREPARA SP
            </h1>
            <p className="text-xs text-primary font-mono font-bold tracking-[0.3em] uppercase mt-2 opacity-80">
              {auth ? "SYSTEM_AUTHENTICATED" : "AUTH_PENDING"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setAdding(true)}
            className="btn-premium px-6 py-3 text-xs flex items-center gap-2 flex-1 md:flex-none justify-center"
          >
            <Plus size={18} /> NOVA TAREFA
          </button>
          <button
            onClick={() => setShowAuth(true)}
            className="px-6 py-3 glass hover:bg-surface rounded-xl border-surface-border text-xs font-black text-white transition-all flex items-center gap-2 flex-1 md:flex-none justify-center"
          >
            <KeyRound size={16} className="text-primary" /> TOKENS {auth ? "✓" : "—"}
          </button>
          {auth && (
            <button
              onClick={() => { saveAuth(null); setAuth(null); notify("TOKENS LIMPOS"); }}
              className="p-3 glass hover:bg-red-500/10 rounded-xl border-surface-border text-red-400 transition-colors"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2 p-2 glass rounded-2xl border-surface-border/50 backdrop-blur-xl">
          <button
            onClick={() => setShowAllDays(true)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all ${
              showAllDays 
              ? "bg-primary text-primary-foreground shadow-glow-violet" 
              : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            TUDO
          </button>
          <div className="h-4 w-px bg-surface-border mx-2" />
          {WEEKDAYS.map((d, i) => {
            const sel = !showAllDays && filterDay === i;
            const count = activities.filter((a) => a.weekday === i).length;
            return (
              <button
                key={i}
                onClick={() => { setShowAllDays(false); setFilterDay(i); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  sel 
                  ? "bg-primary/20 text-primary border border-primary/30" 
                  : "text-muted-foreground hover:text-white"
                }`}
              >
                {d.short} {count > 0 && <span className="text-[10px] ml-1 opacity-60 font-mono">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 space-y-4">
        {visible.length === 0 ? (
          <div className="glass p-20 text-center rounded-3xl border-dashed border-surface-border/40">
            <div className="w-20 h-20 bg-surface border border-surface-border rounded-2xl flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
              <Plus size={32} />
            </div>
            <h2 className="text-xl font-black text-white mb-3 uppercase tracking-tight">Nenhuma Atividade</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-8 leading-relaxed font-medium">
              Sua agenda está limpa. Adicione novas atividades do Prepara SP para começar.
            </p>
            <button
              onClick={() => setAdding(true)}
              className="btn-premium px-10 py-4"
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
        <div className="relative z-10 p-8 glass rounded-3xl border-surface-border/50 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">Progresso Global do Sistema</span>
            <span className="text-xs font-mono font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 shadow-glow-violet/20">
              {totalDone}/{activities.length} FINALIZADAS
            </span>
          </div>
          <div className="h-2.5 bg-surface border border-surface-border rounded-full p-0.5 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-gradient-primary rounded-full shadow-glow-violet relative"
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </motion.div>
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
const ActivityRow = memo(({
  activity, open, onToggle, onSolve, onDelete,
}: {
  activity: Activity; open: boolean;
  onToggle: () => void; onSolve: () => void; onDelete: () => void;
}) => {
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
    <div className="card-premium overflow-hidden border-surface-border/50 group">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-5 p-5 hover:bg-surface/50 transition-all text-left"
      >
        <div className={`transition-transform duration-300 ${open ? "rotate-90" : ""}`}>
          <ChevronRight size={18} className="text-primary" />
        </div>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner relative overflow-hidden"
          style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}35` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          {meta.emoji}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="text-base font-bold text-white tracking-tight group-hover:text-primary transition-colors">
            {activity.title}
          </h3>
          <p className="text-[10px] font-black font-mono text-muted-foreground uppercase tracking-[0.2em] opacity-60">
            {meta.label} • {activity.questionIds.length} QUESTÕES
          </p>
          <div className="mt-3 h-1 rounded-full bg-surface border border-surface-border overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              className="h-full transition-all duration-700"
              style={{
                background: activity.status === "error" ? "var(--destructive)" : "var(--gradient-primary)",
                boxShadow: activity.status !== "pending" ? "0 0 12px oklch(0.66 0.24 280 / 0.4)" : "none"
              }}
            />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-surface-border/50 bg-surface/30 backdrop-blur-sm overflow-hidden"
          >
            <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-xl text-[10px] font-black font-mono uppercase tracking-widest bg-surface text-foreground border border-surface-border">
                  {WEEKDAYS[activity.weekday].long}
                </span>
                {StatusIcon && (
                  <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black font-mono uppercase tracking-widest flex items-center gap-2 ${
                    activity.status === "done" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    activity.status === "error" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                    "bg-primary/10 text-primary border border-primary/20"
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
                  className="btn-premium flex-1 py-3 text-xs flex items-center justify-center gap-3"
                >
                  {activity.status === "running" ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  INICIAR RESOLUÇÃO
                </button>
                <button
                  onClick={onDelete}
                  className="p-3 glass hover:bg-red-500/10 rounded-xl border-surface-border text-red-400 transition-all hover:border-red-500/40"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

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
