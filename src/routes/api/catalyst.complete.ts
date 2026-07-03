import { createFileRoute } from "@tanstack/react-router";

const jsonHeaders = {
  "Content-Type": "application/json",
};

export const Route = createFileRoute("/api/catalyst/complete")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: jsonHeaders }),
      POST: async ({ request }) => {
        try {
          const body = await request.text();
          const upstream = await fetch("https://taskitos.cupiditys.lol/api/complete", {
            method: "POST",
            headers: jsonHeaders,
            body,
          });
          const responseText = await upstream.text();

          return new Response(responseText, {
            status: upstream.status,
            headers: {
              "Content-Type": upstream.headers.get("content-type") || "application/json",
            },
          });
        } catch (error) {
          return Response.json(
            { success: false, error: error instanceof Error ? error.message : "Erro ao enviar tarefa" },
            { status: 502 },
          );
        }
      },
    },
  },
});