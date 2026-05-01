import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

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
        try {
          const body = await request.json() as {
            ra?: string;
            taskCount?: number;
            taskType?: string;
            status?: string;
            message?: string;
          };

          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
            console.error("Missing Supabase env vars for status logging");
            return Response.json(
              { ok: true, warning: "DB not configured" },
              { status: 200, headers: corsHeaders },
            );
          }

          const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          if (params.endpoint === "task-status" && body.ra) {
            const { error } = await supabase.from("task_status_logs").insert({
              ra: body.ra,
              task_count: body.taskCount ?? 0,
              task_type: body.taskType ?? "unknown",
              status: body.status ?? "unknown",
              message: body.message ?? null,
            });

            if (error) {
              console.error("Failed to insert task_status_log:", error.message);
              return Response.json(
                { ok: false, error: error.message },
                { status: 500, headers: corsHeaders },
              );
            }
          }

          return Response.json(
            { ok: true, endpoint: params.endpoint },
            { status: 200, headers: corsHeaders },
          );
        } catch (error) {
          console.error("Status endpoint error:", error instanceof Error ? error.message : error);
          return Response.json(
            { ok: false, error: "Internal error" },
            { status: 500, headers: corsHeaders },
          );
        }
      },
    },
  },
});
