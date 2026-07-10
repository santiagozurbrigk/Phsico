import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createPaymentPreference } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

/**
 * POST /api/create-payment-preference
 * Crea una preferencia de pago en Mercado Pago para el usuario actual.
 */
export async function POST() {
  const cookieStore = cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  try {
    const preferenceId = await createPaymentPreference({ userId, baseUrl });
    return NextResponse.json({ preferenceId });
  } catch (error) {
    console.error("Error creando preferencia de pago:", error);
    return NextResponse.json(
      { error: "Error al crear la preferencia de pago" },
      { status: 500 }
    );
  }
}
