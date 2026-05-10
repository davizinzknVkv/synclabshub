import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, ExternalLink, Loader2, LogIn } from "lucide-react";
import { getSession } from "@/lib/auth";
import { NotificationContainer, notify } from "@/components/Notification";

const KHAN_LUNAR = "https://khan.crimsonzerohub.xyz";
const EDUSP = "https://edusp-api.ip.tv";

export const Route = createFileRoute("/dashboard/khan")({
  component: KhanPage,
  head: () => ({ meta: [{ title: "Khan Academy - SYNC LABS HUB" }] }),
});

async function getKhanLabelToken(authToken: string): Promise<string> {
  const r = await fetch(
    `${EDUSP}/mas/external-auth/seducsp_token/generate?card_label=Khan+Academy`,
    { headers: { "x-api-key": authToken, Accept: "application/json" } },
  );
  const text = await r.text();
  if (!r.ok) throw new Error(`SED retornou HTTP ${r.status}`);
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {}
  const token =
    data?.token ||
    data?.access_token ||
    (typeof data?.redirect === "string" ? new URL(data.redirect).searchParams.get("token") : null);
  if (!token) throw new Error("Token Khan não retornado pela SED");
  return token as string;
}

function KhanPage() {
  const session = getSession();
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    if (!session) return;
    setLoading(true);
    try {
      notify("Solicitando token na SED...");
      const token = await getKhanLabelToken(session.authToken);
      const url = `${KHAN_LUNAR}/?token=${encodeURIComponent(token)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      notify("✓ Khan Lunar aberto em nova aba");
    } catch (e) {
      notify(`✗ ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
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
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      <NotificationContainer />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-sm bg-blood-muted border border-primary/20 flex items-center justify-center">
          <GraduationCap size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-medium text-white tracking-tight font-mono uppercase">
            Khan Academy
          </h1>
          <p className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">
            Acesso via Khan Lunar
          </p>
        </div>
      </div>

      <div className="bg-card border border-glass-border rounded-sm p-5 space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-mono text-white uppercase tracking-wider">
            Entrar na Khan Academy
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Usamos seu login da Sala do Futuro para gerar um token de acesso e abrir o{" "}
            <span className="text-primary">Khan Lunar</span>, que faz login automático na sua conta
            da Khan Academy. No primeiro acesso pode aparecer uma verificação de segurança rápida.
          </p>
        </div>

        <button
          onClick={handleOpen}
          disabled={loading}
          className="w-full bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-sm py-2.5 px-4 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={14} className="text-primary animate-spin" />
          ) : (
            <LogIn size={14} className="text-primary" />
          )}
          <span className="text-xs font-mono text-white uppercase tracking-wider">
            {loading ? "Gerando token..." : "Abrir Khan Academy"}
          </span>
        </button>

        <a
          href={KHAN_LUNAR}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-mono text-muted-foreground hover:text-primary uppercase tracking-wider flex items-center gap-1.5 justify-center"
        >
          <ExternalLink size={10} /> khan.crimsonzerohub.xyz
        </a>
      </div>
    </div>
  );
}
