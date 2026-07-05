import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { installLocalProxyInterceptor } from "@/lib/localProxy";

// Instala o interceptador o mais cedo possível (antes de qualquer fetch).
if (typeof window !== "undefined") {
  installLocalProxyInterceptor();
}


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Flux Hub" },
      { name: "description", content: "Flux Hub — a plataforma inteligente de automação escolar." },
      { name: "author", content: "Flux Hub" },
      { name: "application-name", content: "Flux Hub" },
      { name: "theme-color", content: "#7C3AED" },
      { property: "og:site_name", content: "Flux Hub" },
      { property: "og:title", content: "Flux Hub" },
      { property: "og:description", content: "Flux Hub — a plataforma inteligente de automação escolar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Flux Hub" },
      { name: "twitter:description", content: "Flux Hub — a plataforma inteligente de automação escolar." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/7b185abc-d4ac-41cb-a9de-9378d2e5350b" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/7b185abc-d4ac-41cb-a9de-9378d2e5350b" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  if (typeof window !== "undefined") {
    // Instala interceptador do proxy local (opt-in via localStorage.localProxyUrl)
    import("@/lib/localProxy").then((m) => m.installLocalProxyInterceptor()).catch(() => {});
  }
  return <Outlet />;
}
