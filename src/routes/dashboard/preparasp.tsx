import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, GraduationCap, Loader2, Plus,
  Trash2, KeyRound, CheckCircle2, AlertCircle, Play, X,
} from "lucide-react";
import { autoSolveQuiz, type PreparaSpAuth } from "@/lib/preparasp";
import {
  loadAuth, saveAuth, loadActivities, saveActivities,
  SUBJECTS, subjectMeta, WEEKDAYS, currentWeek, type Activity,
} from "@/lib/preparaspStore";
import { NotificationContainer, notify } from "@/components/Notification";

export const Route = createFileRoute("/dashboard/preparasp")({
  component: PreparaSpPage,
  head: () => ({ meta: [{ title: "Prepara SP - SYNC LABS HUB" }] }),
});

function PreparaSpPage() {
  // ───────── credenciais
  const [auth, setAuth] = useState<PreparaSpAuth | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  useEffect(() => {
    const a = loadAuth();
    setAuth(a);
    if (!a) setShowAuth(true);
  }, []);

  // ───────── semana + dia
  const [weekOffset, setWeekOffset] = useState(0);
  const today = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + weekOffset * 7); return d;
  }, [weekOffset]);
  const week = useMemo(() => currentWeek(today), [today]);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

  // ───────── atividades
  const [activities, setActivities] = useState<Activity[]>([]);
  useEffect(() => { setActivities(loadActivities()); }, []);
  const persist = (next: Activity[]) => { setActivities(next); saveActivities(next); };

  const dayActivities = activities.filter((a) => a.weekday === selectedDay);
  const subjectsCount = new Set(activities.map((a) => a.subject)).size;

  // ───────── add modal
  const [adding, setAdding] = useState(false);

  // ───────── solve
  const solve = useCallback(async (act: Activity) => {
    if (!auth) { notify("CONFIGURE OS TOKENS PRIMEIRO"); setShowAuth(true); return; }
    if (!act.quizId || act.questionIds.length === 0) {
      notify("ATIVIDADE SEM QUIZ_ID OU QUESTIONS"); return;
    }
    const upd = (patch: Partial<Activity>) =>
      persist(activities.map((x) => x.id === act.id ? { ...x, ...patch } : x));
    upd({ status: "running", lastMessage: "resolvendo…" });
    try {
      const { ok, fail } = await autoSolveQuiz(auth, act.quizId, act.questionIds);
      upd({
        status: fail === 0 ? "done" : "error",
        lastMessage: `${ok} ok · ${fail} falhas`,
      });
      notify(`${act.title.toUpperCase()} • ${ok} OK • ${fail} FALHAS`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      upd({ status: "error", lastMessage: msg });
      notify(msg.toUpperCase());
    }
  }, [auth, activities]);

  const solveAll = async () => {
    for (const a of dayActivities) if (a.status !== "done") await solve(a);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
        Home / <span className="text-foreground">Prepara SP</span>
      </p>

      {/* header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blood-muted border border-primary/20 rounded-sm flex items-center justify-center">
          <GraduationCap size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white font-mono uppercase tracking-[0.15em]">
            Prepara SP — Cronograma
          </h1>
          <p className="text-[9px] text-muted-foreground font-mono">
            Suas atividades organizadas por dia. Clique pra resolver.
          </p>
        </div>
        <button
          onClick={() => setShowAuth(true)}
          className="px-2.5 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-glass-border bg-blood-muted text-white hover:border-primary/40 transition-colors flex items-center gap-1.5"
        >
          <KeyRound size={11} /> Tokens {auth ? "✓" : "—"}
        </button>
      </div>

      {/* semana */}
      <div className="bg-card border border-glass-border rounded-sm p-4 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekOffset((v) => v - 1)}
            className="w-7 h-7 rounded-sm border border-glass-border bg-blood-muted hover:border-primary/40 flex items-center justify-center"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={14} className="text-white/70" />
          </button>
          <div className="flex-1">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">Semana</p>
            <p className="text-base font-bold text-white font-mono">
              {fmtRange(week[0], week[6])}
            </p>
          </div>
          <button
            onClick={() => setWeekOffset((v) => v + 1)}
            className="w-7 h-7 rounded-sm border border-glass-border bg-blood-muted hover:border-primary/40 flex items-center justify-center"
            aria-label="Próxima semana"
          >
            <ChevronRight size={14} className="text-white/70" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {week.map((d, i) => {
            const count = activities.filter((a) => a.weekday === i).length;
            const sel = selectedDay === i;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(i)}
                className={`p-2 rounded-sm border text-center transition-colors ${
                  sel
                    ? "border-primary bg-primary/15"
                    : "border-glass-border bg-blood-muted hover:border-primary/30"
                }`}
              >
                <div className={`text-[9px] font-mono tracking-widest ${sel ? "text-primary" : "text-muted-foreground"}`}>
                  {WEEKDAYS[i].short}
                </div>
                <div className="text-base font-bold text-white font-mono leading-tight mt-0.5">
                  {d.getDate()}
                </div>
                <div className="text-[8px] text-muted-foreground font-mono mt-0.5">
                  {count} at.
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 text-[9px] font-mono">
          <Chip color="#ef4444">{activities.length} atividades</Chip>
          <Chip color="#a855f7">{subjectsCount} matérias</Chip>
        </div>
      </div>

      {/* lista do dia */}
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white">
              {WEEKDAYS[selectedDay].long}, {week[selectedDay].getDate()} de {monthName(week[selectedDay])}
            </h2>
            <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest">
              {dayActivities.length} atividade{dayActivities.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex gap-2">
            {dayActivities.length > 0 && (
              <button
                onClick={solveAll}
                className="px-2.5 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-primary bg-primary/20 text-primary hover:bg-primary/30 flex items-center gap-1.5"
              >
                <Play size={11} /> Resolver tudo
              </button>
            )}
            <button
              onClick={() => setAdding(true)}
              className="px-2.5 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-glass-border bg-blood-muted text-white hover:border-primary/40 flex items-center gap-1.5"
            >
              <Plus size={11} /> Adicionar
            </button>
          </div>
        </div>

        {dayActivities.length === 0 ? (
          <div className="bg-blood-muted border border-dashed border-glass-border rounded-sm p-8 text-center">
            <p className="text-[11px] text-muted-foreground font-mono">
              Nenhuma atividade pra {WEEKDAYS[selectedDay].long.toLowerCase()}.
            </p>
            <button
              onClick={() => setAdding(true)}
              className="mt-3 px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-primary bg-primary/20 text-primary hover:bg-primary/30"
            >
              + Adicionar atividade
            </button>
          </div>
        ) : (
          dayActivities.map((a) => (
            <ActivityCard
              key={a.id}
              activity={a}
              onSolve={() => solve(a)}
              onDelete={() => persist(activities.filter((x) => x.id !== a.id))}
            />
          ))
        )}
      </div>

      {showAuth && (
        <AuthModal
          initial={auth}
          onClose={() => setShowAuth(false)}
          onSave={(a) => { setAuth(a); saveAuth(a); setShowAuth(false); notify("TOKENS SALVOS"); }}
        />
      )}

      {adding && (
        <AddActivityModal
          defaultDay={selectedDay}
          onClose={() => setAdding(false)}
          onSave={(act) => { persist([...activities, act]); setAdding(false); }}
        />
      )}

      <NotificationContainer />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border bg-blood-muted text-white"
      style={{ borderColor: `${color}55` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

function ActivityCard({
  activity, onSolve, onDelete,
}: { activity: Activity; onSolve: () => void; onDelete: () => void }) {
  const meta = subjectMeta(activity.subject);
  const statusLabel = {
    pending: "Não iniciado",
    running: "Resolvendo…",
    done: "Concluído",
    error: "Erro",
  }[activity.status];
  const StatusIcon = activity.status === "done"
    ? CheckCircle2
    : activity.status === "error"
    ? AlertCircle
    : activity.status === "running"
    ? Loader2
    : () => <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />;

  return (
    <div
      className="relative bg-card border border-glass-border rounded-sm overflow-hidden group"
      style={{ borderLeft: `3px solid ${meta.color}` }}
    >
      <div className="flex items-center gap-3 p-3">
        <div
          className="w-10 h-10 rounded-sm flex items-center justify-center text-xl shrink-0"
          style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}
        >
          {meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: meta.color }}>
            {meta.label}
          </p>
          <p className="text-sm font-bold text-white truncate">{activity.title}</p>
          <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
            <StatusIcon size={10} className={activity.status === "running" ? "animate-spin" : ""} />
            {statusLabel}{activity.lastMessage ? ` · ${activity.lastMessage}` : ""}
          </p>
        </div>
        <button
          onClick={onSolve}
          disabled={activity.status === "running"}
          className="px-2.5 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-primary bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 flex items-center gap-1.5"
        >
          {activity.status === "running"
            ? <Loader2 size={11} className="animate-spin" />
            : <Play size={11} />}
          Resolver
        </button>
        <button
          onClick={onDelete}
          className="w-7 h-7 rounded-sm border border-glass-border bg-blood-muted hover:border-red-500/40 hover:text-red-400 text-muted-foreground flex items-center justify-center transition-colors"
          aria-label="Remover"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
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
      <p className="text-[9px] text-muted-foreground font-mono mt-3">
        Pega no interceptor (PREPARASP.getKey) e cola aqui — fica salvo só no seu navegador.
      </p>
      <div className="flex gap-2 mt-4 justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-glass-border bg-blood-muted text-white"
        >Cancelar</button>
        <button
          onClick={submit}
          className="px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-primary bg-primary/20 text-primary hover:bg-primary/30"
        >Salvar</button>
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
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
            ))}
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
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
            question_ids (1 por linha)
          </span>
          <textarea
            value={ids} onChange={(e) => setIds(e.target.value)}
            className="w-full bg-blood-muted border border-glass-border rounded-sm px-2 py-1.5 text-[11px] font-mono text-white min-h-[90px] resize-y outline-none focus:border-primary/50"
            placeholder={"019c07f7-…\n019c07f7-…"}
          />
        </label>
      </div>
      <div className="flex gap-2 mt-4 justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-glass-border bg-blood-muted text-white"
        >Cancelar</button>
        <button
          onClick={submit}
          className="px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-primary bg-primary/20 text-primary hover:bg-primary/30"
        >Adicionar</button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-glass-border rounded-sm p-4 w-full max-w-md max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
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

// ──────────────────────────────────────────────────────────────
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS_SHORT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function monthName(d: Date) { return MONTHS[d.getMonth()]; }
function fmtRange(a: Date, b: Date) {
  const sameMonth = a.getMonth() === b.getMonth();
  const ay = a.getFullYear();
  return sameMonth
    ? `${a.getDate()} – ${b.getDate()} ${MONTHS_SHORT[a.getMonth()]} ${ay}`
    : `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${ay}`;
}
