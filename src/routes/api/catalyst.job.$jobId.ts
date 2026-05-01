import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/catalyst/job/$jobId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const upstream = await fetch(`https://catalyst.crimsonzerohub.xyz/job/${params.jobId}`, {
            headers: { Accept: "application/json" },
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
            { status: "error", message: error instanceof Error ? error.message : "Erro ao consultar tarefa" },
            { status: 502 },
          );
        }
      },
    },
  },
});