import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import crypto from "crypto";

const accessToken = process.env.MP_ACCESS_TOKEN!;

const client = new MercadoPagoConfig({ accessToken });

const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

export interface CreatePreferenceOptions {
  userId: string;
  baseUrl: string;
}

/**
 * Crea una preferencia de pago en Mercado Pago (Checkout Pro).
 */
export async function createPaymentPreference(
  options: CreatePreferenceOptions
): Promise<string> {
  const { userId, baseUrl } = options;

  const preference = await preferenceClient.create({
    body: {
      items: [
        {
          id: "premium-access",
          title: "Acceso ilimitado - Verdadero o Falso",
          quantity: 1,
          unit_price: 1000,
          currency_id: "ARS",
        },
      ],
      external_reference: userId,
      back_urls: {
        success: `${baseUrl}/pago-exitoso`,
        failure: `${baseUrl}/pago-fallido`,
        pending: `${baseUrl}/pago-pendiente`,
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
    },
  });

  if (!preference.id) {
    throw new Error("Mercado Pago no devolvió un preference ID");
  }

  return preference.id;
}

/**
 * Consulta el estado de un pago directamente contra la API de Mercado Pago.
 * NUNCA confiar en el payload del webhook sin esta verificación.
 */
export async function getPaymentById(paymentId: string) {
  const payment = await paymentClient.get({ id: paymentId });
  return payment;
}

/**
 * Valida la firma del webhook de Mercado Pago usando x-signature.
 * Documentación: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
export function validateWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string
): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret || !xSignature) return false;

  // Parsear x-signature: "ts=...,v1=..."
  const parts: Record<string, string> = {};
  xSignature.split(",").forEach((part) => {
    const [key, value] = part.split("=");
    if (key && value) parts[key.trim()] = value.trim();
  });

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  // Construir el manifest según la documentación de MP
  const manifest = xRequestId
    ? `id:${dataId};request-id:${xRequestId};ts:${ts};`
    : `id:${dataId};ts:${ts};`;

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return hmac === v1;
}
