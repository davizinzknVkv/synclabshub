import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, X } from "lucide-react";
import logo from "@/assets/logo.png";
import { loginAndFetchTasks, sendTasksToCatalyst } from "@/lib/api";
import type { TaskItem } from "@/lib/api";
import { NotificationContainer, notify } from "@/components/Notification";
import { VerifyBox } from "@/components/VerifyBox";
import { TaskModal } from "@/components/TaskModal";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "SYNC LABS HUB - A Revolução da Sala do Futuro" },
      { name: "description", content: "SYNC LABS HUB - Sala do Futuro CMSP WEB / Tarefas SP" },
    ],
  }),
});

function Index() {
  const [ra, setRa] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSearch = useCallback(async (filter: "pending" | "expired") => {
    if (loading) { notify("OPERAÇÃO EM ANDAMENTO"); return; }
    if (!ra.trim()) { notify("PREENCHA O RA"); return; }
    if (!pwd.trim()) { notify("PREENCHA A SENHA"); return; }

    setLoading(true);
    try {
      const result = await loginAndFetchTasks(ra.trim(), pwd.trim(), filter, notify);
      setTasks(result);
      setModalOpen(true);
      notify(`${result.length} LIÇÕES ENCONTRADAS`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "ERRO AO BUSCAR ATIVIDADES");
    } finally {
      setLoading(false);
    }
  }, [ra, pwd, loading]);

  const handleSubmit = useCallback(async (selectedTasks: TaskItem[], isDraft: boolean, minTime: number, maxTime: number) => {
    setModalOpen(false);
    await sendTasksToCatalyst(selectedTasks, isDraft, minTime, maxTime, ra.trim(), notify);
  }, [ra]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm flex flex-col items-center gap-1"
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-4xl font-bold animate-gradient">SYNC LABS</h1>
          <img src={logo} alt="SYNC LABS" className="w-11 h-11 -rotate-12" />
        </div>
        <p className="text-sm text-muted-foreground mb-6">Sala do Futuro — CMSP WEB / Tarefas SP</p>

        {/* Form */}
        <div className="w-full space-y-4">
          {/* RA */}
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">RA</label>
            <div className="relative">
              <input
                type="text"
                value={ra}
                onChange={e => setRa(e.target.value)}
                placeholder="RA + Dígito + UF"
                className="w-full px-4 py-3 pr-10 rounded-lg bg-transparent border border-input text-foreground outline-none focus:border-primary transition-colors"
              />
              {ra && (
                <button onClick={() => setRa("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Senha</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full px-4 py-3 pr-10 rounded-lg bg-transparent border border-input text-foreground outline-none focus:border-primary transition-colors"
              />
              {pwd && (
                <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              disabled={!verified || loading}
              onClick={() => handleSearch("pending")}
              className="w-full py-3 bg-secondary hover:bg-surface-hover rounded-lg font-semibold text-secondary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Carregando..." : "Atividades Pendentes"}
            </button>

            <VerifyBox onVerified={() => setVerified(true)} />

            <button
              disabled={!verified || loading}
              onClick={() => handleSearch("expired")}
              className="w-full py-3 bg-secondary hover:bg-surface-hover rounded-lg font-semibold text-secondary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Atividades Expiradas
            </button>
          </div>
        </div>

        {/* Discord */}
        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <span className="text-muted-foreground">Entre no nosso servidor do Discord</span>
          <a
            href="https://discord.gg/yXYKSZAK9Z"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-semibold animate-gradient"
          >
            DISCORD BETA
          </a>
        </div>
      </motion.div>

      <TaskModal open={modalOpen} tasks={tasks} onClose={() => setModalOpen(false)} onSubmit={handleSubmit} />
      <NotificationContainer />
    </div>
  );
}
