import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home, CheckSquare, MessageCircle, Heart, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";

const NAV_ITEMS = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Tarefa SP", url: "/dashboard/tarefas", icon: CheckSquare },
];

const COMMUNITY_ITEMS = [
  { title: "Discord", url: "https://discord.gg/yXYKSZAK9Z", icon: MessageCircle, external: true },
  { title: "Doações", url: "https://pixgg.com/marcos10pc", icon: Heart, external: true },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={`flex flex-col h-screen bg-card border-r border-border transition-all duration-300 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <img src={logo} alt="Sync Labs" className="w-8 h-8 flex-shrink-0" />
        {!collapsed && (
          <span className="title-display text-lg font-bold truncate">Sync Labs</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = currentPath === item.url || currentPath.startsWith(item.url + "/");
          return (
            <Link
              key={item.url}
              to={item.url}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              <item.icon size={18} className={active ? "text-primary" : ""} />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}

        {/* Community section */}
        {!collapsed && (
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 pt-6 pb-1">
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
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
          >
            <item.icon size={18} />
            {!collapsed && <span>{item.title}</span>}
          </a>
        ))}
      </nav>
    </aside>
  );
}
