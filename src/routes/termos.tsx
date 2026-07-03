import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, FileText, Mail, Users } from "lucide-react";

export const Route = createFileRoute("/termos")({
  component: TermosPage,
  head: () => ({
    meta: [
      { title: "Termos de Uso — Flux Hub" },
      {
        name: "description",
        content:
          "Termos de Uso e Política de Privacidade do Flux Hub — plataforma de automação escolar mantida por DavizinzknGOD.",
      },
      { property: "og:title", content: "Termos de Uso — Flux Hub" },
      { property: "og:url", content: "https://synclabshub.lovable.app/termos" },
    ],
    links: [
      { rel: "canonical", href: "https://synclabshub.lovable.app/termos" },
    ],
  }),
});

const UPDATED_AT = "3 de julho de 2026";

const sections: Array<{ id: string; title: string; body: string[] }> = [
  {
    id: "aceitacao",
    title: "1. Aceitação dos Termos",
    body: [
      "Ao acessar o Flux Hub você concorda com estes Termos de Uso. Se não concordar com qualquer parte, por favor não utilize a plataforma.",
      "Esta página é mantida pelo responsável do projeto (DavizinzknGOD) para responder às dúvidas comuns sobre uso, privacidade e limites de responsabilidade.",
    ],
  },
  {
    id: "servico",
    title: "2. Sobre o Serviço",
    body: [
      "O Flux Hub é uma plataforma independente que automatiza tarefas educacionais públicas (SED, Tarefa SP, Prepara SP, Redação Paulista, Leia SP, Khan Academy e outros). Não temos vínculo, patrocínio ou endosso das secretarias, escolas ou instituições integradas.",
      "O serviço é oferecido \"como está\", sem garantia de disponibilidade contínua. Podemos alterar, suspender ou descontinuar qualquer funcionalidade a qualquer momento.",
    ],
  },
  {
    id: "conta",
    title: "3. Conta e Credenciais",
    body: [
      "Para usar o Flux Hub você fornece seu RA (Registro do Aluno) e senha da SED. Essas credenciais são usadas apenas para autenticar suas requisições — não são compartilhadas com terceiros.",
      "Você é responsável por manter suas credenciais em segurança. Não crie contas com dados de terceiros sem autorização.",
    ],
  },
  {
    id: "uso",
    title: "4. Uso Aceitável",
    body: [
      "Você concorda em não usar o Flux Hub para: (a) violar leis brasileiras; (b) prejudicar terceiros, incluindo outros estudantes; (c) tentar acessar contas alheias; (d) sobrecarregar deliberadamente a infraestrutura; (e) revender ou redistribuir o serviço sem autorização.",
      "O uso das automações é de sua inteira responsabilidade. As respostas geradas por IA podem conter erros e devem ser revisadas antes de serem submetidas oficialmente.",
    ],
  },
  {
    id: "privacidade",
    title: "5. Privacidade e Dados",
    body: [
      "Coletamos apenas o mínimo necessário para operar o serviço: identificador da sessão, RA, e-mail (quando fornecido) e logs técnicos.",
      "Não vendemos, alugamos nem compartilhamos seus dados com fins comerciais. Sua sessão é armazenada localmente no seu navegador e criptografada em trânsito.",
      "Você pode solicitar a exclusão dos seus dados a qualquer momento entrando em contato pelos canais oficiais.",
    ],
  },
  {
    id: "ia",
    title: "6. Conteúdo Gerado por IA",
    body: [
      "Redações, respostas e sugestões geradas por inteligência artificial são apoios de estudo. Você é o autor final e responsável pelo conteúdo entregue.",
      "Recomendamos revisar, adaptar e verificar todo conteúdo antes de submetê-lo como próprio em avaliações oficiais.",
    ],
  },
  {
    id: "responsabilidade",
    title: "7. Limitação de Responsabilidade",
    body: [
      "O Flux Hub é oferecido gratuitamente e sem garantias. Não nos responsabilizamos por perdas acadêmicas, sanções escolares, indisponibilidades dos sistemas integrados, ou qualquer consequência do uso do serviço.",
      "Use com bom senso — automações são ferramentas de produtividade, não substitutos ao aprendizado.",
    ],
  },
  {
    id: "alteracoes",
    title: "8. Alterações destes Termos",
    body: [
      "Estes Termos podem ser atualizados a qualquer momento. A data de última atualização é sempre exibida no topo desta página. O uso contínuo do serviço após alterações significa aceitação da nova versão.",
    ],
  },
  {
    id: "contato",
    title: "9. Contato",
    body: [
      "Dúvidas, pedidos de exclusão de dados ou notificações jurídicas devem ser encaminhados ao responsável pelo projeto:",
      "DavizinzknGOD — pelos canais oficiais da comunidade (Discord Flux Hub).",
    ],
  },
];

function TermosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 55% 40% at 10% 0%, oklch(0.61 0.20 275 / 0.22), transparent 60%), radial-gradient(ellipse 45% 35% at 95% 100%, oklch(0.76 0.13 230 / 0.16), transparent 65%)",
        }}
      />

      <div className="relative">
        {/* Topbar */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border">
          <div className="max-w-4xl mx-auto flex items-center justify-between px-5 sm:px-8 h-14">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-white transition-colors"
            >
              <ArrowLeft size={14} strokeWidth={2} />
              Voltar
            </Link>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-[8px] flex items-center justify-center font-display font-bold text-white text-[13px]"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.61 0.20 275), oklch(0.76 0.13 230))",
                  boxShadow:
                    "0 6px 18px -6px oklch(0.61 0.20 275 / 0.6), inset 0 1px 0 oklch(1 0 0 / 0.22)",
                }}
              >
                F
              </div>
              <span className="text-[13.5px] font-semibold text-white tracking-tight">
                Flux Hub
              </span>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-4xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-10">
          <span className="chip">
            <ShieldCheck size={11} className="text-[oklch(0.76_0.13_230)]" />
            Documento oficial
          </span>
          <h1 className="mt-4 text-[32px] sm:text-[44px] leading-[1.05] font-display font-bold tracking-tight text-white">
            Termos de{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, oklch(0.75 0.15 275), oklch(0.82 0.13 230))",
              }}
            >
              Uso & Privacidade
            </span>
          </h1>
          <p className="mt-4 text-[15px] text-muted-foreground max-w-2xl leading-relaxed">
            Esta página é mantida por{" "}
            <span className="text-white font-medium">DavizinzknGOD</span> para
            responder às dúvidas comuns sobre uso, privacidade e limites de
            responsabilidade do Flux Hub — uma plataforma independente de
            automação escolar.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-[11.5px]">
            <span className="chip">
              <FileText size={10} />
              Última atualização: {UPDATED_AT}
            </span>
            <span className="chip">
              <Users size={10} />
              Projeto independente
            </span>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-4xl mx-auto px-5 sm:px-8 pb-24">
          <div className="grid md:grid-cols-[220px_1fr] gap-10">
            {/* TOC */}
            <nav className="hidden md:block">
              <div className="sticky top-24 space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 pb-2">
                  Índice
                </div>
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block px-2.5 py-1.5 text-[12.5px] text-muted-foreground hover:text-white hover:bg-white/[0.04] rounded-[8px] transition-colors"
                  >
                    {s.title}
                  </a>
                ))}
              </div>
            </nav>

            {/* Body */}
            <div className="space-y-10">
              {sections.map((s) => (
                <article
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-24"
                >
                  <h2 className="text-[19px] sm:text-[21px] font-display font-semibold text-white tracking-tight">
                    {s.title}
                  </h2>
                  <div className="mt-3 space-y-3">
                    {s.body.map((p, i) => (
                      <p
                        key={i}
                        className="text-[14.5px] leading-relaxed text-muted-foreground"
                      >
                        {p}
                      </p>
                    ))}
                  </div>
                </article>
              ))}

              {/* Contact card */}
              <div
                className="mt-8 p-6 rounded-2xl border"
                style={{
                  background:
                    "linear-gradient(180deg, oklch(0.22 0.09 280 / 0.6), oklch(0.14 0.05 278 / 0.6))",
                  borderColor: "oklch(0.61 0.20 275 / 0.25)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.61 0.20 275), oklch(0.76 0.13 230))",
                    }}
                  >
                    <Mail size={17} className="text-white" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14.5px] font-semibold text-white">
                      Fale com o responsável
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                      Para dúvidas, exclusão de dados ou parcerias, procure{" "}
                      <span className="text-white font-medium">
                        DavizinzknGOD
                      </span>{" "}
                      no Discord oficial do Flux Hub.
                    </p>
                    <a
                      href="https://discord.gg/F6JKWpeUSF"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 h-8 px-3 rounded-[8px] text-[12.5px] font-semibold text-white transition-all hover:brightness-110"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.61 0.20 275), oklch(0.76 0.13 230))",
                      }}
                    >
                      Abrir Discord
                    </a>
                  </div>
                </div>
              </div>

              <p className="text-[11.5px] text-muted-foreground/60 pt-4">
                © 2026 Flux Hub · Projeto independente mantido por
                DavizinzknGOD. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
