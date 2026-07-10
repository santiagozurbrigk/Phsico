"use client";

import MercadoPagoButton from "./MercadoPagoButton";

interface PaywallScreenProps {
  topic: string;
}

export default function PaywallScreen({ topic }: PaywallScreenProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold mb-3">Ya usaste tu partida gratis</h2>

        <p className="text-gray-600 mb-6 leading-relaxed">
          Activá el acceso ilimitado para seguir jugando con preguntas nuevas
          cada 20 minutos, generadas por IA a partir del material de{" "}
          <strong>{topic}</strong>.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-3xl font-bold text-primary mb-1">$1.000 ARS</p>
          <p className="text-sm text-gray-500">Pago único · Acceso ilimitado</p>
        </div>

        <ul className="text-left text-sm text-gray-600 space-y-2 mb-8">
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            Partidas ilimitadas mientras dure el set de preguntas
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            Preguntas nuevas generadas por IA cada 20 minutos
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            Basadas en el material de estudio actualizado
          </li>
        </ul>

        <MercadoPagoButton />

        <p className="text-xs text-gray-400 mt-4">
          Serás redirigido a Mercado Pago para completar el pago de forma segura.
        </p>
      </div>
    </div>
  );
}
