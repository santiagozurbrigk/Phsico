"use client";

interface ResultScreenProps {
  score: number;
  total: number;
  onPlayAgain?: () => void;
  isPremium: boolean;
  showPaywallMessage?: boolean;
}

export default function ResultScreen({
  score,
  total,
  onPlayAgain,
  isPremium,
  showPaywallMessage,
}: ResultScreenProps) {
  const percentage = Math.round((score / total) * 100);

  let message = "";
  if (percentage >= 90) message = "¡Excelente! Dominás el tema.";
  else if (percentage >= 70) message = "¡Muy bien! Buen conocimiento.";
  else if (percentage >= 50) message = "Regular. Seguí practicando.";
  else message = "Necesitás repasar el material.";

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-2">Resultado</h2>
        <p className="text-gray-500 mb-6">{message}</p>

        <div className="relative w-40 h-40 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={percentage >= 70 ? "#10b981" : percentage >= 50 ? "#f59e0b" : "#ef4444"}
              strokeWidth="8"
              strokeDasharray={`${percentage * 2.83} 283`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold">{percentage}%</span>
          </div>
        </div>

        <p className="text-lg mb-6">
          Respondiste correctamente{" "}
          <span className="font-bold text-primary">
            {score} de {total}
          </span>
        </p>

        {showPaywallMessage && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-amber-800 text-sm">
              Usaste tu partida gratis. Para seguir jugando con preguntas nuevas
              cada 20 minutos, activá el acceso ilimitado.
            </p>
          </div>
        )}

        {isPremium && onPlayAgain && (
          <button
            onClick={onPlayAgain}
            className="w-full py-3 px-6 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors"
          >
            Jugar de nuevo
          </button>
        )}

        {!isPremium && !showPaywallMessage && (
          <p className="text-sm text-gray-500">
            Las preguntas se renuevan cada 20 minutos.
          </p>
        )}
      </div>
    </div>
  );
}
