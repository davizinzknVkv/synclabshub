import { useEffect, useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

const ADMIN_TOKEN_KEY = "sync_labs_admin_token";

function getNextFriday1830(): Date {
  const now = new Date();
  const target = new Date(now);
  const day = now.getDay(); // 0=Sun ... 5=Fri
  let diff = (5 - day + 7) % 7;
  target.setHours(18, 30, 0, 0);
  if (diff === 0 && target.getTime() <= now.getTime()) diff = 7;
  target.setDate(now.getDate() + diff);
  return target;
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, done: diff === 0 };
}

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [maintenance, setMaintenance] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isAdmin =
    typeof window !== "undefined" && !!sessionStorage.getItem(ADMIN_TOKEN_KEY);
  const isStatusRoute = pathname.startsWith("/dashboard/status");

  const target = useMemo(() => getNextFriday1830(), []);
  const { d, h, m, s } = useCountdown(target);

  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const data = (await res.json()) as {
          settings?: { maintenance_mode?: boolean };
        };
        if (active) {
          setMaintenance(!!data.settings?.maintenance_mode);
          setLoaded(true);
        }
      } catch {
        if (active) setLoaded(true);
      }
    };
    fetchSettings();
    const interval = setInterval(fetchSettings, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (loaded && maintenance && !isAdmin && !isStatusRoute) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const units: Array<{ label: string; value: string }> = [
      { label: "DIAS", value: pad(d) },
      { label: "HRS", value: pad(h) },
      { label: "MIN", value: pad(m) },
      { label: "SEG", value: pad(s) },
    ];
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-lg w-full text-center space-y-7 glass-strong rounded-2xl p-10 border border-surface-border">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-primary p-0.5 shadow-glow-violet">
            <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Site em Manutenção
            </h1>
            <p className="text-sm text-muted-foreground">
              Estamos realizando melhorias. Voltamos na <span className="text-primary font-semibold">sexta-feira às 18:30</span>.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {units.map((u) => (
              <div
                key={u.label}
                className="rounded-xl border border-surface-border bg-surface/50 py-4 px-2"
              >
                <div className="text-3xl font-black text-white tracking-tight tabular-nums">
                  {u.value}
                </div>
                <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {u.label}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            Sync Labs Hub
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
