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
    <div className="p-6 max-w-4xl mx-auto space-y-8 relative min-h-screen">
      <div className="fixed inset-0 bg-obsidian-grid pointer-events-none opacity-40" />
      <NotificationContainer />

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary flex items-center justify-center border-4 border-foreground shadow-[4px_4px_0_0_var(--foreground)] rotate-[-3deg]">
            <BookOpen size={28} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
              REVISÃO_LINGUAGENS
            </h1>
            <p className="text-xs text-primary font-mono font-bold tracking-[0.2em] uppercase mt-1">
              9º ANO — PROVA PAULISTA
            </p>
          </div>
        </div>
        {!isSubmitted && (
          <div className="flex items-center gap-3 bg-surface p-3 border-2 border-border shadow-[4px_4px_0_0_var(--border)]">
            <Clock size={16} className="text-primary" />
            <span className="text-xs font-mono font-bold text-white uppercase">Em andamento</span>
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
          <div className="card-brutal bg-surface p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto border-4 border-primary">
              <Award size={40} className="text-primary" />
            </div>
            <div>
              <h2 className="text-4xl font-black text-white uppercase italic">Sua Pontuação: {percent}%</h2>
              <p className="text-muted-foreground font-mono mt-2">Você acertou {score} de {LANGUAGES_9TH_GRADE_QUESTIONS.length} questões.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-background border-2 border-border">
                <BarChart3 size={20} className="text-primary mx-auto mb-2" />
                <div className="text-xl font-bold text-white">{score}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-black">Acertos</div>
              </div>
              <div className="p-4 bg-background border-2 border-border">
                <XCircle size={20} className="text-destructive mx-auto mb-2" />
                <div className="text-xl font-bold text-white">{LANGUAGES_9TH_GRADE_QUESTIONS.length - score}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-black">Erros</div>
              </div>
              <div className="p-4 bg-background border-2 border-border">
                <Clock size={20} className="text-accent mx-auto mb-2" />
                <div className="text-xl font-bold text-white">{Math.round((Date.now() - startTime) / 60000)} min</div>
                <div className="text-[10px] text-muted-foreground uppercase font-black">Tempo</div>
              </div>
            </div>

            <button 
              onClick={resetQuiz}
              className="btn-blood px-8 py-3 w-full sm:w-auto"
            >
              TENTAR NOVAMENTE
            </button>
          </div>

          {/* Revisão Detalhada */}
          <div className="space-y-4">
            <h3 className="text-xl font-black text-white uppercase tracking-widest italic flex items-center gap-3">
              <RotateCcw size={20} className="text-primary" />
              Revisão de Respostas
            </h3>
            {LANGUAGES_9TH_GRADE_QUESTIONS.map((q, idx) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer === q.correctAnswer;
              return (
                <div key={q.id} className={`card-brutal bg-surface p-6 border-l-8 ${isCorrect ? 'border-l-primary' : 'border-l-destructive'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black text-primary font-mono uppercase">Questão {idx + 1}</span>
                    {isCorrect ? (
                      <span className="flex items-center gap-1.5 text-primary text-[10px] font-black uppercase">
                        <CheckCircle2 size={12} /> Correto
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-destructive text-[10px] font-black uppercase">
                        <XCircle size={12} /> Incorreto
                      </span>
                    )}
                  </div>
                  <p className="text-white text-sm font-bold mb-4">{q.text}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className={`p-3 text-xs rounded-sm border-2 ${isCorrect ? 'bg-primary/10 border-primary/20 text-white' : 'bg-destructive/10 border-destructive/20 text-white'}`}>
                      Sua resposta: <span className="font-bold italic">{q.options[userAnswer]}</span>
                    </div>
                    {!isCorrect && (
                      <div className="p-3 text-xs rounded-sm border-2 bg-primary/10 border-primary/20 text-white">
                        Resposta correta: <span className="font-bold italic">{q.options[q.correctAnswer]}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-muted/10 p-4 border-2 border-border flex gap-3">
                    <HelpCircle size={16} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-primary mb-1">Explicação Técnica:</p>
                      <p className="text-[11px] text-muted-foreground italic font-mono">{q.explanation}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      ) : (
        <div className="relative z-10 space-y-6">
          {/* Progresso e Navegação */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                <span className="text-primary">Progresso da Revisão</span>
                <span className="text-white">{currentIdx + 1} de {LANGUAGES_9TH_GRADE_QUESTIONS.length}</span>
              </div>
              <div className="h-3 bg-surface border-2 border-border p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-primary shadow-[0_0_10px_rgba(235,255,0,0.5)]"
                />
              </div>
            </div>
          </div>

          {/* Card da Questão */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="card-brutal bg-surface p-8 min-h-[400px] flex flex-col"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="px-3 py-1 bg-primary text-primary-foreground font-black text-xs italic">
                  Q{currentQuestion.id}
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>

              <h2 className="text-lg md:text-xl font-bold text-white mb-8 leading-relaxed">
                {currentQuestion.text}
              </h2>

              <div className="space-y-3 mt-auto">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = answers[currentQuestion.id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      className={`w-full p-4 text-left text-sm font-bold uppercase transition-all flex items-center gap-4 group border-2 ${
                        isSelected 
                        ? "bg-primary text-primary-foreground border-foreground translate-x-1" 
                        : "bg-background text-muted-foreground border-border hover:border-primary hover:text-white"
                      }`}
                    >
                      <div className={`w-6 h-6 shrink-0 border-2 flex items-center justify-center font-mono text-xs ${
                        isSelected ? "bg-white text-black border-black" : "border-border group-hover:border-primary"
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controles de Navegação Inferior */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="px-6 py-3 border-4 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] bg-surface text-white font-black uppercase text-xs flex items-center gap-2 disabled:opacity-30 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]"
            >
              <ChevronLeft size={16} /> Anterior
            </button>

            {currentIdx === LANGUAGES_9TH_GRADE_QUESTIONS.length - 1 ? (
              <button
                onClick={handleSubmit}
                className="px-8 py-3 bg-primary text-primary-foreground border-4 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] font-black uppercase text-xs flex items-center gap-2 hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                ENTREGAR <Send size={16} />
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-3 border-4 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] bg-surface text-white font-black uppercase text-xs flex items-center gap-2 hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                Próxima <ChevronRight size={16} />
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