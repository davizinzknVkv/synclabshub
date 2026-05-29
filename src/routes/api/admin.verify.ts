import { createFileRoute } from "@tanstack/react-router";
import { signAdminToken } from "@/lib/admin-token.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/admin/verify")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const { password } = (await request.json()) as { password?: string };
          const expected = process.env.ADMIN_PASSWORD || "@Bz181120";
          if (!expected) {
            return Response.json(
              { error: "ADMIN_PASSWORD not configured" },
              { status: 500, headers: corsHeaders },
            );
          }
          if (!password || typeof password !== "string") {
            return Response.json(
              { error: "Senha obrigatória" },
              { status: 400, headers: corsHeaders },
            );
          }
          // Constant-time-ish compare
          const a = Buffer.from(password);
          const b = Buffer.from(expected);
          let ok = a.length === b.length;
          for (let i = 0; i < Math.max(a.length, b.length); i++) {
            ok = (a[i] === b[i]) && ok;
          }
          if (!ok) {
            return Response.json(
              { error: "Senha incorreta" },
              { status: 401, headers: corsHeaders },
            );
          }
          const token = signAdminToken();
          return Response.json({ token }, { status: 200, headers: corsHeaders });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "Erro" },
            { status: 500, headers: corsHeaders },
          );
        }
      },
    },
  },
});
