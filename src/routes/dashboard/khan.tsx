import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  GraduationCap,
  Loader2,
  LogOut,
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { NotificationContainer, notify } from "@/components/Notification";
import {
  TURNSTILE_SITEKEYS,
  fetchSedLabelToken,
  validateCaptcha,
  redeemCookies,
  fetchProfile,
  fetchClasses,
  fetchCourseProgresses,
  fetchContentForPath,
  fetchUnitMastery,
  buildActivities,
  getAncestorIds,
  startActivity,
  pollJob,
  getCaptchaToken,
  getStoredCookies,
  clearKhanSession,
  type KhanCookies,
  type KhanUser,
  type KhanActivity,
} from "@/lib/khanLunar";

declare global {
  interface Window {
    turnstile?: any;
    onKhanTurnstileReady?: () => void;
  }
}

export const Route = createFileRoute("/dashboard/khan")({
  component: KhanPage,
  head: () => ({ meta: [{ title: "Khan Academy - SYNC LABS HUB" }] }),
});

interface CourseEntry {
  id: string;
  title: string;
  iconPath?: string;
  relativeUrl?: string;
  progress?: number;
}

interface UnitData {
  id: string;
  title: string;
  percentage: number;
  activities: KhanActivity[];
}

function KhanPage() {
  const session = getSession();
  const [phase, setPhase] = useState<"idle" | "captcha" | "ready">("idle");
  const [cookies, setCookiesState] = useState<KhanCookies | null>(getStoredCookies());
  const [user, setUser] = useState<KhanUser | null>(null);
  const [labelToken, setLabelToken] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [courses, setCourses] = useState<CourseEntry[] | null>(null);
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [unitsByCourse, setUnitsByCourse] = useState<Record<string, UnitData[]>>({});
  const [courseDataMap, setCourseDataMap] = useState<Record<string, any>>({});
  const [unitsLoading, setUnitsLoading] = useState<string | null>(null);
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const turnstileWidgetId = useRef<string | null>(null);
  const turnstileMounted = useRef(false);

  // 1) Se não tem cookies, prepara label token + carrega Turnstile
  useEffect(() => {
    if (cookies || !session) return;
    if (turnstileMounted.current) return;
    turnstileMounted.current = true;

    (async () => {
      try {
        setLoadingMsg("Gerando token na SED...");
        const lt = await fetchSedLabelToken(session.authToken);
        setLabelToken(lt);
        setPhase("captcha");

        // injeta script Turnstile
        if (!document.querySelector("script[data-khan-turnstile]")) {
          const s = document.createElement("script");
          s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onKhanTurnstileReady";
          s.async = true;
          s.defer = true;
          s.setAttribute("data-khan-turnstile", "1");
          document.head.appendChild(s);
        }

        let solved = false;
        const tryRedeem = async (cfToken: string, sitekey: string) => {
          if (solved) return;
          solved = true;
          try {
            setLoadingMsg(`Validando captcha (${sitekey.slice(-6)})...`);
            const { token: capToken } = await validateCaptcha(cfToken);
            setLoadingMsg("Resgatando sessão Khan...");
            const newCookies = await redeemCookies(lt, capToken);
            setCookiesState(newCookies);
            setPhase("ready");
            notify("✓ Sessão Khan ativa");
          } catch (e) {
            const msg = (e as Error).message;
            notify(`✗ ${msg}`);
            // se falhou (ex: 403 no /token), permite tentar o outro captcha
            solved = false;
            try { window.turnstile?.reset(); } catch {}
          } finally {
            setLoadingMsg("");
          }
        };

        window.onKhanTurnstileReady = () => {
          if (!window.turnstile) return;
          for (const { key, label } of TURNSTILE_SITEKEYS) {
            const el = document.getElementById(`khan-turnstile-${key}`);
            if (!el || el.dataset.rendered === "1") continue;
            el.dataset.rendered = "1";
            window.turnstile.render(el, {
              sitekey: key,
              theme: "dark",
              callback: (cfToken: string) => tryRedeem(cfToken, key),
              "error-callback": () => notify(`✗ Falha no ${label}`),
            });
          }
        };

        // se script já estava carregado
        if (window.turnstile) window.onKhanTurnstileReady?.();
      } catch (e) {
        notify(`✗ ${(e as Error).message}`);
        turnstileMounted.current = false;
      }
    })();
  }, [cookies, session]);

  // 2) Quando temos cookies, busca perfil + cursos
  useEffect(() => {
    if (!cookies || user) return;
    (async () => {
      try {
        setLoadingMsg("Carregando perfil...");
        const u = await fetchProfile(cookies);
        setUser(u);
        setLoadingMsg("Carregando cursos...");
        const topics = await fetchClasses(cookies, u.kaid);
        const ids = topics.map((t) => t.id);
        let progressMap: Record<string, number> = {};
        if (ids.length) {
          const prog = await fetchCourseProgresses(cookies, ids);
          for (const p of prog) {
            const id = p?.topic?.id;
            if (id) progressMap[id] = Math.round(p?.currentMastery?.percentage || 0);
          }
        }
        setCourses(
          topics.map((t) => ({
            id: t.id,
            title: t.translatedTitle || t.title,
            iconPath: (t as any).iconPath,
            relativeUrl: t.relativeUrl,
            progress: progressMap[t.id] ?? 0,
          })),
        );
        setLoadingMsg("");
      } catch (e) {
        notify(`✗ ${(e as Error).message}`);
        setLoadingMsg("");
      }
    })();
  }, [cookies, user]);

  const loadCourseDetail = useCallback(
    async (course: CourseEntry) => {
      if (!cookies || !course.relativeUrl) return;
      if (unitsByCourse[course.id]) return;
      setUnitsLoading(course.id);
      try {
        const courseData = await fetchContentForPath(cookies, course.relativeUrl);
        if (!courseData) throw new Error("Curso sem dados");
        setCourseDataMap((p) => ({ ...p, [course.id]: courseData }));

        const prog = await fetchCourseProgresses(cookies, [course.id]);
        const unitProgresses =
          prog.find((p: any) => p?.topic?.id === course.id)?.unitProgresses || [];

        const units: UnitData[] = [];
        for (const up of unitProgresses) {
          const unitId = up?.topic?.id;
          if (!unitId) continue;
          const mastery = await fetchUnitMastery(cookies, unitId);
          units.push({
            id: unitId,
            title: up?.topic?.title || "Unidade",
            percentage: Math.round(up?.currentMastery?.percentage || 0),
            activities: buildActivities(courseData, unitId, mastery),
          });
        }
        setUnitsByCourse((p) => ({ ...p, [course.id]: units }));
      } catch (e) {
        notify(`✗ ${(e as Error).message}`);
      } finally {
        setUnitsLoading(null);
      }
    },
    [cookies, unitsByCourse],
  );

  const completeActivity = useCallback(
    async (courseId: string, act: KhanActivity) => {
      if (!cookies) return;
      const courseData = courseDataMap[courseId];
      if (!courseData) return;
      const ancestorIds = getAncestorIds(courseData, act.id);
      if (!ancestorIds) {
        notify("✗ Hierarquia não encontrada");
        return;
      }
      const captcha = getCaptchaToken();
      if (!captcha) {
        notify("✗ Captcha expirado, recarregue a página");
        return;
      }
      setRunning((p) => ({ ...p, [act.id]: true }));
      try {
        notify(`Iniciando: ${act.title}`);
        const jobId = await startActivity({
          cookies,
          exerciseId: act.id,
          ancestorIds,
          isTest: act.isTest,
          captchaToken: captcha,
        });
        await pollJob(jobId);
        notify(`✓ Concluído: ${act.title}`);
        // marca atividade como concluída localmente
        setUnitsByCourse((prev) => {
          const list = prev[courseId];
          if (!list) return prev;
          return {
            ...prev,
            [courseId]: list.map((u) => ({
              ...u,
              activities: u.activities.map((a) =>
                a.id === act.id ? { ...a, status: "MASTERED" } : a,
              ),
            })),
          };
        });
      } catch (e) {
        notify(`✗ ${(e as Error).message}`);
      } finally {
        setRunning((p) => ({ ...p, [act.id]: false }));
      }
    },
    [cookies, courseDataMap],
  );

  const completeUnit = useCallback(
    async (courseId: string, unit: UnitData) => {
      const pending = unit.activities.filter((a) => a.status !== "MASTERED");
      for (const act of pending) {
        await completeActivity(courseId, act);
      }
    },
    [completeActivity],
  );

  const handleLogout = () => {
    clearKhanSession();
    setCookiesState(null);
    setUser(null);
    setCourses(null);
    setUnitsByCourse({});
    setCourseDataMap({});
    setOpenCourse(null);
    setPhase("idle");
    turnstileMounted.current = false;
    notify("Sessão Khan limpa");
  };

  if (!session) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-xs text-muted-foreground font-mono uppercase">
          Faça login na SED primeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <NotificationContainer />

      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-blood-muted border border-primary/20 flex items-center justify-center">
            <GraduationCap size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-medium text-white tracking-tight font-mono uppercase">
              Khan Academy
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">
              {user ? `${user.nickname || user.username || "estudante"}` : "Auto-completer integrado"}
            </p>
          </div>
        </div>
        {cookies && (
          <button
            onClick={handleLogout}
            className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary flex items-center gap-1.5 px-3 py-1.5 border border-glass-border rounded-sm"
          >
            <LogOut size={11} /> Sair
          </button>
        )}
      </header>

      {!cookies && (
        <div className="bg-card border border-glass-border rounded-sm p-5 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-mono text-white uppercase tracking-wider">
              Verificação inicial
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Resolva o captcha abaixo para liberar o acesso à Khan Academy. Isso é necessário só
              uma vez por sessão.
            </p>
          </div>

          {loadingMsg && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
              <Loader2 size={12} className="animate-spin text-primary" />
              {loadingMsg}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-center">
              Resolva qualquer um dos captchas abaixo
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              {TURNSTILE_SITEKEYS.map(({ key, label }) => (
                <div key={key} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">{label}</span>
                  <div id={`khan-turnstile-${key}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {cookies && !courses && (
        <div className="bg-card border border-glass-border rounded-sm p-5 flex items-center gap-2">
          <Loader2 size={14} className="text-primary animate-spin" />
          <span className="text-xs font-mono text-muted-foreground">
            {loadingMsg || "Carregando..."}
          </span>
        </div>
      )}

      {courses && courses.length === 0 && (
        <div className="bg-card border border-glass-border rounded-sm p-5">
          <p className="text-xs font-mono text-muted-foreground uppercase">
            Nenhum curso vinculado encontrado.
          </p>
        </div>
      )}

      {courses && courses.length > 0 && (
        <div className="space-y-2">
          {courses.map((c) => {
            const isOpen = openCourse === c.id;
            const units = unitsByCourse[c.id];
            return (
              <div key={c.id} className="border border-glass-border rounded-sm bg-card">
                <button
                  onClick={() => {
                    setOpenCourse(isOpen ? null : c.id);
                    if (!isOpen) loadCourseDetail(c);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-card/80 transition-colors text-left"
                >
                  {isOpen ? (
                    <ChevronDown size={14} className="text-primary shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                  )}
                  {c.iconPath && (
                    <img
                      src={c.iconPath}
                      alt=""
                      className="w-7 h-7 rounded-sm"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-white uppercase tracking-wider truncate">
                      {c.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-blood-muted rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${c.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {c.progress || 0}%
                      </span>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-glass-border p-3 space-y-3">
                    {unitsLoading === c.id && !units && (
                      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                        <Loader2 size={11} className="animate-spin text-primary" /> Carregando unidades...
                      </div>
                    )}
                    {units?.map((u) => (
                      <div key={u.id} className="border border-glass-border/50 rounded-sm p-2.5">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-mono text-white truncate">{u.title}</p>
                            <p className="text-[9px] text-muted-foreground font-mono">
                              {u.percentage}% • {u.activities.length} atividades
                            </p>
                          </div>
                          <button
                            onClick={() => completeUnit(c.id, u)}
                            disabled={u.activities.every((a) => a.status === "MASTERED")}
                            className="text-[9px] font-mono uppercase tracking-wider text-primary hover:text-white border border-primary/30 rounded-sm px-2 py-1 disabled:opacity-30 flex items-center gap-1"
                          >
                            <Play size={9} /> Completar tudo
                          </button>
                        </div>
                        <div className="space-y-1">
                          {u.activities.map((a) => {
                            const done = a.status === "MASTERED";
                            const busy = running[a.id];
                            return (
                              <div
                                key={a.id}
                                className="flex items-center gap-2 text-[10px] font-mono py-1 px-2 hover:bg-blood-muted/30 rounded-sm"
                              >
                                {done ? (
                                  <CheckCircle2 size={11} className="text-green-500 shrink-0" />
                                ) : a.isTest ? (
                                  <RefreshCw size={11} className="text-yellow-500 shrink-0" />
                                ) : (
                                  <Play size={11} className="text-muted-foreground shrink-0" />
                                )}
                                <span className="flex-1 truncate text-white/80">{a.title}</span>
                                {a.isTest && (
                                  <span className="text-[8px] text-yellow-500 uppercase">teste</span>
                                )}
                                <button
                                  onClick={() => completeActivity(c.id, a)}
                                  disabled={done || busy}
                                  className="text-[9px] uppercase text-primary hover:text-white disabled:opacity-30 px-2 py-0.5 border border-primary/20 rounded-sm flex items-center gap-1"
                                >
                                  {busy ? (
                                    <Loader2 size={9} className="animate-spin" />
                                  ) : done ? (
                                    "ok"
                                  ) : (
                                    "completar"
                                  )}
                                </button>
                              </div>
                            );
                          })}
                          {u.activities.length === 0 && (
                            <p className="text-[10px] text-muted-foreground font-mono italic">
                              Sem atividades disponíveis
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
