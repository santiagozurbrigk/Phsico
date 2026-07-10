import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getQuestionsState } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/check-answer
 * Verifica si una respuesta es correcta (server-side, las respuestas nunca van al cliente).
 */
export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
  }

  const { questionId, answer } = await request.json();

  const state = await getQuestionsState();
  if (!state) {
    return NextResponse.json({ error: "No hay preguntas activas" }, { status: 404 });
  }

  const question = state.questions.find((q) => q.id === questionId);
  if (!question) {
    return NextResponse.json({ error: "Pregunta no encontrada" }, { status: 404 });
  }

  const isCorrect = question.answer === answer;

  return NextResponse.json({
    isCorrect,
    correctAnswer: question.answer,
    explanation: question.explanation,
  });
}
