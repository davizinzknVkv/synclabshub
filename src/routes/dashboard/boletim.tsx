import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { GraduationCap, RefreshCw, AlertCircle } from "lucide-react";
import { getSession, loadCreds } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/boletim")({
  component: BoletimPage,
  head: () => ({ meta: [{ title: "Boletim Escolar — Sync Labs" }] }),
});

interface DisciplinaBoletim {
  nomeDisciplina?: string;
  disciplina?: string;
  nome?: string;
  notaBimestre1?: number | string | null;
  notaBimestre2?: number | string | null;
  notaBimestre3?: number | string | null;
  notaBimestre4?: number | string | null;
  faltasBimestre1?: number | string | null;
  faltasBimestre2?: number | string | null;
  faltasBimestre3?: number | string | null;
  faltasBimestre4?: number | string | null;
  [k: string]: unknown;
}

async function obterTokenSED(authToken: string): Promise<string> {
  const res = await fetch(
    `/api/proxy/mas/external-auth/seducsp_token/generate?card_label=Boletim`,
    { headers: { "x-api-key": authToken, Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Falha ao obter token SED (${res.status})`);
  const data = await res.json();
  const token =
    data?.token ||
    data?.access_token ||
    (typeof data?.redirect === "string"
      ? new URL(data.redirect).searchParams.get("token")
      : null);
  if (!token) throw new Error("Token SED não retornado");
  return token as string;
}

async function consultarBoletim(
  bearer: string,
  inNumRA: string,
  inDigitoRA: string,
  inAno: string,
) {
  const qs = new URLSearchParams({
    inNumRA,
    inDigitoRA,
    inSiglaUFRA: "SP",
    inAnoletivo: inAno,
  });
  const res = await fetch(`/api/boletim/ncaapi/api/Boletim/ConsultaBoletim?${qs}`, {
    headers: {
      Authorization: `Bearer ${bearer}`,
      Accept: "application/json, text/plain, */*",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Boletim ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function extrairDisciplinas(payload: unknown): DisciplinaBoletim[] {
  if (!payload) return [];
  // Try common shapes
  const p = payload as Record<string, unknown>;
  const candidates = [
    p.data,
    p.boletim,
    p.disciplinas,
    p.result,
    p.Boletim,
    p.Disciplinas,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c as DisciplinaBoletim[];
    if (c && typeof c === "object") {
      const d = (c as Record<string, unknown>).disciplinas ?? (c as Record<string, unknown>).Disciplinas;
      if (Array.isArray(d)) return d as DisciplinaBoletim[];
    }
  }
  if (Array.isArray(payload)) return payload as DisciplinaBoletim[];
  return [];
}

function nomeDe(d: DisciplinaBoletim): string {
  return (
    (d.nomeDisciplina as string) ||
    (d.disciplina as string) ||
    (d.nome as string) ||
    "—"
  );
}

function valor(d: DisciplinaBoletim, keys: string[]): string {
  for (const k of keys) {
    const v = (d as Record<string, unknown>)[k];
    if (v !== null && v !== undefined && v !== "") return String(v);
  }
  return "—";
}

function BoletimPage() {
  const session = getSession();
  const creds = loadCreds();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [raw, setRaw] = useState<unknown>(null);
  const [disciplinas, setDisciplinas] = useState<DisciplinaBoletim[]>([]);
  const ano = "2026";

  const carregar = useCallback(async () => {
    if (!session) {
      setErro("Sessão expirada. Faça login novamente.");
      return;
    }
    // Derive RA pieces
    let inNumRA = creds?.raNumero ?? "";
    let inDigitoRA = creds?.raDigito ?? "";
    if (!inNumRA && session.ra) {
      const m = session.ra.match(/^(\d+?)(\d)(SP|RJ|MG|[A-Z]{2})?$/i);
      if (m) {
        inNumRA = m[1];
        inDigitoRA = m[2];
      }
    }
    if (!inNumRA || !inDigitoRA) {
      setErro("RA do usuário não encontrado.");
      return;
    }

    setLoading(true);
    setErro(null);
    try {
      const bearer = await obterTokenSED(session.authToken);
      const data = await consultarBoletim(bearer, inNumRA, inDigitoRA, ano);
      setRaw(data);
      setDisciplinas(extrairDisciplinas(data));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar boletim");
    } finally {
      setLoading(false);
    }
  }, [session, creds]);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-8 bg-aurora min-h-screen">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 p-0.5 shadow-[0_0_24px_rgba(139,92,246,0.35)]">
            <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
              <GraduationCap size={24} className="text-violet-400" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
              Boletim Escolar
            </h1>
            <p className="text-xs text-muted-foreground font-mono tracking-widest uppercase opacity-80">
              Ano letivo {ano} · UF SP
            </p>
          </div>
        </div>
        <button
          onClick={carregar}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-violet-600/80 to-cyan-500/80 hover:from-violet-500 hover:to-cyan-400 border border-violet-400/30 disabled:opacity-50 transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Recarregar
        </button>
      </div>

      {erro && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold mb-1">Não foi possível carregar o boletim</div>
            <div className="text-red-200/80 break-words">{erro}</div>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 via-background/60 to-cyan-950/30 backdrop-blur-xl overflow-hidden shadow-[0_0_40px_-12px_rgba(139,92,246,0.4)]">
        <div className="px-6 py-4 border-b border-violet-500/20 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Disciplinas · Notas e Faltas
          </h2>
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300/80">
            {loading ? "Carregando…" : `${disciplinas.length} registros`}
          </span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full bg-violet-500/10" />
            ))}
          </div>
        ) : disciplinas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] uppercase tracking-wider text-cyan-300/90 bg-violet-500/5">
                <tr>
                  <th className="px-6 py-3 font-semibold">Disciplina</th>
                  <th className="px-3 py-3 font-semibold text-center">1º Bim</th>
                  <th className="px-3 py-3 font-semibold text-center">2º Bim</th>
                  <th className="px-3 py-3 font-semibold text-center">3º Bim</th>
                  <th className="px-3 py-3 font-semibold text-center">4º Bim</th>
                  <th className="px-3 py-3 font-semibold text-center border-l border-violet-500/20">F1</th>
                  <th className="px-3 py-3 font-semibold text-center">F2</th>
                  <th className="px-3 py-3 font-semibold text-center">F3</th>
                  <th className="px-3 py-3 font-semibold text-center">F4</th>
                </tr>
              </thead>
              <tbody>
                {disciplinas.map((d, i) => (
                  <tr
                    key={i}
                    className="border-t border-violet-500/10 hover:bg-violet-500/5 transition-colors"
                  >
                    <td className="px-6 py-3 font-medium text-white">{nomeDe(d)}</td>
                    <td className="px-3 py-3 text-center text-violet-200">
                      {valor(d, ["notaBimestre1", "nota1Bim", "nota1", "NotaBimestre1"])}
                    </td>
                    <td className="px-3 py-3 text-center text-violet-200">
                      {valor(d, ["notaBimestre2", "nota2Bim", "nota2", "NotaBimestre2"])}
                    </td>
                    <td className="px-3 py-3 text-center text-violet-200">
                      {valor(d, ["notaBimestre3", "nota3Bim", "nota3", "NotaBimestre3"])}
                    </td>
                    <td className="px-3 py-3 text-center text-violet-200">
                      {valor(d, ["notaBimestre4", "nota4Bim", "nota4", "NotaBimestre4"])}
                    </td>
                    <td className="px-3 py-3 text-center text-cyan-300 border-l border-violet-500/10">
                      {valor(d, ["faltasBimestre1", "faltas1Bim", "faltas1", "FaltasBimestre1"])}
                    </td>
                    <td className="px-3 py-3 text-center text-cyan-300">
                      {valor(d, ["faltasBimestre2", "faltas2Bim", "faltas2", "FaltasBimestre2"])}
                    </td>
                    <td className="px-3 py-3 text-center text-cyan-300">
                      {valor(d, ["faltasBimestre3", "faltas3Bim", "faltas3", "FaltasBimestre3"])}
                    </td>
                    <td className="px-3 py-3 text-center text-cyan-300">
                      {valor(d, ["faltasBimestre4", "faltas4Bim", "faltas4", "FaltasBimestre4"])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !erro ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhuma disciplina encontrada no boletim.
          </div>
        ) : null}
      </div>

      {raw && disciplinas.length === 0 && !loading && (
        <details className="rounded-2xl border border-violet-500/20 bg-violet-950/20 p-4 text-xs">
          <summary className="cursor-pointer text-cyan-300 font-semibold uppercase tracking-wider">
            Resposta bruta da API
          </summary>
          <pre className="mt-3 overflow-auto text-violet-200/80">
            {JSON.stringify(raw, null, 2) as string}
          </pre>
        </details>
      )}
    </div>
  );
}
