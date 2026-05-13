import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/khan-captcha")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { token } = (await request.json()) as { token?: string };
          if (!token) {
            return Response.json({ success: false, error: "missing token" }, { status: 400 });
          }
          const secret = process.env.TURNSTILE_SECRET_KEY;
          if (!secret) {
            return Response.json(
              { success: false, error: "TURNSTILE_SECRET_KEY não configurada" },
              { status: 500 },
            );
          }

          const form = new URLSearchParams();
          form.set("secret", secret);
          form.set("response", token);
          const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for");
          if (ip) form.set("remoteip", ip.split(",")[0].trim());

          const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString(),
          });
          const data = (await r.json()) as {
            success: boolean;
            "error-codes"?: string[];
            challenge_ts?: string;
            hostname?: string;
          };

          if (!data.success) {
            return Response.json(
              { success: false, errors: data["error-codes"] || [] },
              { status: 400 },
            );
          }

          // Devolvemos o próprio cfToken como "captcha auth" — pode ser usado pelo
          // proxy externo ou por chamadas futuras a /api/khan-* aqui dentro.
          return Response.json({
            success: true,
            token,
            expires_in: 21600,
            hostname: data.hostname,
            challenge_ts: data.challenge_ts,
          });
        } catch (e) {
          return Response.json(
            { success: false, error: e instanceof Error ? e.message : "unknown" },
            { status: 500 },
          );
        }
      },
    },
  },
});
