import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  CheckSquare,
  PenTool,
  MessageCircle,
  Heart,
  LogOut,
  Menu,
  X,
  GraduationCap,
  FileText,
  Lock,
  LayoutGrid,
  Gamepad2,
  Search,
  Command,
  ChevronsUpDown,
  Circle,
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
  RoadmapModal,
} from "./ExtraModals";

type NavKey = "scripts_enabled" | "preparasp_enabled";

const NAV_ITEMS: Array<{
  title: string;
  url: string;
  icon: typeof Home;
  key?: NavKey;
  shortcut?: string;
}> = [
  { title: "Overview", url: "/dashboard", icon: Home, shortcut: "O" },
  { title: "Tarefa SP", url: "/dashboard/tarefas", icon: CheckSquare, key: "scripts_enabled", shortcut: "T" },
  { title: "Prepara SP", url: "/dashboard/preparasp", icon: GraduationCap, key: "preparasp_enabled", shortcut: "P" },
  { title: "Redação", url: "/dashboard/redacao", icon: PenTool, key: "scripts_enabled", shortcut: "R" },
  { title: "Boletim", url: "/dashboard/boletim", icon: FileText, shortcut: "B" },
];

function FluxMark({ size = 28 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-[9px] flex-shrink-0 font-display font-black text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background:
          "linear-gradient(135deg, oklch(0.62 0.24 292), oklch(0.58 0.22 262))",
        boxShadow:
          "0 6px 20px -6px oklch(0.58 0.24 292 / 0.55), inset 0 1px 0 oklch(1 0 0 / 0.22)",
      }}
    >
      F
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
      {children}
    </div>
  );
}

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const session = getSession();
  const displayName = session?.nick || session?.ra || "Aluno";
  const initials = displayName.slice(0, 2).toUpperCase();

  const [donationOpen, setDonationOpen] = useState(false);
  const [discordOpen, setDiscordOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("*")
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as unknown as Record<string, boolean>);
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

  const NavItem = ({
    item,
    onClick,
  }: {
    item: (typeof NAV_ITEMS)[number];
    onClick?: () => void;
  }) => {
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
        className={`group relative flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] text-[13px] font-medium transition-all ${
          active
            ? "text-white bg-white/[0.06] shadow-[inset_0_0_0_1px_oklch(0.58_0.24_292_/_0.30)]"
            : isBlocked
              ? "opacity-40 cursor-not-allowed text-muted-foreground/70"
              : "text-muted-foreground hover:text-white hover:bg-white/[0.035]"
        }`}
      >
        {active && (
          <motion.span
            layoutId="nav-marker"
            className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-r-full bg-gradient-to-b from-[oklch(0.62_0.24_292)] to-[oklch(0.58_0.22_262)]"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <item.icon
          size={15}
          strokeWidth={1.8}
          className={active ? "text-white" : "text-muted-foreground/70 group-hover:text-white"}
        />
        <span className="flex-1 truncate">{item.title}</span>
        {isBlocked ? (
          <Lock size={11} className="text-muted-foreground/50" />
        ) : item.shortcut ? (
          <span className="kbd-key opacity-0 group-hover:opacity-100 transition-opacity">
            {item.shortcut}
          </span>
        ) : null}
      </Link>
    );
  };

  const SidebarBody = ({ onClose }: { onClose?: () => void }) => (
    <>
      {/* Workspace switcher */}
      <div className="px-3 pt-3 pb-2">
        <button className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[10px] hover:bg-white/[0.035] transition-colors ring-focus">
          <FluxMark size={26} />
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[13px] font-semibold text-white leading-tight truncate">
              Flux Hub
            </div>
            <div className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5">
              Workspace pessoal
            </div>
          </div>
          <ChevronsUpDown size={13} className="text-muted-foreground/50" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] bg-white/[0.025] hairline text-[12px] text-muted-foreground/70">
          <Search size={13} strokeWidth={1.8} />
          <span className="flex-1">Buscar</span>
          <span className="kbd-key">
            <Command size={9} strokeWidth={2.5} />K
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        <SectionLabel>Plataforma</SectionLabel>
        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.url} item={item} onClick={onClose} />
          ))}
        </div>

        <SectionLabel>Recursos</SectionLabel>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => {
              setRoadmapOpen(true);
              onClose?.();
            }}
            className="group flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] text-[13px] font-medium text-muted-foreground hover:text-white hover:bg-white/[0.035] transition-all"
          >
            <LayoutGrid size={15} strokeWidth={1.8} className="text-muted-foreground/70 group-hover:text-white" />
            <span className="flex-1 text-left">Roadmap</span>
            <span className="chip !py-0 !px-1.5 !text-[9px] text-[oklch(0.72_0.15_290)] bg-[oklch(0.58_0.24_292_/_0.14)] border-[oklch(0.58_0.24_292_/_0.25)]">
              Novo
            </span>
          </button>
          <button
            onClick={() => {
              setPartnerOpen(true);
              onClose?.();
            }}
            className="group flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] text-[13px] font-medium text-muted-foreground hover:text-white hover:bg-white/[0.035] transition-all"
          >
            <Gamepad2 size={15} strokeWidth={1.8} className="text-muted-foreground/70 group-hover:text-white" />
            <span className="flex-1 text-left">Parceria</span>
          </button>
        </div>

        <SectionLabel>Comunidade</SectionLabel>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => {
              setDiscordOpen(true);
              onClose?.();
            }}
            className="group flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] text-[13px] font-medium text-muted-foreground hover:text-white hover:bg-white/[0.035] transition-all"
          >
            <MessageCircle size={15} strokeWidth={1.8} className="text-muted-foreground/70 group-hover:text-white" />
            <span className="flex-1 text-left">Discord</span>
            <Circle size={5} fill="currentColor" className="text-emerald-400" />
          </button>
          <button
            onClick={() => {
              setDonationOpen(true);
              onClose?.();
            }}
            className="group flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] text-[13px] font-medium text-muted-foreground hover:text-white hover:bg-white/[0.035] transition-all"
          >
            <Heart size={15} strokeWidth={1.8} className="text-muted-foreground/70 group-hover:text-white" />
            <span className="flex-1 text-left">Apoiar</span>
          </button>
        </div>
      </nav>

      {/* User chip */}
      <div className="hairline-t px-3 py-3">
        <div className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-[10px] hover:bg-white/[0.035] transition-colors group">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.62 0.24 292), oklch(0.58 0.22 262))",
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-white leading-tight truncate">
              {displayName}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 leading-tight mt-0.5">
              <Circle size={5} fill="currentColor" className="text-emerald-400" />
              Online
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={13} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile top bar */}
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 h-[52px] surface-1 hairline-b">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            <Menu size={18} />
          </button>
          <FluxMark size={24} />
          <span className="text-[13px] font-semibold text-white tracking-tight">
            Flux Hub
          </span>
          <div className="ml-auto flex items-center gap-1.5 chip">
            <Circle size={6} fill="currentColor" className="text-emerald-400" />
            Online
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            >
              <motion.aside
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="absolute left-0 top-0 bottom-0 w-[280px] surface-1 hairline-r flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1.5 rounded-md text-muted-foreground/70 hover:text-white hover:bg-white/[0.05] transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
                <SidebarBody onClose={() => setMobileOpen(false)} />
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

  return (
    <>
      <aside className="relative flex flex-col h-screen w-[248px] surface-1 hairline-r flex-shrink-0">
        <SidebarBody />
      </aside>

      <DonationModal open={donationOpen} onOpenChange={setDonationOpen} />
      <DiscordModal open={discordOpen} onOpenChange={setDiscordOpen} />
      <PartnerModal open={partnerOpen} onOpenChange={setPartnerOpen} />
      <RoadmapModal open={roadmapOpen} onOpenChange={setRoadmapOpen} />
    </>
  );
}
