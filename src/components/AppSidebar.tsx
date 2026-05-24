import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home, CheckSquare, PenTool, MessageCircle, Heart, ChevronLeft, ChevronRight, LogOut, Menu, X, RefreshCcw, GraduationCap, BookOpen
} from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";
import { clearSession } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";

const NAV_ITEMS = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Tarefa SP", url: "/dashboard/tarefas", icon: CheckSquare },
  { title: "Prepara SP", url: "/dashboard/preparasp", icon: GraduationCap },
  { title: "Revisão", url: "/dashboard/revisao-linguagens", icon: BookOpen },
  { title: "Retrabalho", url: "/dashboard/rework", icon: RefreshCcw },
  { title: "Redação", url: "/dashboard/redacao", icon: PenTool },
];

const COMMUNITY_ITEMS = [
  { title: "Discord", url: "https://discord.gg/y5tNWGVPSU", icon: MessageCircle, external: true },
  { title: "Doações", url: "https://livepix.gg/davizinzkn", icon: Heart, external: true },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleLogout = () => {
    clearSession();
    navigate({ to: "/" });
  };

  const isActive = (url: string) => {
    if (url === "/dashboard") return currentPath === "/dashboard";
    return currentPath === url || currentPath.startsWith(url);
  };

  // Mobile: top bar + slide-out drawer
  if (isMobile) {
    return (
      <>
        {/* Top bar */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-card/95 backdrop-blur-md border-b border-glass-border">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu size={20} />
          </button>
          <img src={logo} alt="Sync Labs" className="w-6 h-6 drop-shadow-[0_0_6px_rgba(220,38,38,0.4)]" />
          <span className="text-sm font-medium text-white tracking-tight">Sync Labs</span>
        </div>

        {/* Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
            <aside
              className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-glass-border flex flex-col animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-2 p-4 border-b border-glass-border">
                <img src={logo} alt="Sync Labs" className="w-7 h-7 drop-shadow-[0_0_6px_rgba(220,38,38,0.4)]" />
                <span className="text-sm font-medium text-white tracking-tight">Sync Labs</span>
                <button onClick={() => setMobileOpen(false)} className="ml-auto text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 p-2 space-y-0.5">
                <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground px-3 pt-2 pb-2 font-mono">Scripts</p>
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.url}
                    to={item.url}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-medium font-mono transition-all ${
                      isActive(item.url)
                        ? "bg-blood-muted text-primary border-l-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-hover border-l-2 border-transparent"
                    }`}
                  >
                    <item.icon size={15} className={isActive(item.url) ? "text-primary" : ""} />
                    <span className="tracking-wider uppercase">{item.title}</span>
                  </Link>
                ))}

                <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground px-3 pt-6 pb-2 font-mono">Comunidade</p>
                {COMMUNITY_ITEMS.map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-medium font-mono text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all border-l-2 border-transparent"
                  >
                    <item.icon size={15} />
                    <span className="tracking-wider uppercase">{item.title}</span>
                  </a>
                ))}
              </nav>

              {/* Logout */}
              <div className="p-2 border-t border-glass-border">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-mono text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all w-full border-l-2 border-transparent"
                >
                  <LogOut size={15} />
                  <span className="tracking-wider uppercase">Sair</span>
                </button>
              </div>
            </aside>
          </div>
        )}
      </>
    );
  }

  // Desktop: original sidebar
  return (
    <aside
      className={`flex flex-col h-screen bg-card border-r border-glass-border transition-all duration-300 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="flex items-center gap-2 p-4 border-b border-glass-border">
        <img src={logo} alt="Sync Labs" className="w-7 h-7 flex-shrink-0 drop-shadow-[0_0_6px_rgba(220,38,38,0.4)]" />
        {!collapsed && (
          <span className="text-sm font-medium text-white tracking-tight truncate">Sync Labs</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {!collapsed && (
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground px-3 pt-2 pb-2 font-mono">Scripts</p>
        )}
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.url}
            to={item.url}
            className={`flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-medium font-mono transition-all ${
              isActive(item.url)
                ? "bg-blood-muted text-primary border-l-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-hover border-l-2 border-transparent"
            }`}
          >
            <item.icon size={15} className={isActive(item.url) ? "text-primary" : ""} />
            {!collapsed && <span className="tracking-wider uppercase">{item.title}</span>}
          </Link>
        ))}

        {!collapsed && (
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground px-3 pt-6 pb-2 font-mono">Comunidade</p>
        )}
        {collapsed && <div className="h-6" />}
        {COMMUNITY_ITEMS.map((item) => (
          <a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-medium font-mono text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all border-l-2 border-transparent"
          >
            <item.icon size={15} />
            {!collapsed && <span className="tracking-wider uppercase">{item.title}</span>}
          </a>
        ))}
      </nav>

      <div className="p-2 border-t border-glass-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-mono text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all w-full border-l-2 border-transparent"
        >
          <LogOut size={15} />
          {!collapsed && <span className="tracking-wider uppercase">Sair</span>}
        </button>
      </div>
    </aside>
  );
}
