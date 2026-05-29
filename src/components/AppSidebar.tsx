import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home, CheckSquare, PenTool, MessageCircle, Heart,
  ChevronLeft, ChevronRight, LogOut, Menu, X,
  GraduationCap, Zap, FileText, Lock, LayoutGrid, Sparkles, Gamepad2
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clearSession, getSession } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { 
  DonationModal, 
  DiscordModal, 
  PartnerModal, 
  RoadmapModal 
} from "./ExtraModals";

const NAV_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Tarefa SP", url: "/dashboard/tarefas", icon: CheckSquare, key: "scripts_enabled" },
  { title: "Prepara SP", url: "/dashboard/preparasp", icon: GraduationCap, key: "preparasp_enabled" },
  { title: "Redação", url: "/dashboard/redacao", icon: PenTool, key: "scripts_enabled" },
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
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const session = getSession();
  const displayName = session?.nick || session?.ra || "Aluno";

  const [donationOpen, setDonationOpen] = useState(false);
  const [discordOpen, setDiscordOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("*").single().then(({ data }) => {
      if (data) setSettings(data as any);
    });
  }, []);

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
    const isBlocked = item.key && settings[item.key] === false;

    return (
      <Link
        to={isBlocked ? "#" : item.url}
        onClick={(e) => {
          if (isBlocked) {
            e.preventDefault();
            return;
          }
          onClick?.();
        }}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
          active
            ? "nav-active text-white"
            : isBlocked
            ? "opacity-40 cursor-not-allowed"
            : "text-muted-foreground hover:text-white hover:bg-white/[0.04]"
        }`}
      >
        <item.icon size={17} className={active ? "text-primary" : "group-hover:text-accent transition-colors"} />
        {!collapsed && <span className="tracking-tight">{item.title}</span>}
        {isBlocked && !collapsed && <Lock size={12} className="ml-auto text-muted-foreground" />}
        {active && !collapsed && !isBlocked && (
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
    const [extraOpen, setExtraOpen] = useState(false);

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

                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pt-5 pb-1 font-mono">Extras</p>
                  <div className="flex flex-col gap-1 px-1 mb-2">
                    <button onClick={() => { setRoadmapOpen(true); setMobileOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-all">
                      <LayoutGrid size={17} />
                      <span>Roadmap</span>
                    </button>
                    <button onClick={() => { setPartnerOpen(true); setMobileOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-all">
                      <Gamepad2 size={17} />
                      <span>Parceiro</span>
                    </button>
                  </div>

                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pt-2 pb-2 font-mono">Comunidade</p>
                  <div className="flex flex-col gap-1 px-1">
                    <button onClick={() => { setDiscordOpen(true); setMobileOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-all text-left">
                      <MessageCircle size={17} />
                      <span>Discord</span>
                    </button>
                    <button onClick={() => { setDonationOpen(true); setMobileOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-all text-left">
                      <Heart size={17} />
                      <span>Apoiar</span>
                    </button>
                  </div>
                </nav>

                <div className="mt-auto p-4 border-t border-white/5 space-y-4">
                  <div className="text-center w-full">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-mono">
                      Desenvolvido por Davizinkn & Zennos
                    </span>
                  </div>
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        <DonationModal open={donationOpen} onOpenChange={setDonationOpen} />
        <DiscordModal open={discordOpen} onOpenChange={setDiscordOpen} />
        <PartnerModal open={partnerOpen} onOpenChange={setPartnerOpen} />
        <RoadmapModal open={roadmapOpen} onOpenChange={setRoadmapOpen} />
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
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pt-5 pb-1 font-mono">Extras</p>
        ) : <div className="h-4" />}
        <div className={`flex flex-col gap-1 ${collapsed ? "px-0" : "px-1"}`}>
          <button
            onClick={() => setRoadmapOpen(true)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-all ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? "Roadmap" : ""}
          >
            <LayoutGrid size={17} />
            {!collapsed && <span className="tracking-tight">Roadmap</span>}
          </button>
          <button
            onClick={() => setPartnerOpen(true)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-all ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? "Parceiro" : ""}
          >
            <Gamepad2 size={17} />
            {!collapsed && <span className="tracking-tight">Parceiro</span>}
          </button>
        </div>

        {!collapsed ? (
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pt-5 pb-2 font-mono">Comunidade</p>
        ) : <div className="h-4" />}
        <div className={`flex flex-col gap-1 ${collapsed ? "px-0" : "px-1"}`}>
          <button
            onClick={() => setDiscordOpen(true)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-all ${collapsed ? "justify-center text-center" : ""}`}
            title={collapsed ? "Discord" : ""}
          >
            <MessageCircle size={17} />
            {!collapsed && <span>Discord</span>}
          </button>
          <button
            onClick={() => setDonationOpen(true)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-all ${collapsed ? "justify-center text-center" : ""}`}
            title={collapsed ? "Apoiar" : ""}
          >
            <Heart size={17} />
            {!collapsed && <span>Apoiar</span>}
          </button>
        </div>
      </nav>

      <div className=\"mt-auto p-4 border-t border-white/5 space-y-6\">
        {!collapsed && (
          <div className=\"flex flex-col items-center gap-3\">
            <span className=\"text-[10px] uppercase tracking-widest text-muted-foreground/60 font-mono font-bold\">
              Desenvolvido por
            </span>
            <div className=\"flex items-center gap-6\">
              <div className=\"flex flex-col items-center gap-2\">
                <div className=\"w-12 h-12 rounded-full border-2 border-primary/20 p-0.5 bg-background/50 overflow-hidden shadow-glow-violet/20\">
                  <img 
                    src=\"https://media.discordapp.net/attachments/1480656042932043893/1510033137273536674/05f009cbb393af6592c7efcabbbf3d49.png?ex=6a1b5772&is=6a1a05f2&hm=625f4b1013e4fd4bd68116d81c6ee7aa16c7c9fb091f42bae39462c0369f780b&=&format=webp&quality=lossless\" 
                    alt=\"Davizinkn\" 
                    className=\"w-full h-full object-cover rounded-full transition-transform hover:scale-110 duration-500\"
                  />
                </div>
                <span className=\"text-[10px] font-mono text-muted-foreground/80 lowercase\">davizinkn</span>
              </div>
              <div className=\"flex flex-col items-center gap-2\">
                <div className=\"w-12 h-12 rounded-full border-2 border-cyan-400/20 p-0.5 bg-background/50 overflow-hidden shadow-glow-cyan/20\">
                  <img 
                    src=\"https://media.discordapp.net/attachments/1480656042932043893/1510033458586718238/image.png?ex=6a1b57bf&is=6a1a063f&hm=ab70e034a391dd3b53cb3aa707d20a864f7e7039cb4353224696c437248735d6&=&format=webp&quality=lossless\" 
                    alt=\"Zennos\" 
                    className=\"w-full h-full object-cover rounded-full transition-transform hover:scale-110 duration-500\"
                  />
                </div>
                <span className=\"text-[10px] font-mono text-muted-foreground/80 lowercase\">zennos</span>
              </div>
            </div>
          </div>
        )}
        <div className={`flex items-center gap-3 font-mono ${collapsed ? \"justify-center\" : \"px-1\"}`}>
          <div className=\"w-2 h-2 rounded-full bg-primary animate-pulse\" />
          {!collapsed && <span className=\"text-[10px] uppercase tracking-widest text-muted-foreground/40\">Sync v2.0</span>}
        </div>
      </div>

      <DonationModal open={donationOpen} onOpenChange={setDonationOpen} />
      <DiscordModal open={discordOpen} onOpenChange={setDiscordOpen} />
      <PartnerModal open={partnerOpen} onOpenChange={setPartnerOpen} />
      <RoadmapModal open={roadmapOpen} onOpenChange={setRoadmapOpen} />
    </aside>
  );
}
