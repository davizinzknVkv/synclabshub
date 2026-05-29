import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home, CheckSquare, PenTool, MessageCircle, Heart,
  ChevronLeft, ChevronRight, LogOut, Menu, X,
  GraduationCap, Zap, FileText,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clearSession, getSession } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";

const NAV_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Tarefa SP", url: "/dashboard/tarefas", icon: CheckSquare },
  { title: "Prepara SP", url: "/dashboard/preparasp", icon: GraduationCap },
  { title: "Redação", url: "/dashboard/redacao", icon: PenTool },
  { title: "Boletim Escolar", url: "/dashboard/boletim", icon: FileText },
];

const COMMUNITY_ITEMS = [
  { title: "Discord", url: "https://discord.gg/y5tNWGVPSU", icon: MessageCircle },
  { title: "Apoiar", url: "https://livepix.gg/davizinzkn", icon: Heart },
];

function SyncMark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-xl flex-shrink-0"
      style={{
        width: size, height: size,
        background: "var(--gradient-primary)",
        boxShadow: "0 8px 24px -8px oklch(0.66 0.24 280 / 0.7), inset 0 1px 0 0 oklch(1 0 0 / 0.25)",
      }}
    >
      <Zap size={size * 0.55} className="text-white drop-shadow" strokeWidth={2.5} />
    </div>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const session = getSession();
  const displayName = session?.nick || session?.ra || "Aluno";

  const handleLogout = () => {
    clearSession();
    navigate({ to: "/" });
  };

  const isActive = (url: string) => {
    if (url === "/dashboard") return currentPath === "/dashboard";
    return currentPath === url || currentPath.startsWith(url + "/");
  };

  const NavItem = ({ item, onClick }: { item: typeof NAV_ITEMS[number]; onClick?: () => void }) => {
    const active = isActive(item.url);
    return (
      <Link
        to={item.url}
        onClick={onClick}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
          active
            ? "nav-active text-white"
            : "text-muted-foreground hover:text-white hover:bg-white/[0.04]"
        }`}
      >
        <item.icon size={17} className={active ? "text-primary" : "group-hover:text-accent transition-colors"} />
        {!collapsed && <span className="tracking-tight">{item.title}</span>}
        {active && !collapsed && (
          <motion.div
            layoutId="nav-dot"
            className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_12px_currentColor]"
          />
        )}
      </Link>
    );
  };

  // ---------- Mobile ----------
  if (isMobile) {
    return (
      <>
        {/* Top bar mobile */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 glass-strong border-b border-white/5">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-white transition-colors">
            <Menu size={20} />
          </button>
          <SyncMark size={26} />
          <span className="text-sm font-bold text-white tracking-tight font-display">Sync<span className="text-gradient">Labs</span></span>
          <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            <span className="status-online w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>ONLINE</span>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
              onClick={() => setMobileOpen(false)}
            >
              <motion.aside
                initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                className="absolute left-0 top-0 bottom-0 w-72 glass-strong border-r border-white/10 flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 p-4 border-b border-white/5">
                  <SyncMark size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white font-display leading-tight">Sync<span className="text-gradient">Labs</span></div>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                      <span className="status-online w-1.5 h-1.5 rounded-full bg-emerald-400" /> online
                    </div>
                  </div>
                  <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pt-2 pb-2 font-mono">Plataforma</p>
                  {NAV_ITEMS.map((item) => <NavItem key={item.url} item={item} onClick={() => setMobileOpen(false)} />)}

                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pt-5 pb-2 font-mono">Comunidade</p>
                  {COMMUNITY_ITEMS.map((item) => (
                    <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-all">
                      <item.icon size={17} />
                      <span>{item.title}</span>
                    </a>
                  ))}
                </nav>

                <div className="p-3 border-t border-white/5 space-y-2">
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white">
                      {displayName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{displayName}</div>
                    </div>
                  </div>
                  <button onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full">
                    <LogOut size={16} /> Sair
                  </button>
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ---------- Desktop ----------
  return (
    <aside
      className={`relative flex flex-col h-screen glass-strong border-r border-white/5 transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <SyncMark size={36} />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white font-display leading-tight tracking-tight">
              Sync<span className="text-gradient">Labs</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono mt-0.5">
              <span className="status-online w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>online</span>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-7 w-6 h-6 rounded-full glass border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white hover:border-primary/50 transition-all z-10"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pt-2 pb-2 font-mono">Plataforma</p>
        )}
        {NAV_ITEMS.map((item) => <NavItem key={item.url} item={item} />)}

        {!collapsed ? (
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pt-5 pb-2 font-mono">Comunidade</p>
        ) : <div className="h-4" />}
        {COMMUNITY_ITEMS.map((item) => (
          <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-all">
            <item.icon size={17} />
            {!collapsed && <span>{item.title}</span>}
          </a>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "var(--gradient-primary)" }}>
              {displayName[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{displayName}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
