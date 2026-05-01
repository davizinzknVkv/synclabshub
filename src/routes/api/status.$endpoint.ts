import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/status/$endpoint")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, { status: 204, headers: corsHeaders });
      },
      POST: async ({ request, params }) => {
        const body = await request.text();
        try {
          const upstream = await fetch(`https://statusbis.biscurim.space/api/${params.endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });

          return new Response(await upstream.text(), {
            status: upstream.status,
            headers: { "Content-Type": upstream.headers.get("content-type") || "application/json", ...corsHeaders },
          });
        } catch (error) {
          console.log(`Status server unreachable for ${params.endpoint}:`, error instanceof Error ? error.message : error);
          // Return OK so the main task flow isn't blocked
          return Response.json(
            { ok: true, warning: "Status server offline, data not recorded" },
            { status: 200, headers: corsHeaders },
          );
        }
      },
    },
  },
});