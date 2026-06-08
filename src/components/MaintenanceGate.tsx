import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Scale } from "lucide-react";

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
      <div className="seizure-root relative min-h-screen w-full overflow-hidden bg-[#08080a] text-zinc-200 antialiased">
        {/* Background texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at top, rgba(180,30,30,0.35), transparent 60%), radial-gradient(ellipse at bottom, rgba(0,0,0,0.9), transparent 60%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 seizure-scanlines" />
        <div className="pointer-events-none absolute inset-0 seizure-vignette" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-between px-6 py-10">
          {/* Official seal */}
          <div className="flex flex-col items-center gap-3 pt-4">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-zinc-500/70 bg-black/60 shadow-[0_0_40px_rgba(180,30,30,0.25)]">
              <div className="absolute inset-1.5 rounded-full border border-zinc-600/60" />
              <Scale className="h-10 w-10 text-zinc-300" strokeWidth={1.4} />
            </div>
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-400">
                Notificação Oficial
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                Departamento de Conformidade · Setor Jurídico
              </div>
            </div>
          </div>

          {/* Red banner */}
          <div className="w-full max-w-2xl">
            <div className="relative overflow-hidden border-y-2 border-red-800/80 bg-gradient-to-r from-red-950 via-red-800 to-red-950 py-4 shadow-[0_0_30px_rgba(160,20,20,0.4)]">
              <div className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(0,0,0,0.4) 0 12px, transparent 12px 24px)",
                }}
              />
              <h1
                data-text="SERVIÇO TEMPORARIAMENTE SUSPENSO"
                className="seizure-glitch relative text-center font-mono text-base font-black uppercase tracking-[0.25em] text-white sm:text-xl"
              >
                SERVIÇO TEMPORARIAMENTE SUSPENSO
              </h1>
            </div>
          </div>

          {/* Body */}
          <div className="w-full max-w-2xl space-y-6 text-center">
            <p className="text-base leading-relaxed text-zinc-200 sm:text-lg">
              Este serviço encontra-se{" "}
              <span className="font-semibold text-red-400">
                temporariamente indisponível
              </span>{" "}
              em razão de procedimentos administrativos e jurídicos em
              andamento.
            </p>
            <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
              O acesso ao sistema foi preventivamente suspenso enquanto são
              realizadas as adequações necessárias. Novas informações poderão
              ser divulgadas pelos canais oficiais.
            </p>

            <div className="mx-auto flex max-w-md items-center gap-3 border border-zinc-700/60 bg-black/40 px-4 py-3 text-left">
              <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
              <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                Status: Suspenso · Procedimento em curso
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="w-full max-w-2xl border-t border-zinc-800 pt-6 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              Todos os direitos reservados.
            </div>
          </div>
        </div>

        <style>{`
          @keyframes seizure-glitch-1 {
            0%, 92%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
            93% { clip-path: inset(10% 0 75% 0); transform: translate(-2px, 0); }
            95% { clip-path: inset(60% 0 20% 0); transform: translate(2px, 0); }
            97% { clip-path: inset(30% 0 50% 0); transform: translate(-1px, 0); }
          }
          @keyframes seizure-glitch-2 {
            0%, 92%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
            94% { clip-path: inset(40% 0 40% 0); transform: translate(2px, 0); }
            96% { clip-path: inset(70% 0 10% 0); transform: translate(-2px, 0); }
          }
          @keyframes seizure-flicker {
            0%, 100% { opacity: 1; }
            96% { opacity: 1; }
            97% { opacity: 0.85; }
            98% { opacity: 1; }
            99% { opacity: 0.92; }
          }
          .seizure-root { animation: seizure-flicker 6s infinite; }
          .seizure-glitch { position: relative; }
          .seizure-glitch::before,
          .seizure-glitch::after {
            content: attr(data-text);
            position: absolute; inset: 0;
            pointer-events: none;
          }
          .seizure-glitch::before {
            color: #ff3b3b; mix-blend-mode: screen;
            animation: seizure-glitch-1 5s infinite steps(1);
          }
          .seizure-glitch::after {
            color: #3bd0ff; mix-blend-mode: screen;
            animation: seizure-glitch-2 5s infinite steps(1);
          }
          .seizure-scanlines {
            background-image: repeating-linear-gradient(
              to bottom,
              rgba(255,255,255,0.03) 0,
              rgba(255,255,255,0.03) 1px,
              transparent 1px,
              transparent 3px
            );
          }
          .seizure-vignette {
            background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%);
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}
