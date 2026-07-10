"use client";

import { useEffect, useState } from "react";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";

const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || "";

export default function MercadoPagoButton() {
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) {
      setError("Mercado Pago no está configurado.");
      setIsLoading(false);
      return;
    }

    initMercadoPago(publicKey);

    async function createPreference() {
      try {
        const res = await fetch("/api/create-payment-preference", {
          method: "POST",
        });

        if (!res.ok) {
          throw new Error("Error al crear preferencia de pago");
        }

        const data = await res.json();
        setPreferenceId(data.preferenceId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error de conexión"
        );
      } finally {
        setIsLoading(false);
      }
    }

    createPreference();
  }, []);

  if (isLoading) {
    return (
      <div className="py-4 text-gray-500 text-sm">Cargando botón de pago...</div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-red-600 text-sm">{error}</div>
    );
  }

  if (!preferenceId) {
    return null;
  }

  return (
    <div className="w-full">
      <Wallet initialization={{ preferenceId }} />
    </div>
  );
}
