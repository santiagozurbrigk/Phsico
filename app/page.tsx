"use client";

import { useCallback, useEffect, useState } from "react";
import QuestionCard from "@/components/QuestionCard";
import ResultScreen from "@/components/ResultScreen";
import CountdownTimer from "@/components/CountdownTimer";
import PaywallScreen from "@/components/PaywallScreen";

interface SafeQuestion {
  id: number;
  statement: string;
}

type GameState = "loading" | "playing" | "results" | "paywall" | "error";

export default function GamePage() {
  const [gameState, setGameState] = useState<GameState>("loading");
  const [questions, setQuestions] = useState<SafeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    explanation: string;
  } | null>(null);
  const [nextResetAt, setNextResetAt] = useState(0);
  const [access, setAccess] = useState<"free" | "premium" | "paywall">("free");
  const [topic, setTopic] = useState("Psicología");
  const [errorMessage, setErrorMessage] = useState("");

  const loadQuestions = useCallback(async () => {
    setGameState("loading");
    setCurrentIndex(0);
    setScore(0);
    setFeedback(null);

    try {
      const res = await fetch("/api/questions");
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Error al cargar preguntas");
        setGameState("error");
        return;
      }

      if (data.access === "paywall") {
        setTopic(data.topic);
        setAccess("paywall");
        setGameState("paywall");
        return;
      }

      setQuestions(data.questions);
      setNextResetAt(data.nextResetAt);
      setAccess(data.access);
      setGameState("playing");
    } catch {
      setErrorMessage("Error de conexión. Intentá de nuevo.");
      setGameState("error");
    }
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  async function handleAnswer(answer: boolean) {
    setIsLoading(true);

    try {
      const res = await fetch("/api/check-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: questions[currentIndex].id,
          answer,
        }),
      });

      const data = await res.json();

      if (data.isCorrect) {
        setScore((s) => s + 1);
      }

      setFeedback({
        isCorrect: data.isCorrect,
        explanation: data.explanation,
      });
    } catch {
      setFeedback({
        isCorrect: false,
        explanation: "Error al verificar la respuesta.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNext() {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setFeedback(null);
    } else {
      // Juego completado
      if (access === "free") {
        await fetch("/api/complete-game", { method: "POST" });
      }
      setGameState("results");
    }
  }

  if (gameState === "loading") {
    return (
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Cargando preguntas...</p>
        <p className="text-xs text-gray-400 mt-2">
          La IA está generando preguntas, esto puede tardar unos segundos
        </p>
      </div>
    );
  }

  if (gameState === "error") {
    return (
      <div className="text-center max-w-md">
        <p className="text-red-600 mb-4">{errorMessage}</p>
        <button
          onClick={loadQuestions}
          className="px-6 py-3 bg-primary text-white rounded-xl font-semibold"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (gameState === "paywall") {
    return <PaywallScreen topic={topic} />;
  }

  if (gameState === "results") {
    return (
      <ResultScreen
        score={score}
        total={questions.length}
        isPremium={access === "premium"}
        showPaywallMessage={access === "free"}
        onPlayAgain={access === "premium" ? loadQuestions : undefined}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto mb-4 flex justify-between items-center">
        <CountdownTimer nextResetAt={nextResetAt} onReset={loadQuestions} />
        {access === "premium" && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
            Premium
          </span>
        )}
      </div>
      <QuestionCard
        statement={questions[currentIndex].statement}
        questionNumber={currentIndex + 1}
        totalQuestions={questions.length}
        onAnswer={handleAnswer}
        isLoading={isLoading}
        feedback={feedback}
        onNext={handleNext}
      />
    </div>
  );
}
