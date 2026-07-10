import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getConfig,
  saveQuestionsState,
  createQuestionsState,
} from "@/lib/store";
import { generateQuestions } from "@/lib/gemini";
import { extractTextsFromPdfs } from "@/lib/pdf";

export const dynamic = "force-dynamic";

/**
 * POST /api/generate-questions
 * Fuerza la regeneración de preguntas (uso admin o manual).
 * Protegido con ADMIN_PASSWORD.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const config = await getConfig();

  if (config.pdfs.length === 0) {
    return NextResponse.json(
      { error: "No hay PDFs cargados" },
      { status: 400 }
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

    const state = createQuestionsState(questions);
    await saveQuestionsState(state);

    return NextResponse.json({
      success: true,
      count: questions.length,
      nextResetAt: state.nextResetAt,
    });
  } catch (error) {
    console.error("Error generando preguntas:", error);
    return NextResponse.json(
      { error: "Error al generar preguntas" },
      { status: 500 }
    );
  }
}
