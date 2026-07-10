import { NextRequest, NextResponse } from "next/server";
import {
  validateWebhookSignature,
  getPaymentById,
} from "@/lib/mercadopago";
import { activatePremium } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/mercadopago
 * Recibe notificaciones de pago de Mercado Pago.
 * Valida firma, consulta el pago contra la API, y activa premium si está aprobado.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Mercado Pago envía diferentes formatos según el tipo de notificación
    const type = body.type || body.action;
    const dataId =
      body.data?.id?.toString() ||
      request.nextUrl.searchParams.get("data.id") ||
      request.nextUrl.searchParams.get("id");

    if (!dataId) {
      return NextResponse.json({ error: "Sin data ID" }, { status: 400 });
    }

    // Validar firma del webhook
    const xSignature = request.headers.get("x-signature");
    const xRequestId = request.headers.get("x-request-id");

    if (
      process.env.MP_WEBHOOK_SECRET &&
      !validateWebhookSignature(xSignature, xRequestId, dataId)
    ) {
      console.error("Firma de webhook inválida");
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }

    // Solo procesar notificaciones de pago
    if (type !== "payment" && !body.action?.startsWith("payment.")) {
      return NextResponse.json({ ok: true });
    }

    // Consultar el pago directamente contra la API de MP (nunca confiar en el payload)
    const payment = await getPaymentById(dataId);

    if (payment.status === "approved" && payment.external_reference) {
      await activatePremium(payment.external_reference, dataId);
      console.log(
        `Premium activado para usuario ${payment.external_reference}, pago ${dataId}`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error procesando webhook:", error);
    // Responder 200 para que MP no reintente indefinidamente en errores de parsing
    return NextResponse.json({ ok: true });
  }
}
