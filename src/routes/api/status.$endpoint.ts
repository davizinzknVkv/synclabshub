import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/status/$endpoint")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const body = await request.text();
          const upstream = await fetch(`https://statusbis.biscurim.space/api/${params.endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });

          return new Response(await upstream.text(), {
            status: upstream.status,
            headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" },
          });
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "Erro ao atualizar status" },
            { status: 502 },
          );
        }
      },
    },
  },
});