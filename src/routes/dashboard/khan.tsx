import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  GraduationCap,
  Upload,
  CheckCircle2,
  AlertCircle,
  Network,
  MousePointerClick,
  Save,
  Send,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { NotificationContainer, notify } from "@/components/Notification";

export const Route = createFileRoute("/dashboard/khan")({
  component: KhanPage,
  head: () => ({
    meta: [{ title: "Khan Academy - SYNC LABS HUB" }],
  }),
});

interface CapturedRequest {
  url: string;
  method: string;
  status?: number;
  hasAuth: boolean;
  isGraphQL: boolean;
  graphqlOp?: string;
}

interface HarSummary {
  totalRequests: number;
  khanRequests: CapturedRequest[];
  graphqlOps: string[];
  hasLogin: boolean;
}

function KhanPage() {
  const [analyzing, setAnalyzing] = useState(false);
  const [summary, setSummary] = useState<HarSummary | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "sent" | "error">("idle");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const analyzeHar = async (file: File) => {
    setAnalyzing(true);
    setSummary(null);
    try {
      const text = await file.text();
      const har = JSON.parse(text);
      const entries: any[] = har?.log?.entries || [];

      const khanRequests: CapturedRequest[] = [];
      const graphqlOps = new Set<string>();
      let hasLogin = false;

      for (const entry of entries) {
        const url: string = entry?.request?.url || "";
        const method: string = entry?.request?.method || "GET";
        const status: number | undefined = entry?.response?.status;

        const isKhan =
          url.includes("khanacademy.org") ||
          url.includes("crimsonzero") ||
          url.includes("/khan");
        if (!isKhan) continue;

        const headers: any[] = entry?.request?.headers || [];
        const hasAuth = headers.some((h) => {
          const n = (h?.name || "").toLowerCase();
          return n === "authorization" || n === "cookie" || n === "x-ka-fkey";
        });

        const isGraphQL = url.includes("/graphql") || url.includes("/api/internal/graphql");
        let graphqlOp: string | undefined;
        if (isGraphQL) {
          const m = url.match(/graphql\/([A-Za-z0-9_]+)/);
          if (m) {
            graphqlOp = m[1];
            graphqlOps.add(m[1]);
          }
        }

        if (/login|signin|auth|session/i.test(url)) hasLogin = true;

        khanRequests.push({ url, method, status, hasAuth, isGraphQL, graphqlOp });
      }

      setSummary({
        totalRequests: entries.length,
        khanRequests,
        graphqlOps: Array.from(graphqlOps),
        hasLogin,
      });

      if (khanRequests.length === 0) {
        notify("⚠️ NENHUMA REQUISIÇÃO KHAN ENCONTRADA NO HAR");
      } else {
        notify(`✓ ${khanRequests.length} REQUISIÇÕES KHAN ANALISADAS`);
      }
    } catch (err) {
      notify(`ERRO AO LER HAR: ${err instanceof Error ? err.message : "inválido"}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const sendToDeveloper = async () => {
    if (!summary) return;
    setSending(true);
    try {
      // Reaproveita o endpoint de status já existente para encaminhar a captura
      // (sem credenciais, apenas a estrutura da análise)
      await fetch("/api/status/khan-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary,
          timestamp: new Date().toISOString(),
        }),
      });
      setUploadStatus("sent");
      notify("✓ ANÁLISE ENVIADA — AGUARDE IMPLEMENTAÇÃO");
    } catch {
      setUploadStatus("error");
      notify("ERRO AO ENVIAR — COPIE O JSON ABAIXO MANUALMENTE");
    } finally {
      setSending(false);
    }
  };

  const steps = [
    {
      icon: ShieldCheck,
      title: "Faça login no CrimsonZero",
      body: "Abra crimsonzerohub.xyz em outra aba e entre normalmente. Não precisa nos passar suas credenciais.",
    },
    {
      icon: Network,
      title: "Abra o DevTools → Network",
      body: "Pressione F12 (ou Ctrl+Shift+I). Vá na aba Network/Rede e marque 'Preserve log'. Filtre por 'Fetch/XHR'.",
    },
    {
      icon: MousePointerClick,
      title: "Execute o script Khan",
      body: "Rode o script do Khan Academy no CrimsonZero como você faria normalmente. Espere ele terminar uma atividade.",
    },
    {
      icon: Save,
      title: "Salve o HAR",
      body: "Clique com botão direito em qualquer requisição → 'Save all as HAR with content'. Salva um arquivo .har.",
    },
    {
      icon: Upload,
      title: "Suba o arquivo aqui",
      body: "Use o botão abaixo. Vamos analisar localmente no seu navegador (sem enviar credenciais) e identificar os endpoints da Khan API.",
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <NotificationContainer />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-sm bg-blood-muted border border-primary/20 flex items-center justify-center">
          <GraduationCap size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-medium text-white tracking-tight font-mono uppercase">
            Khan Academy
          </h1>
          <p className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">
            Resolução automática de exercícios
          </p>
        </div>
      </div>

      {/* Status banner */}
      <div className="bg-card border border-yellow-500/30 rounded-sm p-4 flex gap-3">
        <AlertCircle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-mono font-semibold text-yellow-500 uppercase tracking-wider">
            Em construção — precisamos da sua ajuda
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Khan Academy é uma plataforma <strong>separada da SED</strong>, com login e API próprios. Para
            implementar o resolvedor de forma segura (sem pedir suas senhas), precisamos analisar o
            tráfego de rede que o CrimsonZero faz quando resolve uma atividade. Siga o passo-a-passo
            abaixo, faça upload do HAR, e a gente implementa o script de verdade.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-0.5 h-4 bg-primary rounded-full" />
          <h2 className="text-xs font-bold text-white uppercase tracking-[0.15em] font-mono">
            Como capturar (5 min)
          </h2>
        </div>
        <ol className="space-y-2">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="bg-card border border-glass-border rounded-sm p-3 flex gap-3"
            >
              <div className="flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-sm bg-blood-muted border border-primary/20 flex items-center justify-center text-primary text-[10px] font-mono font-bold">
                  {i + 1}
                </div>
                <step.icon size={14} className="text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                  {step.title}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Upload */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-0.5 h-4 bg-primary rounded-full" />
          <h2 className="text-xs font-bold text-white uppercase tracking-[0.15em] font-mono">
            Upload do HAR
          </h2>
        </div>
        <div className="bg-card border border-glass-border rounded-sm p-4 space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".har,application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) analyzeHar(f);
            }}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={analyzing}
            className="w-full bg-blood-muted hover:bg-primary/10 border border-primary/30 rounded-sm py-3 px-4 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 size={14} className="text-primary animate-spin" />
                <span className="text-xs font-mono text-white uppercase tracking-wider">
                  Analisando...
                </span>
              </>
            ) : (
              <>
                <Upload size={14} className="text-primary" />
                <span className="text-xs font-mono text-white uppercase tracking-wider">
                  Selecionar arquivo .har
                </span>
              </>
            )}
          </button>
          <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
            🔒 O HAR é processado <strong>localmente no seu navegador</strong>. Apenas o resumo
            (URLs e nomes de operações GraphQL — sem cookies, sem tokens, sem corpo das respostas)
            é enviado quando você confirma.
          </p>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-0.5 h-4 bg-emerald-400 rounded-full" />
            <h2 className="text-xs font-bold text-white uppercase tracking-[0.15em] font-mono">
              Análise
            </h2>
          </div>
          <div className="bg-card border border-emerald-400/20 rounded-sm p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Reqs totais" value={summary.totalRequests} />
              <Stat label="Reqs Khan" value={summary.khanRequests.length} />
              <Stat label="Ops GraphQL" value={summary.graphqlOps.length} />
            </div>

            {summary.graphqlOps.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-2">
                  Operações GraphQL detectadas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {summary.graphqlOps.map((op) => (
                    <span
                      key={op}
                      className="text-[10px] font-mono px-2 py-1 bg-blood-muted border border-primary/20 rounded-sm text-primary"
                    >
                      {op}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-2">
                Endpoints (top 10)
              </p>
              <ul className="space-y-1 max-h-48 overflow-auto">
                {summary.khanRequests.slice(0, 10).map((r, i) => (
                  <li
                    key={i}
                    className="text-[10px] font-mono text-muted-foreground flex gap-2 items-start"
                  >
                    <span className="text-primary flex-shrink-0">{r.method}</span>
                    <span className="truncate flex-1">{r.url.replace(/^https?:\/\//, "")}</span>
                    {r.status && (
                      <span
                        className={
                          r.status < 300
                            ? "text-emerald-400 flex-shrink-0"
                            : "text-red-400 flex-shrink-0"
                        }
                      >
                        {r.status}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={sendToDeveloper}
              disabled={sending || uploadStatus === "sent"}
              className="w-full bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-sm py-2.5 px-4 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {uploadStatus === "sent" ? (
                <>
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                    Enviado — obrigado!
                  </span>
                </>
              ) : sending ? (
                <>
                  <Loader2 size={14} className="text-primary animate-spin" />
                  <span className="text-xs font-mono text-white uppercase tracking-wider">
                    Enviando...
                  </span>
                </>
              ) : (
                <>
                  <Send size={14} className="text-primary" />
                  <span className="text-xs font-mono text-white uppercase tracking-wider">
                    Enviar análise (sem credenciais)
                  </span>
                </>
              )}
            </button>

            <details className="text-[10px] font-mono">
              <summary className="cursor-pointer text-muted-foreground hover:text-white uppercase tracking-wider">
                Ver JSON da análise (copiar manualmente)
              </summary>
              <pre className="mt-2 p-2 bg-blood-muted border border-glass-border rounded-sm overflow-auto max-h-64 text-[9px] text-muted-foreground">
                {JSON.stringify(summary, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-blood-muted border border-glass-border rounded-sm p-2 text-center">
      <p className="text-lg font-bold text-white font-mono">{value}</p>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono mt-0.5">
        {label}
      </p>
    </div>
  );
}
