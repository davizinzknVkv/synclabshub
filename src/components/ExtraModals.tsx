import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Heart, 
  MessageCircle, 
  Gamepad2, 
  ListTodo, 
  Copy, 
  ExternalLink,
  Sparkles,
  Zap,
  ShieldCheck,
  Code,
  GraduationCap
} from "lucide-react";
import { notify } from "@/components/Notification";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DonationModal({ open, onOpenChange }: ModalProps) {
  const pixKey = "davizinzkn@gmail.com"; // Exemplo de chave PIX

  const copyPix = () => {
    navigator.clipboard.writeText(pixKey);
    notify("CHAVE PIX COPIADA!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 sm:rounded-3xl max-w-md p-0 overflow-hidden">
        <div className="absolute inset-0 bg-aurora opacity-30 pointer-events-none" />
        <div className="relative p-6 space-y-6">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-500 mx-auto sm:mx-0">
              <Heart size={24} fill="currentColor" />
            </div>
            <DialogTitle className="text-2xl font-black text-white tracking-tighter uppercase italic">
              Apoie nosso projeto
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Sua contribuição é fundamental para mantermos os servidores ativos e continuarmos desenvolvendo novas automações gratuitamente para todos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                <span>Chave PIX (E-mail)</span>
                <span className="text-pink-400">Flux Hub Dev</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 font-mono text-sm text-white bg-black/40 p-3 rounded-xl border border-white/5 break-all">
                  {pixKey}
                </div>
                <button
                  onClick={copyPix}
                  className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/30 transition-all shrink-0"
                  title="Copiar Chave"
                >
                  <Copy size={20} />
                </button>
              </div>
            </div>

            <button
              onClick={copyPix}
              className="btn-premium w-full py-4 text-xs flex items-center justify-center gap-2"
            >
              <Copy size={16} /> COPIAR CHAVE PIX
            </button>
            <p className="text-[10px] text-center text-muted-foreground font-mono uppercase tracking-widest">
              Obrigado por fortalecer a comunidade!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DiscordModal({ open, onOpenChange }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 sm:rounded-3xl max-w-md p-0 overflow-hidden">
        <div className="absolute inset-0 bg-aurora opacity-30 pointer-events-none" />
        <div className="relative p-6 space-y-6">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center text-[#5865F2] mx-auto sm:mx-0">
              <MessageCircle size={24} fill="currentColor" />
            </div>
            <DialogTitle className="text-2xl font-black text-white tracking-tighter uppercase italic">
              Comunidade Oficial
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Junte-se ao nosso servidor para suporte em tempo real, sugestões de novos scripts, avisos de atualizações e para interagir com outros usuários.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                <p className="text-lg font-black text-white leading-none">1.2k+</p>
                <p className="text-[10px] text-muted-foreground uppercase font-mono mt-1">Membros</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                <p className="text-lg font-black text-emerald-400 leading-none">24/7</p>
                <p className="text-[10px] text-muted-foreground uppercase font-mono mt-1">Suporte</p>
              </div>
            </div>

            <a
              href="https://discord.gg/y5tNWGVPSU"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#5865F2]/20"
            >
              <MessageCircle size={16} fill="currentColor" /> Entrar no Discord
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PartnerModal({ open, onOpenChange }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 sm:rounded-3xl max-w-lg p-0 overflow-hidden">
        <div className="absolute inset-0 bg-aurora opacity-40 pointer-events-none" />
        <div className="relative">
          {/* Banner Placeholder */}
          <div className="h-40 bg-gradient-to-br from-violet-600/40 to-cyan-500/40 border-b border-white/10 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
            <Gamepad2 size={64} className="text-white/20 animate-pulse" />
            <div className="absolute bottom-4 left-6">
              <span className="px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-mono text-cyan-400 uppercase tracking-widest">
                Parceiro Premium
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-black text-white tracking-tighter uppercase italic">
                Conheça nosso Parceiro
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                A <strong>Gamer Community Hub</strong> é nossa parceira oficial para eventos e sorteios. Um ambiente focado em alto desempenho e interatividade.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Sparkles size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white uppercase tracking-tight">Benefícios Exclusivos</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Sorteios mensais de Nitro e skins para apoiadores Flux.</p>
                </div>
              </div>

              <a
                href="#"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-400 hover:from-cyan-500 hover:to-cyan-300 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20 border border-cyan-400/30"
              >
                <ExternalLink size={16} /> Acessar Servidor
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RoadmapModal({ open, onOpenChange }: ModalProps) {
  const futureScripts = [
    { title: "Moodle SP Auto", icon: Zap, desc: "Automação para trilhas Moodle." },
    { title: "Apostilas AI", icon: Code, desc: "Resolução de apostilas via IA." },
    { title: "Monitor de Notas", icon: ShieldCheck, desc: "Notificações de novas notas." },
    { title: "Flux App Mobile", icon: GraduationCap, desc: "Aplicativo nativo iOS/Android." },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 sm:rounded-3xl max-w-md p-0 overflow-hidden">
        <div className="absolute inset-0 bg-aurora opacity-30 pointer-events-none" />
        <div className="relative p-6 space-y-6">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary mx-auto sm:mx-0">
              <ListTodo size={24} />
            </div>
            <DialogTitle className="text-2xl font-black text-white tracking-tighter uppercase italic">
              Próximos Lançamentos
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed font-mono uppercase tracking-widest text-[10px]">
              Roadmap de Desenvolvimento 2026
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {futureScripts.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.06] transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <item.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white truncate">{item.title}</p>
                    <span className="px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-[8px] font-black uppercase tracking-tighter text-primary backdrop-blur-md">
                      Em breve
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-primary/5 border border-dashed border-primary/20 text-center">
            <p className="text-[10px] text-primary font-mono font-bold uppercase tracking-[0.2em]">
              Sugerir nova funcionalidade no Discord
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
