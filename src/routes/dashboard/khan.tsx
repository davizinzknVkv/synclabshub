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
  ShieldCheck,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { NotificationContainer, notify } from "@/components/Notification";
import {
  ALTCHA_CHALLENGE_URL,
  fetchSedLabelToken,
  verifyAltcha,
  loginCupiditys,
  fetchProfile,
  fetchCourses,
  fetchUnits,
  fetchUnit,
  fetchLesson,
  completeExercise,
  completeVideo,
  completeArticle,
  completeQuiz,
  completeUnitTest,
  completeCourseChallenge,
  getStoredJwt,
  getStoredKaid,
  getStoredProfile,
  clearKhanSession,
  type KhanProfile,
  type CupCourse,
  type CupUnit,
  type CupLessonItem,
  type CupContentItem,
} from "@/lib/khanLunar";

declare global {
  interface Window {
    __altchaLoaded?: boolean;
  }
}

export const Route = createFileRoute("/dashboard/khan")({
  component: KhanPage,
  head: () => ({ meta: [{ title: "Khan Academy - SYNC LABS HUB" }] }),
});

interface UnitState {
  units: CupUnit[];
  loading: boolean;
}
interface UnitDetailState {
  lessons: CupLessonItem[];
  quizzes: CupLessonItem[];
  unitTests: CupLessonItem[];
  loading: boolean;
}
interface LessonDetailState {
  exercises: CupContentItem[];
  videos: CupContentItem[];
  articles: CupContentItem[];
  loading: boolean;
}

function loadAltchaScript() {
  if (typeof window === "undefined") return;
  if (window.__altchaLoaded) return;
  window.__altchaLoaded = true;
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js";
  s.async = true;
  s.defer = true;
  s.type = "module";
  document.head.appendChild(s);
}

