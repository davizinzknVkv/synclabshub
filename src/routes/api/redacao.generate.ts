import { createFileRoute } from "@tanstack/react-router";

// Endpoint proprietário da Flux para geração de redações.
// Usa o gateway de IA da Lovable com Gemini 2.5 Pro.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SYSTEM_PROMPT =
  "Você é o gerador de redações proprietário da Flux Hub, especialista em Redação Paulista (Saladefuturo/SEDUC-SP). " +
  "Escreva sempre em norma culta, 3ª pessoa, sem gírias, sem emojis, sem markdown, sem listas, sem travessões, sem reticências. " +
  "Siga rigorosamente o formato pedido pelo usuário.";

export const Route = createFileRoute("/api/redacao/generate")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const origin = request.headers.get("origin") || request.headers.get("referer") || "";
          const allowed = ["lovable.app", "lovableproject.com", "fluxhubprime", "localhost", "127.0.0.1"];
          if (!origin || !allowed.some((h) => origin.includes(h))) {
            return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
          }

          const { prompt } = (await request.json()) as { prompt: string };
          if (!prompt) {
            return Response.json({ error: "prompt obrigatório" }, { status: 400, headers: corsHeaders });
          }

          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          if (!LOVABLE_API_KEY) {
            return Response.json(
              { error: "LOVABLE_API_KEY não configurada" },
              { status: 500, headers: corsHeaders },
            );
          }

          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-pro",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt },
              ],
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            console.error("Flux Redação AI error:", response.status, errText);
            if (response.status === 429) {
              return Response.json(
                { error: "Muitas requisições, aguarde alguns segundos e tente novamente." },
                { status: 429, headers: corsHeaders },
              );
            }
            if (response.status === 402) {
              return Response.json(
                { error: "Créditos de IA insuficientes na Flux." },
                { status: 402, headers: corsHeaders },
              );
            }
            return Response.json(
              { error: `Erro no gerador Flux: ${response.status}` },
              { status: 500, headers: corsHeaders },
            );
          }

          const data = await response.json();
          const text = data.choices?.[0]?.message?.content || "";
          return Response.json({ text, provider: "flux" }, { status: 200, headers: corsHeaders });
        } catch (error) {
          console.error("Flux redacao generate error:", error);
          return Response.json(
            { error: error instanceof Error ? error.message : "Erro desconhecido" },
            { status: 500, headers: corsHeaders },
          );
        }
      },
    },
  },
});
