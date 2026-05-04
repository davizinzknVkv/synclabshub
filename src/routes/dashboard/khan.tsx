import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GraduationCap,
  LogIn,
  Loader2,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { NotificationContainer, notify } from "@/components/Notification";
import {
  khanLogin,
  khanCourses,
  khanUnits,
  completeUnit,
  loadKhanSession,
  saveKhanSession,
  type KhanCourse,
  type KhanUnit,
  type KhanSession,
} from "@/lib/khan";

export const Route = createFileRoute("/dashboard/khan")({
  component: KhanPage,
  head: () => ({ meta: [{ title: "Khan Academy - SYNC LABS HUB" }] }),
});

function KhanPage() {
  const session = getSession();
  const [khan, setKhan] = useState<KhanSession | null>(loadKhanSession());
  const [logging, setLogging] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [courses, setCourses] = useState<KhanCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [units, setUnits] = useState<KhanUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const log = useCallback((m: string) => {
    setLogs((l) => [...l.slice(-200), `[${new Date().toLocaleTimeString()}] ${m}`]);
    notify(m);
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logs]);

  const handleLogin = async () => {
    if (!session) return;
    setLogging(true);
    try {
      log("Solicitando token Khan na SED...");
      const s = await khanLogin(session.authToken);
      setKhan(s);
      log("✓ Conectado ao Khan Academy");
    } catch (e) {
      log(`✗ Login falhou: ${(e as Error).message}`);
    } finally {
      setLogging(false);
    }
  };

  const handleLoadCourses = async () => {
    if (!khan) return;
    setLoadingCourses(true);
    setCourses([]);
    setUnits([]);
    setSelectedCourse("");
    try {
      const c = await khanCourses(khan.bearer);
      setCourses(c);
      log(`${c.length} cursos carregados`);
    } catch (e) {
      log(`✗ ${(e as Error).message}`);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleLoadUnits = async (courseId: string) => {
    if (!khan) return;
    setSelectedCourse(courseId);
    setLoadingUnits(true);
    setUnits([]);
    try {
      const u = await khanUnits(khan.bearer, courseId);
      setUnits(u);
      log(`${u.length} unidades carregadas`);
    } catch (e) {
      log(`✗ ${(e as Error).message}`);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleRunAll = async () => {
    if (!khan || units.length === 0) return;
    setRunning(true);
    let ok = 0;
    let fail = 0;
    try {
      const course = courses.find((c) => c.id === selectedCourse) || courses[0];
      for (const u of units) {
        const p = await completeUnit(khan.bearer, course, u, log);
        ok += p.ok;
        fail += p.failed;
      }
      log(`✓ FIM — ${ok} concluídos, ${fail} falhas`);
    } catch (e) {
      log(`✗ ${(e as Error).message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleRunUnit = async (unit: KhanUnit) => {
    if (!khan) return;
    setRunning(true);
    try {
      const course = courses.find((c) => c.id === selectedCourse) || courses[0];
      const p = await completeUnit(khan.bearer, course, unit, log);
      log(`✓ ${unit.title || unit.id}: ${p.ok}/${p.total}`);
    } catch (e) {
      log(`✗ ${(e as Error).message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleLogout = () => {
    saveKhanSession(null);
    setKhan(null);
    setCourses([]);
    setUnits([]);
    setSelectedCourse("");
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

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-blood-muted border border-primary/20 flex items-center justify-center">
            <GraduationCap size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-medium text-white tracking-tight font-mono uppercase">
              Khan Academy
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">
              Resolução automática
            </p>
          </div>
        </div>
        {khan && (
          <button
            onClick={handleLogout}
            className="text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 border border-glass-border rounded-sm text-muted-foreground hover:text-white"
          >
            Desconectar Khan
          </button>
        )}
      </div>

      {/* Login */}
      {!khan ? (
        <div className="bg-card border border-glass-border rounded-sm p-5 space-y-3">
          <p className="text-xs font-mono text-white uppercase tracking-wider">
            Conectar ao Khan via SED
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Vamos usar seu login da Sala do Futuro pra gerar um token Khan automaticamente. Você
            não precisa entrar com email/senha do Khan.
          </p>
          <button
            onClick={handleLogin}
            disabled={logging}
            className="w-full bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-sm py-2.5 px-4 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {logging ? (
              <Loader2 size={14} className="text-primary animate-spin" />
            ) : (
              <LogIn size={14} className="text-primary" />
            )}
            <span className="text-xs font-mono text-white uppercase tracking-wider">
              {logging ? "Conectando..." : "Conectar Khan Academy"}
            </span>
          </button>
        </div>
      ) : (
        <>
          {/* Cursos */}
          <div className="bg-card border border-glass-border rounded-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-white uppercase tracking-wider">Cursos</p>
              <button
                onClick={handleLoadCourses}
                disabled={loadingCourses}
                className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-1.5 border border-primary/30 rounded-sm text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                {loadingCourses ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                {courses.length === 0 ? "Carregar" : "Atualizar"}
              </button>
            </div>
            {courses.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleLoadUnits(c.id)}
                    className={`text-left text-[11px] font-mono p-2.5 rounded-sm border transition-colors ${
                      selectedCourse === c.id
                        ? "border-primary bg-blood-muted text-primary"
                        : "border-glass-border bg-blood-muted/40 text-muted-foreground hover:text-white hover:border-primary/30"
                    }`}
                  >
                    <span className="block truncate">{c.title || c.slug || c.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Unidades */}
          {selectedCourse && (
            <div className="bg-card border border-glass-border rounded-sm p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-mono text-white uppercase tracking-wider">
                  Unidades ({units.length})
                </p>
                {units.length > 0 && (
                  <button
                    onClick={handleRunAll}
                    disabled={running}
                    className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 border border-primary bg-blood-muted rounded-sm text-primary hover:bg-primary/15 disabled:opacity-50"
                  >
                    {running ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Play size={12} />
                    )}
                    Resolver tudo
                  </button>
                )}
              </div>

              {loadingUnits ? (
                <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  Carregando unidades...
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {units.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center gap-2 p-2 bg-blood-muted/40 border border-glass-border rounded-sm"
                    >
                      <span className="flex-1 text-[11px] font-mono text-white truncate">
                        {u.title || u.id}
                      </span>
                      <button
                        onClick={() => handleRunUnit(u)}
                        disabled={running}
                        className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 border border-primary/30 rounded-sm text-primary hover:bg-primary/10 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Play size={10} /> Resolver
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="bg-card border border-glass-border rounded-sm p-4 space-y-2">
              <p className="text-xs font-mono text-white uppercase tracking-wider">Console</p>
              <div
                ref={logRef}
                className="bg-blood-muted/60 border border-glass-border rounded-sm p-2 max-h-64 overflow-auto font-mono text-[10px] text-muted-foreground space-y-0.5"
              >
                {logs.map((l, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    {l.includes("✓") ? (
                      <CheckCircle2 size={10} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    ) : l.includes("✗") ? (
                      <XCircle size={10} className="text-red-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <span className="w-2.5 flex-shrink-0" />
                    )}
                    <span className="break-all">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
