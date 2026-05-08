import { getSession } from "./auth";

export type DetectedSerie = {
  /** "6", "7", "8", "9", "1em", "2em", "3em" */
  key: string;
  /** Human-friendly label */
  label: string;
};

/**
 * Tenta detectar a série do aluno a partir do nome das salas (rooms) na sessão.
 * Salas costumam ter nomes como "6º Ano A", "1ª Série EM", etc.
 */
export function detectUserSerie(): DetectedSerie | null {
  const s = getSession();
  if (!s?.rooms?.length) return null;

  const counts: Record<string, { count: number; label: string }> = {};
  const bump = (key: string, label: string) => {
    counts[key] = counts[key]
      ? { count: counts[key].count + 1, label: counts[key].label }
      : { count: 1, label };
  };

  for (const r of s.rooms) {
    const n = (r.name || "").toLowerCase();
    // Ensino médio: "1ª série", "1 serie", "1º em", "1ano em"
    const em = n.match(/([123])\s*[ºª°]?\s*(serie|série|ano)?\s*(em|e\.m|ensino\s*m[eé]dio)/i)
      || (n.includes("em") || n.includes("médio") || n.includes("medio")
        ? n.match(/([123])\s*[ºª°]?\s*(serie|série|ano)/i) : null);
    if (em) {
      const num = em[1];
      bump(`${num}em`, `${num}º Ano EM`);
      continue;
    }
    // Fundamental: "6º ano", "7 ano", "8ano"
    const f = n.match(/([6789])\s*[ºª°]?\s*ano/i);
    if (f) {
      const num = f[1];
      bump(num, `${num}º Ano`);
    }
  }

  let best: { key: string; label: string; count: number } | null = null;
  for (const [key, v] of Object.entries(counts)) {
    if (!best || v.count > best.count) best = { key, label: v.label, count: v.count };
  }
  return best ? { key: best.key, label: best.label } : null;
}

/** Verifica se o nome de uma série na lista de apostilas casa com a série detectada. */
export function serieMatches(serieName: string, detected: DetectedSerie): boolean {
  const n = serieName.toLowerCase();
  if (detected.key.endsWith("em")) {
    const num = detected.key.replace("em", "");
    return n.includes(`${num}º ano em`) || n.includes(`${num}ano em`) || n.startsWith(`${num}º ano em`);
  }
  return n.startsWith(`${detected.key}º`) || n.startsWith(`${detected.key} `);
}
