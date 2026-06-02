import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

const ADMIN_TOKEN_KEY = "sync_labs_admin_token";

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [maintenance, setMaintenance] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isAdmin =
    typeof window !== "undefined" && !!sessionStorage.getItem(ADMIN_TOKEN_KEY);
  const isStatusRoute = pathname.startsWith("/dashboard/status");

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
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-6 glass-strong rounded-2xl p-10 border border-surface-border">
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
              Estamos realizando melhorias no sistema. Volte em alguns instantes.
            </p>
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
