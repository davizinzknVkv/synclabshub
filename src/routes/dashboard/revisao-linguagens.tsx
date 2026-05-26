import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, CheckCircle2, XCircle, ChevronLeft, ChevronRight, 
  Send, RotateCcw, Award, HelpCircle, BarChart3, Clock
} from "lucide-react";
import { NotificationContainer, notify } from "@/components/Notification";

// --- Dados das Questões (Simulado conforme requisitos) ---
interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number; // Índice da opção correta
  explanation: string;
}

const LANGUAGES_9TH_GRADE_QUESTIONS: Question[] = [
  {
    id: 1,
    text: "No trecho: 'A tecnologia avançou de tal forma que as fronteiras geográficas tornaram-se irrelevantes', a conjunção 'que' estabelece uma relação de:",
    options: ["Causa", "Consequência", "Oposição", "Concessão"],
    correctAnswer: 1,
    explanation: "A estrutura 'de tal forma... que' introduz uma oração subordinada adverbial consecutiva, indicando uma consequência."
  },
  {
    id: 2,
    text: "Qual das alternativas abaixo apresenta uma figura de linguagem conhecida como Metáfora?",
    options: [
      "O sol sorriu para mim esta manhã.",
      "Seus olhos são dois faróis a iluminar meu caminho.",
      "O som do silêncio era ensurdecedor.",
      "Comprei um 'Bombril' para lavar a louça."
    ],
    correctAnswer: 1,
    explanation: "A metáfora é uma comparação implícita, sem conectivos. 'Olhos são faróis' afirma a identidade direta entre os dois elementos."
  },
  {
    id: 3,
    text: "Identifique a oração que apresenta um predicado verbo-nominal:",
    options: [
      "Os alunos estudaram para a prova.",
      "Os alunos estavam ansiosos.",
      "Os alunos saíram da prova satisfeitos.",
      "A prova foi difícil."
    ],
    correctAnswer: 2,
    explanation: "No predicado verbo-nominal, temos um verbo de ação (saíram) e um predicativo do sujeito (satisfeitos) ocorrendo simultaneamente."
  },
  {
    id: 4,
    text: "Na frase 'Vende-se esta casa', a partícula 'se' exerce a função de:",
    options: [
      "Índice de indeterminação do sujeito",
      "Pronome reflexivo",
      "Partícula apassivadora",
      "Conjunção condicional"
    ],
    correctAnswer: 2,
    explanation: "Com verbos transitivos diretos (vender), o 'se' atua como partícula apassivadora, tornando o objeto direto (casa) no sujeito paciente."
  },
  {
    id: 5,
    text: "Assinale a alternativa que contém apenas palavras oxítonas:",
    options: [
      "Café, Rapaz, Caju",
      "Lápis, Árvore, Chulé",
      "Ônibus, Relógio, Tatú",
      "Página, História, Além"
    ],
    correctAnswer: 0,
    explanation: "Oxítonas são palavras cuja sílaba tônica é a última. Café (acentuada), Rapaz (terminada em Z) e Caju (terminada em U) seguem essa regra."
  }
];

export const Route = createFileRoute("/dashboard/revisao-linguagens")({
  component: RevisaoLinguagensPage,
  head: () => ({
    meta: [{ title: "Revisão Prova Paulista - Linguagens" }],
  }),
});

