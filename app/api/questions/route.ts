import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getOrRefreshQuestions,
  getUserState,
  getConfig,
} from "@/lib/store";
import { generateQuestions } from "@/lib/gemini";
import { extractTextsFromPdfs } from "@/lib/pdf";
import {
  saveQuestionsState,
  createQuestionsState,
} from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/questions
 * Devuelve las preguntas actuales si el usuario tiene acceso.
 * Valida SIEMPRE en el servidor el estado freemium.
 */
export async function GET() {
  const cookieStore = cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
  }

  const userState = await getUserState(userId);

  // Determinar acceso
  if (!userState.isPremium && userState.hasUsedFreeGame) {
    const config = await getConfig();
    return NextResponse.json({
      access: "paywall",
      topic: config.topic,
    });
  }

  // Obtener o regenerar preguntas (lazy reset)
  let { needsRefresh, state } = await getOrRefreshQuestions();

  if (needsRefresh) {
    const config = await getConfig();

    if (config.pdfs.length === 0) {
      return NextResponse.json(
        { error: "No hay material cargado. El administrador debe subir PDFs." },
        { status: 503 }
      );
    }

    try {
      const pdfTexts = await extractTextsFromPdfs(
        config.pdfs.map((p) => p.url)
      );

      const questions = await generateQuestions({
        pdfTexts,
        exampleImageUrl: config.exampleImageUrl,
        topic: config.topic,
      });

      state = createQuestionsState(questions);
      await saveQuestionsState(state);
    } catch (error) {
      console.error("Error generando preguntas:", error);
      return NextResponse.json(
        { error: "Error al generar preguntas. Intentá de nuevo." },
        { status: 500 }
      );
    }
  }

  // No enviar las respuestas al cliente (seguridad)
  const safeQuestions = state!.questions.map(({ id, statement }) => ({
    id,
    statement,
  }));

  return NextResponse.json({
    access: userState.isPremium ? "premium" : "free",
    questions: safeQuestions,
    nextResetAt: state!.nextResetAt,
    total: safeQuestions.length,
  });
}
