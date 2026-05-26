import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminFromRequest } from "@/lib/admin-token.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/admin/logs")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        if (!requireAdminFromRequest(request)) {
          return Response.json(
            { error: "Unauthorized" },
            { status: 401, headers: corsHeaders },
          );
        }
        const { data, error } = await supabaseAdmin
          .from("task_status_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) {
          return Response.json(
            { error: error.message },
            { status: 500, headers: corsHeaders },
          );
        }
        return Response.json({ logs: data ?? [] }, { status: 200, headers: corsHeaders });
      },
    },
  },
});