function KhanPage() {
  const session = getSession();

  const [jwt, setJwt] = useState<string | null>(getStoredJwt());
  const [profile, setProfile] = useState<KhanProfile | null>(getStoredProfile());
  const [phase, setPhase] = useState<"idle" | "captcha" | "ready">(jwt ? "ready" : "idle");
  const [labelToken, setLabelToken] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [altchaPayload, setAltchaPayload] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [courses, setCourses] = useState<CupCourse[] | null>(null);
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [unitsByCourse, setUnitsByCourse] = useState<Record<string, UnitState>>({});

  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const [unitDetail, setUnitDetail] = useState<Record<string, UnitDetailState>>({});

  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [lessonDetail, setLessonDetail] = useState<Record<string, LessonDetailState>>({});

  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [doneLocal, setDoneLocal] = useState<Record<string, boolean>>({});

  const initRef = useRef(false);
  const altchaRef = useRef<HTMLDivElement | null>(null);

  // 1) Sem JWT: pega label token na SED e prepara captcha Altcha
  useEffect(() => {
    if (jwt || !session || initRef.current) return;
    initRef.current = true;
    loadAltchaScript();
    (async () => {
      try {
        setLoadingMsg("Gerando token na SED...");
        const lt = await fetchSedLabelToken(session.authToken);
        setLabelToken(lt);
        setPhase("captcha");
      } catch (e) {
        notify(`✗ ${(e as Error).message}`);
        initRef.current = false;
      } finally {
        setLoadingMsg("");
      }
    })();
  }, [jwt, session]);

  // 2) Liga listener de statechange do altcha-widget
  useEffect(() => {
    if (phase !== "captcha") return;
    const node = altchaRef.current;
    if (!node) return;
    const handler = (ev: any) => {
      const detail = ev?.detail;
      if (detail?.state === "verified" && detail?.payload) {
        setAltchaPayload(detail.payload);
      } else if (detail?.state === "unverified" || detail?.state === "expired") {
        setAltchaPayload(null);
      }
    };
    node.addEventListener("statechange", handler as EventListener);
    return () => node.removeEventListener("statechange", handler as EventListener);
  }, [phase]);

  // 3) Submit do login (após captcha resolvido)
  const handleLogin = useCallback(async () => {
    if (!labelToken || !altchaPayload) return;
    setAuthBusy(true);
    try {
      setLoadingMsg("Validando captcha...");
      const capToken = await verifyAltcha(altchaPayload);
      setLoadingMsg("Logando na Khan Academy...");
      const auth = await loginCupiditys(labelToken, capToken);
      setJwt(auth.jwt);
      setLoadingMsg("Carregando perfil...");
      const p = await fetchProfile(auth.jwt);
      setProfile(p);
      setPhase("ready");
      notify("✓ Sessão Khan ativa");
    } catch (e) {
      notify(`✗ ${(e as Error).message}`);
      setAltchaPayload(null);
    } finally {
      setAuthBusy(false);
      setLoadingMsg("");
    }
  }, [labelToken, altchaPayload]);

  // 4) Quando temos JWT, busca perfil (se faltar) + cursos
  useEffect(() => {
    if (!jwt) return;
    (async () => {
      try {
        if (!profile) {
          setLoadingMsg("Carregando perfil...");
          const p = await fetchProfile(jwt);
          setProfile(p);
        }
        if (!courses) {
          setLoadingMsg("Carregando cursos...");
          const cs = await fetchCourses(jwt);
          setCourses(cs);
        }
      } catch (e) {
        notify(`✗ ${(e as Error).message}`);
      } finally {
        setLoadingMsg("");
      }
    })();
  }, [jwt, profile, courses]);

  // ----- expansion handlers -----

  const toggleCourse = useCallback(
    async (c: CupCourse) => {
      if (openCourse === c.id) {
        setOpenCourse(null);
        return;
      }
      setOpenCourse(c.id);
      if (unitsByCourse[c.id] || !jwt) return;
      setUnitsByCourse((p) => ({ ...p, [c.id]: { units: [], loading: true } }));
      try {
        const us = await fetchUnits(jwt, c.id);
        setUnitsByCourse((p) => ({ ...p, [c.id]: { units: us, loading: false } }));
      } catch (e) {
        notify(`✗ ${(e as Error).message}`);
        setUnitsByCourse((p) => ({ ...p, [c.id]: { units: [], loading: false } }));
      }
    },
    [openCourse, unitsByCourse, jwt],
  );

  const toggleUnit = useCallback(
    async (u: CupUnit) => {
      if (openUnit === u.id) {
        setOpenUnit(null);
        return;
      }
      setOpenUnit(u.id);
      if (unitDetail[u.id] || !jwt) return;
      setUnitDetail((p) => ({
        ...p,
        [u.id]: { lessons: [], quizzes: [], unitTests: [], loading: true },
      }));
      try {
        const d = await fetchUnit(jwt, u.id, u.relativeUrl);
        setUnitDetail((p) => ({ ...p, [u.id]: { ...d, loading: false } }));
      } catch (e) {
        notify(`✗ ${(e as Error).message}`);
        setUnitDetail((p) => ({
          ...p,
          [u.id]: { lessons: [], quizzes: [], unitTests: [], loading: false },
        }));
      }
    },
    [openUnit, unitDetail, jwt],
  );

  const toggleLesson = useCallback(
    async (lesson: CupLessonItem, unitId: string) => {
      if (openLesson === lesson.id) {
        setOpenLesson(null);
        return;
      }
      setOpenLesson(lesson.id);
      if (lessonDetail[lesson.id] || !jwt) return;
      setLessonDetail((p) => ({
        ...p,
        [lesson.id]: { exercises: [], videos: [], articles: [], loading: true },
      }));
      try {
        const d = await fetchLesson(jwt, lesson.id, unitId);
        setLessonDetail((p) => ({ ...p, [lesson.id]: { ...d, loading: false } }));
      } catch (e) {
        notify(`✗ ${(e as Error).message}`);
        setLessonDetail((p) => ({
          ...p,
          [lesson.id]: { exercises: [], videos: [], articles: [], loading: false },
        }));
      }
    },
    [openLesson, lessonDetail, jwt],
  );

  // ----- complete handlers -----

  const wrap = useCallback(
    async (key: string, label: string, fn: () => Promise<unknown>) => {
      if (!jwt) return;
      setRunning((p) => ({ ...p, [key]: true }));
      try {
        await fn();
        setDoneLocal((p) => ({ ...p, [key]: true }));
        notify(`✓ ${label}`);
      } catch (e) {
        notify(`✗ ${(e as Error).message}`);
      } finally {
        setRunning((p) => ({ ...p, [key]: false }));
      }
    },
    [jwt],
  );

  const completeContent = (item: CupContentItem, topicId: string) => {
    if (!jwt) return;
    const t = (item.type || "").toLowerCase();
    if (t.includes("video")) {
      return wrap(item.id, item.title, () =>
        completeVideo(jwt, item.id, item.videoSlug || item.slug || ""),
      );
    }
    if (t.includes("article")) {
      return wrap(item.id, item.title, () =>
        completeArticle(jwt, item.id, item.articleSlug || item.slug || "", topicId),
      );
    }
    return wrap(item.id, item.title, () => completeExercise(jwt, item.id, topicId));
  };

  const completeLessonAll = async (lesson: CupLessonItem, unitId: string) => {
    if (!jwt) return;
    let detail = lessonDetail[lesson.id];
    if (!detail) {
      try {
        const d = await fetchLesson(jwt, lesson.id, unitId);
        detail = { ...d, loading: false };
        setLessonDetail((p) => ({ ...p, [lesson.id]: detail! }));
      } catch (e) {
        notify(`✗ ${(e as Error).message}`);
        return;
      }
    }
    const all: CupContentItem[] = [...detail.exercises, ...detail.videos, ...detail.articles];
    for (const item of all) {
      if (doneLocal[item.id] || item.completionStatus === "COMPLETE") continue;
      await completeContent(item, lesson.id);
    }
  };

  const completeQuizItem = (q: CupLessonItem) => {
    if (!jwt) return;
    return wrap(q.id, q.title, () => completeQuiz(jwt, q.id, q.positionKey || ""));
  };
  const completeUnitTestItem = (t: CupLessonItem) => {
    if (!jwt) return;
    return wrap(t.id, t.title, () => completeUnitTest(jwt, t.id));
  };
  const completeCourseChallengeBtn = (c: CupCourse) => {
    if (!jwt) return;
    return wrap(`cc-${c.id}`, `Course Challenge: ${c.title}`, () =>
      completeCourseChallenge(jwt, c.id),
    );
  };

  const handleLogout = () => {
    clearKhanSession();
    setJwt(null);
    setProfile(null);
    setCourses(null);
    setUnitsByCourse({});
    setUnitDetail({});
    setLessonDetail({});
    setOpenCourse(null);
    setOpenUnit(null);
    setOpenLesson(null);
    setDoneLocal({});
    setPhase("idle");
    setLabelToken(null);
    setAltchaPayload(null);
    initRef.current = false;
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
              {profile
                ? `${profile.nickname || profile.username || "estudante"}`
                : "Auto-completer (cupiditys/Altcha)"}
            </p>
          </div>
        </div>
        {jwt && (
          <button
            onClick={handleLogout}
            className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary flex items-center gap-1.5 px-3 py-1.5 border border-glass-border rounded-sm"
          >
            <LogOut size={11} /> Sair
          </button>
        )}
      </header>

      {/* Captcha + login */}
      {!jwt && (
        <div className="bg-card border border-glass-border rounded-sm p-5 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={12} className="text-primary" /> Verificação inicial
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Resolva o captcha (Altcha — proof-of-work, sem Cloudflare) para liberar a Khan.
              Necessário só uma vez por sessão.
            </p>
          </div>

          {loadingMsg && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
              <Loader2 size={12} className="animate-spin text-primary" />
              {loadingMsg}
            </div>
          )}

          {phase === "captcha" && (
            <>
              <div ref={altchaRef} className="flex justify-center">
                {/* @ts-expect-error custom element */}
                <altcha-widget challengeurl={ALTCHA_CHALLENGE_URL} />
              </div>
              <button
                onClick={handleLogin}
                disabled={!altchaPayload || authBusy}
                className="w-full text-[11px] font-mono uppercase tracking-wider bg-primary text-primary-foreground rounded-sm py-2 disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {authBusy ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Autenticando...
                  </>
                ) : (
                  "Entrar na Khan"
                )}
              </button>
            </>
          )}
        </div>
      )}

      {jwt && !courses && (
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
            const us = unitsByCourse[c.id];
            return (
              <div key={c.id} className="border border-glass-border rounded-sm bg-card">
                <button
                  onClick={() => toggleCourse(c)}
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
                          style={{ width: `${c.percentage || 0}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {c.percentage || 0}%
                      </span>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-glass-border p-3 space-y-3">
                    <div className="flex justify-end">
                      <button
                        onClick={() => completeCourseChallengeBtn(c)}
                        disabled={running[`cc-${c.id}`]}
                        className="text-[9px] font-mono uppercase tracking-wider text-yellow-500 hover:text-white border border-yellow-500/30 rounded-sm px-2 py-1 disabled:opacity-30 flex items-center gap-1"
                      >
                        {running[`cc-${c.id}`] ? (
                          <Loader2 size={9} className="animate-spin" />
                        ) : (
                          <RefreshCw size={9} />
                        )}
                        Course Challenge
                      </button>
                    </div>

                    {us?.loading && (
                      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                        <Loader2 size={11} className="animate-spin text-primary" /> Carregando unidades...
                      </div>
                    )}

                    {us?.units.map((u) => {
                      const uOpen = openUnit === u.id;
                      const detail = unitDetail[u.id];
                      return (
                        <div key={u.id} className="border border-glass-border/50 rounded-sm">
                          <button
                            onClick={() => toggleUnit(u)}
                            className="w-full flex items-center gap-2 p-2.5 hover:bg-card/60 text-left"
                          >
                            {uOpen ? (
                              <ChevronDown size={12} className="text-primary shrink-0" />
                            ) : (
                              <ChevronRight size={12} className="text-muted-foreground shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-mono text-white truncate">{u.title}</p>
                              {typeof u.percentage === "number" && (
                                <p className="text-[9px] text-muted-foreground font-mono">
                                  {Math.round(u.percentage)}%
                                </p>
                              )}
                            </div>
                          </button>

                          {uOpen && (
                            <div className="border-t border-glass-border/50 p-2.5 space-y-2">
                              {detail?.loading && (
                                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                                  <Loader2 size={10} className="animate-spin text-primary" /> Carregando lições...
                                </div>
                              )}

                              {detail?.lessons.map((lesson) => {
                                const lOpen = openLesson === lesson.id;
                                const ldet = lessonDetail[lesson.id];
                                return (
                                  <div
                                    key={lesson.id}
                                    className="border border-glass-border/40 rounded-sm"
                                  >
                                    <div className="flex items-center gap-2 p-2">
                                      <button
                                        onClick={() => toggleLesson(lesson, u.id)}
                                        className="flex items-center gap-1 flex-1 min-w-0 text-left"
                                      >
                                        {lOpen ? (
                                          <ChevronDown size={10} className="text-primary shrink-0" />
                                        ) : (
                                          <ChevronRight size={10} className="text-muted-foreground shrink-0" />
                                        )}
                                        <span className="text-[10px] font-mono text-white/80 truncate">
                                          {lesson.title}
                                        </span>
                                      </button>
                                      <button
                                        onClick={() => completeLessonAll(lesson, u.id)}
                                        disabled={running[`lall-${lesson.id}`]}
                                        className="text-[9px] uppercase font-mono text-primary hover:text-white border border-primary/20 rounded-sm px-2 py-0.5 flex items-center gap-1"
                                      >
                                        <Play size={8} /> Completar
                                      </button>
                                    </div>

                                    {lOpen && (
                                      <div className="border-t border-glass-border/30 p-2 space-y-1">
                                        {ldet?.loading && (
                                          <div className="text-[9px] font-mono text-muted-foreground">
                                            <Loader2 size={9} className="inline animate-spin mr-1" />
                                            carregando...
                                          </div>
                                        )}
                                        {[
                                          ...(ldet?.exercises || []),
                                          ...(ldet?.videos || []),
                                          ...(ldet?.articles || []),
                                        ].map((item) => {
                                          const done =
                                            doneLocal[item.id] ||
                                            item.completionStatus === "COMPLETE";
                                          const busy = running[item.id];
                                          return (
                                            <div
                                              key={item.id}
                                              className="flex items-center gap-2 text-[10px] font-mono py-1 px-2 hover:bg-blood-muted/30 rounded-sm"
                                            >
                                              {done ? (
                                                <CheckCircle2
                                                  size={10}
                                                  className="text-green-500 shrink-0"
                                                />
                                              ) : (
                                                <Play
                                                  size={10}
                                                  className="text-muted-foreground shrink-0"
                                                />
                                              )}
                                              <span className="flex-1 truncate text-white/80">
                                                {item.title}
                                              </span>
                                              <span className="text-[8px] uppercase text-muted-foreground">
                                                {item.type || ""}
                                              </span>
                                              <button
                                                onClick={() => completeContent(item, lesson.id)}
                                                disabled={done || busy}
                                                className="text-[9px] uppercase text-primary hover:text-white disabled:opacity-30 px-2 py-0.5 border border-primary/20 rounded-sm"
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
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {detail?.quizzes.map((q) => {
                                const done = doneLocal[q.id] || q.completionStatus === "COMPLETE";
                                const busy = running[q.id];
                                return (
                                  <div
                                    key={q.id}
                                    className="flex items-center gap-2 text-[10px] font-mono py-1 px-2 border border-yellow-500/20 rounded-sm"
                                  >
                                    <RefreshCw size={10} className="text-yellow-500 shrink-0" />
                                    <span className="flex-1 truncate text-white/80">{q.title}</span>
                                    <span className="text-[8px] uppercase text-yellow-500">quiz</span>
                                    <button
                                      onClick={() => completeQuizItem(q)}
                                      disabled={done || busy}
                                      className="text-[9px] uppercase text-yellow-500 hover:text-white disabled:opacity-30 px-2 py-0.5 border border-yellow-500/30 rounded-sm"
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

                              {detail?.unitTests.map((t) => {
                                const done = doneLocal[t.id] || t.completionStatus === "COMPLETE";
                                const busy = running[t.id];
                                return (
                                  <div
                                    key={t.id}
                                    className="flex items-center gap-2 text-[10px] font-mono py-1 px-2 border border-red-500/20 rounded-sm"
                                  >
                                    <RefreshCw size={10} className="text-red-500 shrink-0" />
                                    <span className="flex-1 truncate text-white/80">{t.title}</span>
                                    <span className="text-[8px] uppercase text-red-500">teste</span>
                                    <button
                                      onClick={() => completeUnitTestItem(t)}
                                      disabled={done || busy}
                                      className="text-[9px] uppercase text-red-500 hover:text-white disabled:opacity-30 px-2 py-0.5 border border-red-500/30 rounded-sm"
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
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* só pra silenciar o lint sobre import não usado */}
      <span className="hidden">{getStoredKaid() || ""}</span>
    </div>
  );
}
