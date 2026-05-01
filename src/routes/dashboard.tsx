import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getSession } from "@/lib/auth";
import { AppSidebar } from "@/components/AppSidebar";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const session = getSession();

  useEffect(() => {
    if (!session) {
      navigate({ to: "/" });
    }
  }, [session, navigate]);

  if (!session) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto pt-[52px] md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