function RevisaoLinguagensPage() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [startTime] = useState(Date.now());

  const currentQuestion = LANGUAGES_9TH_GRADE_QUESTIONS[currentIdx];
  const progress = ((currentIdx + 1) / LANGUAGES_9TH_GRADE_QUESTIONS.length) * 100;

  const score = useMemo(() => {
    let count = 0;
    LANGUAGES_9TH_GRADE_QUESTIONS.forEach(q => {
      if (answers[q.id] === q.correctAnswer) count++;
    });
    return count;
  }, [answers]);

  const percent = Math.round((score / LANGUAGES_9TH_GRADE_QUESTIONS.length) * 100);

  const handleAnswer = (optionIdx: number) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionIdx }));
  };

  const handleNext = () => {
    if (currentIdx < LANGUAGES_9TH_GRADE_QUESTIONS.length - 1) {
      setCurrentIdx(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < LANGUAGES_9TH_GRADE_QUESTIONS.length) {
      notify("POR FAVOR, RESPONDA TODAS AS QUESTÕES ANTES DE ENTREGAR.");
      return;
    }
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    notify("AVALIAÇÃO CONCLUÍDA COM SUCESSO!");
  };

  const resetQuiz = () => {
    setAnswers({});
    setIsSubmitted(false);
    setCurrentIdx(0);
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10 min-h-screen bg-aurora relative overflow-hidden">
      <div className="fixed inset-0 bg-grid-dots pointer-events-none opacity-20" />
      <NotificationContainer />

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-hero p-0.5 shadow-glow-violet rotate-[-3deg]">
            <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
              <BookOpen size={32} className="text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
              REVISÃO_HUB
            </h1>
            <p className="text-xs text-primary font-mono font-bold tracking-[0.3em] uppercase mt-2 opacity-80">
              9º ANO — LINGUAGENS • PROVA PAULISTA
            </p>
          </div>
        </div>
        {!isSubmitted && (
          <div className="flex items-center gap-3 glass px-5 py-3 rounded-2xl border-surface-border/50">
            <Clock size={16} className="text-primary animate-pulse" />
            <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">Avaliação em Curso</span>
          </div>
        )}
      </header>

      {isSubmitted ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 space-y-8"
        >
          {/* Dashboard de Resultados */}
          <div className="glass-strong p-10 md:p-16 text-center space-y-8 rounded-3xl border-surface-border/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
            <div className="w-24 h-24 bg-surface border-2 border-primary rounded-3xl flex items-center justify-center mx-auto shadow-glow-violet rotate-[-6deg]">
              <Award size={48} className="text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter">Score: {percent}%</h2>
              <p className="text-sm text-muted-foreground font-mono uppercase tracking-[0.2em] opacity-70">Desempenho Validado no Sistema</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[
                { icon: BarChart3, label: "Acertos", value: score, color: "text-emerald-400" },
                { icon: XCircle, label: "Erros", value: LANGUAGES_9TH_GRADE_QUESTIONS.length - score, color: "text-red-400" },
                { icon: Clock, label: "Tempo", value: `${Math.round((Date.now() - startTime) / 60000)} min`, color: "text-accent" },
              ].map((item, i) => (
                <div key={i} className="glass p-6 rounded-2xl border-surface-border/40 space-y-2">
                  <item.icon size={20} className={`${item.color} mx-auto mb-1`} />
                  <div className="text-2xl font-black text-white">{item.value}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{item.label}</div>
                </div>
              ))}
            </div>

            <button 
              onClick={resetQuiz}
              className="btn-premium px-12 py-4 w-full sm:w-auto text-xs"
            >
              REINICIAR AVALIAÇÃO
            </button>
          </div>

          {/* Revisão Detalhada */}
          <div className="space-y-6">
            <div className="flex items-center gap-4 px-2">
              <RotateCcw size={20} className="text-primary" />
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Revisão Analítica de Questões</h3>
            </div>
            <div className="grid gap-6">
              {LANGUAGES_9TH_GRADE_QUESTIONS.map((q, idx) => {
                const userAnswer = answers[q.id];
                const isCorrect = userAnswer === q.correctAnswer;
                return (
                  <div key={q.id} className={`card-premium p-8 border-l-4 ${isCorrect ? 'border-l-emerald-500/50' : 'border-l-red-500/50'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-[10px] font-black text-primary font-mono uppercase tracking-[0.3em]">Questão #{idx + 1}</span>
                      {isCorrect ? (
                        <span className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                          <CheckCircle2 size={12} /> Sucesso
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-red-400 text-[10px] font-black uppercase tracking-widest bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                          <XCircle size={12} /> Falha
                        </span>
                      )}
                    </div>
                    <p className="text-white text-base font-bold mb-6 leading-relaxed">{q.text}</p>
                    
                    <div className="grid sm:grid-cols-2 gap-4 mb-8">
                      <div className={`p-4 rounded-2xl border-2 ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70">Sua resposta</p>
                        <p className="text-sm font-bold">{q.options[userAnswer]}</p>
                      </div>
                      {!isCorrect && (
                        <div className="p-4 rounded-2xl border-2 bg-emerald-500/5 border-emerald-500/20 text-emerald-400">
                          <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70">Gabarito Oficial</p>
                          <p className="text-sm font-bold">{q.options[q.correctAnswer]}</p>
                        </div>
                      )}
                    </div>

                    <div className="glass p-6 rounded-2xl border-primary/20 flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <HelpCircle size={20} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-primary mb-1 tracking-widest">Base de Conhecimento:</p>
                        <p className="text-xs text-muted-foreground leading-relaxed italic">{q.explanation}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="relative z-10 space-y-8">
          {/* Progresso e Navegação */}
          <div className="glass p-5 rounded-2xl border-surface-border/50">
            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest mb-3">
              <span className="text-primary">Evolução da Prova</span>
              <span className="text-white opacity-80">{currentIdx + 1} de {LANGUAGES_9TH_GRADE_QUESTIONS.length} Questões</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden border border-surface-border/30">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-primary shadow-glow-violet"
              />
            </div>
          </div>

          {/* Card da Questão */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="card-premium p-8 md:p-12 min-h-[450px] flex flex-col border-surface-border/50"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="px-4 py-1.5 bg-primary/20 text-primary rounded-xl font-black text-xs italic border border-primary/30 tracking-widest shadow-glow-violet/10">
                  QUESTÃO #{currentQuestion.id}
                </div>
                <div className="h-px flex-1 bg-surface-border/30" />
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-white mb-10 leading-tight tracking-tight">
                {currentQuestion.text}
              </h2>

              <div className="grid gap-4 mt-auto">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = answers[currentQuestion.id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      className={`w-full p-5 text-left text-sm font-bold uppercase transition-all flex items-center gap-5 group rounded-2xl border-2 ${
                        isSelected 
                        ? "bg-primary/20 text-white border-primary shadow-glow-violet/20 translate-x-1" 
                        : "bg-surface/50 text-muted-foreground border-surface-border hover:border-primary/50 hover:text-white"
                      }`}
                    >
                      <div className={`w-8 h-8 shrink-0 rounded-xl border-2 flex items-center justify-center font-black text-xs transition-all ${
                        isSelected ? "bg-primary text-white border-primary" : "border-surface-border group-hover:border-primary/50"
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controles de Navegação Inferior */}
          <div className="flex items-center justify-between gap-6 pt-4">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="px-8 py-4 glass hover:bg-surface rounded-2xl border-surface-border text-white font-black uppercase text-xs flex items-center gap-3 disabled:opacity-30 transition-all hover:translate-x-[-2px]"
            >
              <ChevronLeft size={18} /> Anterior
            </button>

            {currentIdx === LANGUAGES_9TH_GRADE_QUESTIONS.length - 1 ? (
              <button
                onClick={handleSubmit}
                className="btn-premium px-10 py-4 text-xs flex items-center gap-3"
              >
                FINALIZAR AVALIAÇÃO <Send size={18} />
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-8 py-4 glass hover:bg-surface rounded-2xl border-surface-border text-white font-black uppercase text-xs flex items-center gap-3 transition-all hover:translate-x-[2px]"
              >
                Próxima Questão <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer Técnico */}
      <footer className="relative z-10 pt-10 border-t-2 border-border flex flex-col sm:flex-row justify-between items-center gap-4 opacity-50">
        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
          Validator System v1.0.4 — deterministic engine
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-mono text-white">SYNCED</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default RevisaoLinguagensPage;