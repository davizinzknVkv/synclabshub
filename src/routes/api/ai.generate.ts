import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/ai/generate")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, { status: 204, headers: corsHeaders });
      },
      POST: async ({ request }) => {
        try {
          const { prompt, system } = (await request.json()) as {
            prompt: string;
            system?: string;
          };

          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          if (!LOVABLE_API_KEY) {
            return Response.json(
              { error: "LOVABLE_API_KEY not configured" },
              { status: 500, headers: corsHeaders },
            );
          }

          const messages: { role: string; content: string }[] = [];
          if (system) messages.push({ role: "system", content: system });
          messages.push({ role: "user", content: prompt });

          const response = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages,
              }),
            },
          );

          if (!response.ok) {
            const errText = await response.text();
            console.error("AI Gateway error:", response.status, errText);
            
            if (response.status === 429) {
              return Response.json(
                { error: "Rate limit exceeded, tente novamente em alguns segundos" },
                { status: 429, headers: corsHeaders },
              );
            }
            if (response.status === 402) {
              return Response.json(
                { error: "Créditos insuficientes" },
                { status: 402, headers: corsHeaders },
              );
            }

            return Response.json(
              { error: `AI error: ${response.status}` },
              { status: 500, headers: corsHeaders },
            );
          }

          const data = await response.json();
          const text = data.choices?.[0]?.message?.content || "";

          return Response.json({ text }, { status: 200, headers: corsHeaders });
        } catch (error) {
          console.error("AI generate error:", error);
          return Response.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500, headers: corsHeaders },
          );
        }
      },
    },
  },
});
