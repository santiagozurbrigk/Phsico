# Verdadero o Falso — Juego con IA + Freemium + Mercado Pago

Aplicación web de "Verdadero o Falso" con preguntas generadas por Google Gemini, modelo freemium (1 partida gratis + pago único de $1000 ARS vía Mercado Pago), desplegable en Vercel (plan Hobby/gratuito).

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Vercel Blob** — almacenamiento de PDFs e imágenes del admin
- **Vercel KV** — estado global (preguntas, usuarios, pagos)
- **Google Gemini Flash** — generación de preguntas
- **Mercado Pago** — Checkout Pro para cobro

## Desarrollo local

```bash
npm install
cp .env.example .env.local
# Completar las variables en .env.local
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Crear un archivo `.env.local` (desarrollo) o configurarlas en el dashboard de Vercel (producción):

| Variable | Descripción | Dónde obtenerla |
|---|---|---|
| `GEMINI_API_KEY` | API key de Google Gemini | [Google AI Studio](https://aistudio.google.com/apikey) |
| `ADMIN_PASSWORD` | Contraseña del panel `/upload` | Elegí una contraseña segura |
| `BLOB_READ_WRITE_TOKEN` | Token de Vercel Blob | Vercel Dashboard → Storage → Blob |
| `KV_REST_API_URL` | URL de Vercel KV | Vercel Dashboard → Storage → KV |
| `KV_REST_API_TOKEN` | Token de Vercel KV | Vercel Dashboard → Storage → KV |
| `MP_ACCESS_TOKEN` | Access Token de Mercado Pago (server-side, **secreto**) | [Mercado Pago Developers](https://www.mercadopago.com.ar/developers) |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | Public Key de Mercado Pago (frontend) | Mismo panel de MP |
| `MP_WEBHOOK_SECRET` | Secreto para validar firma de webhooks | Panel de MP → Webhooks → configurar secreto |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (ej. `https://tu-app.vercel.app`) | Tu dominio en Vercel |

## Despliegue en Vercel

1. Conectá el repositorio a Vercel.
2. Creá un store de **KV** y un store de **Blob** desde el dashboard de Vercel (se vinculan automáticamente).
3. Configurá todas las variables de entorno listadas arriba.
4. Deploy.

## Flujo de uso

### Admin (primera vez)

1. Ir a `/upload` e ingresar `ADMIN_PASSWORD`.
2. Subir PDFs con el material de estudio + imagen de ejemplo (opcional).
3. Definir el tema (ej. "Psicología").
4. Opcionalmente, forzar la generación de preguntas.

### Uploads del panel admin

Los archivos del panel `/upload` se suben con **client uploads** de Vercel Blob (`@vercel/blob/client`). Esto evita que los PDFs pasen por una función serverless de Next.js/Vercel.

El motivo es el límite de **4.5 MB por request** de Vercel Functions: si se enviaran 20 o 25 PDFs juntos a una API route, el request superaría ese límite y devolvería `413 Content Too Large`.

El flujo actual es:

1. El admin inicia sesión con `ADMIN_PASSWORD`; el backend setea una cookie httpOnly de sesión admin.
2. Cada PDF o imagen solicita un token temporal a `/api/upload/token`.
3. El navegador sube cada archivo directamente a Vercel Blob con `upload()`.
4. Cuando las subidas terminan, el frontend manda solo las URLs resultantes a `/api/upload`, que guarda la configuración en KV.

Restricciones actuales:

- PDFs: `application/pdf`
- Imagen de ejemplo: `image/png` o `image/jpeg`
- Tamaño máximo: 20 MB por archivo

Si un archivo individual falla por tipo, tamaño, token expirado u otro error, el panel muestra el error de ese archivo y continúa con los demás.

### Jugador

1. Entra a `/` → se le asigna un `user_id` anónimo vía cookie httpOnly.
2. Puede jugar **1 partida gratis** (20 preguntas).
3. Al completarla, se muestra el **paywall** con opción de pagar $1000 ARS.
4. Tras el pago (Mercado Pago Checkout Pro), obtiene **acceso ilimitado** mientras dure el set de preguntas actual.
5. Las preguntas se renuevan cada **20 minutos** (lazy reset, sin cron jobs).

## Modo de pruebas (antes de producción)

**Importante:** Antes de usar credenciales de PRODUCCIÓN, probá todo el flujo con credenciales de **TEST** de Mercado Pago:

1. En [Mercado Pago Developers](https://www.mercadopago.com.ar/developers), creá una aplicación de prueba.
2. Usá las credenciales que empiezan con `TEST-` tanto para `MP_ACCESS_TOKEN` como para `NEXT_PUBLIC_MP_PUBLIC_KEY`.
3. Creá un [usuario comprador de prueba](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/test/accounts).
4. Validá el flujo completo:
   - La preferencia de pago se crea correctamente.
   - El botón de Mercado Pago redirige al checkout.
   - El webhook llega a `/api/webhooks/mercadopago`.
   - La firma del webhook se valida correctamente.
   - El KV se actualiza (`isPremium = true`).
   - El polling en `/pago-exitoso` detecta el cambio y redirige al juego.
5. Recién después de confirmar todo, cambiá a las credenciales de **producción**.

### Probar webhooks en local

Usá [ngrok](https://ngrok.com/) o similar para exponer tu localhost:

```bash
ngrok http 3000
```

Configurá la URL del webhook en Mercado Pago: `https://tu-url-ngrok.ngrok.io/api/webhooks/mercadopago`

## Seguridad

- El `user_id` se maneja con cookie **httpOnly** (no manipulable desde JS).
- El acceso freemium se valida **siempre en el servidor** (nunca en el cliente).
- Las respuestas correctas **nunca** se envían al frontend; se verifican vía `/api/check-answer`.
- Los webhooks de Mercado Pago se validan con **firma HMAC** (`x-signature`).
- El estado del pago se confirma consultando la **API de Mercado Pago** directamente (nunca se confía en el payload del webhook).

## Estructura del proyecto

```
app/
  page.tsx                          # Juego principal
  upload/page.tsx                   # Panel admin
  pago-exitoso/page.tsx             # Retorno post-pago (con polling)
  pago-fallido/page.tsx
  pago-pendiente/page.tsx
  api/
    questions/route.ts              # GET preguntas + validación freemium
    check-answer/route.ts           # POST verificar respuesta
    complete-game/route.ts          # POST marcar partida gratis usada
    generate-questions/route.ts     # POST forzar regeneración (admin)
    upload/route.ts                 # POST/GET guardar URLs subidas (admin)
    upload/session/route.ts         # POST sesión admin httpOnly
    upload/token/route.ts           # POST token temporal para Blob client upload
    create-payment-preference/route.ts
    webhooks/mercadopago/route.ts
    user-status/route.ts
components/
  QuestionCard.tsx
  ResultScreen.tsx
  CountdownTimer.tsx
  AdminUploadForm.tsx
  PaywallScreen.tsx
  MercadoPagoButton.tsx
lib/
  store.ts          # Vercel KV (preguntas, config, usuarios)
  gemini.ts         # Generación con Gemini Flash
  pdf.ts            # Extracción de texto de PDFs
  mercadopago.ts    # Cliente MP, preferencias, firma webhook
middleware.ts       # Cookie user_id anónimo
```

## Licencia

MIT
