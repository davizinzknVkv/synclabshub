import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home, CheckSquare, PenTool, MessageCircle, Heart, ChevronLeft, ChevronRight, LogOut,
} from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";
import { clearSession } from "@/lib/auth";

const NAV_ITEMS = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Tarefa SP", url: "/dashboard/tarefas", icon: CheckSquare },
  { title: "Redação", url: "/dashboard/redacao", icon: PenTool },
];

const COMMUNITY_ITEMS = [
  { title: "Discord", url: "https://discord.gg/yXYKSZAK9Z", icon: MessageCircle, external: true },
  { title: "Doações", url: "https://pixgg.com/marcos10pc", icon: Heart, external: true },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate({ to: "/" });
  };

  return (
    <aside
      className={`flex flex-col h-screen bg-card border-r border-glass-border transition-all duration-300 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Header */}
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

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {!collapsed && (
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground px-3 pt-2 pb-2 font-mono">
            Scripts
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const active = currentPath === item.url || (item.url !== "/dashboard" && currentPath.startsWith(item.url));
          const isExactHome = item.url === "/dashboard" && currentPath === "/dashboard";
          const isActive = item.url === "/dashboard" ? isExactHome : active;
          return (
            <Link
              key={item.url}
              to={item.url}
              className={`flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-medium font-mono transition-all ${
                isActive
                  ? "bg-blood-muted text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover border-l-2 border-transparent"
              }`}
            >
              <item.icon size={15} className={isActive ? "text-primary" : ""} />
              {!collapsed && <span className="tracking-wider uppercase">{item.title}</span>}
            </Link>
          );
        })}

        {/* Community section */}
        {!collapsed && (
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground px-3 pt-6 pb-2 font-mono">
            Comunidade
          </p>
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

      {/* Logout */}
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
