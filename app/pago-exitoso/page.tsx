"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PagoExitosoPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "confirmed" | "pending">(
    "checking"
  );
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 8; // ~16 segundos con polling cada 2s

  useEffect(() => {
    if (status !== "checking") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/user-status");
        const data = await res.json();

        if (data.isPremium) {
          setStatus("confirmed");
          clearInterval(interval);
          setTimeout(() => router.push("/"), 1500);
          return;
        }

        setAttempts((a) => {
          const next = a + 1;
          if (next >= MAX_ATTEMPTS) {
            setStatus("pending");
            clearInterval(interval);
          }
          return next;
        });
      } catch {
        // Continuar intentando
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status, router]);

  return (
    <div className="w-full max-w-md mx-auto text-center">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {status === "checking" && (
          <>
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">¡Pago recibido!</h2>
            <p className="text-gray-600">
              Confirmando tu acceso premium...
            </p>
          </>
        )}

        {status === "confirmed" && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-green-700">
              ¡Acceso activado!
            </h2>
            <p className="text-gray-600">Redirigiendo al juego...</p>
          </>
        )}

        {status === "pending" && (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Pago en proceso</h2>
            <p className="text-gray-600 mb-6">
              Tu pago está siendo procesado, esto puede tardar unos minutos.
              Podés recargar esta página más tarde.
            </p>
            <button
              onClick={() => {
                setAttempts(0);
                setStatus("checking");
              }}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold"
            >
              Verificar de nuevo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
