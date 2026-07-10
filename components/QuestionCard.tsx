"use client";

interface QuestionCardProps {
  statement: string;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: boolean) => void;
  isLoading: boolean;
  feedback: {
    isCorrect: boolean;
    explanation: string;
  } | null;
  onNext: () => void;
}

export default function QuestionCard({
  statement,
  questionNumber,
  totalQuestions,
  onAnswer,
  isLoading,
  feedback,
  onNext,
}: QuestionCardProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progreso */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>
            Pregunta {questionNumber} de {totalQuestions}
          </span>
          <span>{Math.round((questionNumber / totalQuestions) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Afirmación */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
        <p className="text-xl md:text-2xl font-medium text-center leading-relaxed">
          {statement}
        </p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-xl p-4 mb-6 ${
            feedback.isCorrect
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <p
            className={`font-semibold mb-1 ${
              feedback.isCorrect ? "text-green-700" : "text-red-700"
            }`}
          >
            {feedback.isCorrect ? "¡Correcto!" : "Incorrecto"}
          </p>
          <p className="text-gray-700 text-sm">{feedback.explanation}</p>
        </div>
      )}

      {/* Botones */}
      {!feedback ? (
        <div className="flex gap-4">
          <button
            onClick={() => onAnswer(true)}
            disabled={isLoading}
            className="flex-1 py-4 px-6 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-lg"
          >
            Verdadero
          </button>
          <button
            onClick={() => onAnswer(false)}
            disabled={isLoading}
            className="flex-1 py-4 px-6 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-lg"
          >
            Falso
          </button>
        </div>
      ) : (
        <button
          onClick={onNext}
          className="w-full py-4 px-6 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors text-lg"
        >
          {questionNumber < totalQuestions ? "Siguiente pregunta" : "Ver resultados"}
        </button>
      )}
    </div>
  );
}
