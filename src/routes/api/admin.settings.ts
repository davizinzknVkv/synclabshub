import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminFromRequest } from "@/lib/admin-token.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/admin/settings")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),
      GET: async () => {
        const { data, error } = await supabaseAdmin
          .from("site_settings")
          .select("*")
          .single();
        if (error) {
          return Response.json(
            { error: error.message },
            { status: 500, headers: corsHeaders },
          );
        }
        return Response.json({ settings: data }, { status: 200, headers: corsHeaders });
      },
      PATCH: async ({ request }) => {
        if (!requireAdminFromRequest(request)) {
          return Response.json(
            { error: "Unauthorized" },
            { status: 401, headers: corsHeaders },
          );
        }
        const body = (await request.json()) as {
          maintenance_mode?: boolean;
          scripts_enabled?: boolean;
          preparasp_enabled?: boolean;
        };
        const update: { maintenance_mode?: boolean; scripts_enabled?: boolean; preparasp_enabled?: boolean } = {};
        if (typeof body.maintenance_mode === "boolean")
          update.maintenance_mode = body.maintenance_mode;
        if (typeof body.scripts_enabled === "boolean")
          update.scripts_enabled = body.scripts_enabled;
        if (typeof body.preparasp_enabled === "boolean")
          update.preparasp_enabled = body.preparasp_enabled;
        if (Object.keys(update).length === 0) {
          return Response.json(
            { error: "Nada para atualizar" },
            { status: 400, headers: corsHeaders },
          );
        }
        const { data: existing, error: selErr } = await supabaseAdmin
          .from("site_settings")
          .select("id")
          .single();
        if (selErr || !existing) {
          return Response.json(
            { error: selErr?.message ?? "Configurações não encontradas" },
            { status: 500, headers: corsHeaders },
          );
        }
        const { data, error } = await supabaseAdmin
          .from("site_settings")
          .update(update)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) {
          return Response.json(
            { error: error.message },
            { status: 500, headers: corsHeaders },
          );
        }
        return Response.json({ settings: data }, { status: 200, headers: corsHeaders });
      },
    },
  },
});
