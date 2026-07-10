import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Question } from "./store";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface GenerateOptions {
  pdfTexts: string[];
  exampleImageUrl: string | null;
  topic: string;
}

/**
 * Genera 20 preguntas de Verdadero/Falso usando Gemini Flash.
 * Usa los textos de los PDFs y opcionalmente la imagen de ejemplo como contexto.
 */
export async function generateQuestions(
  options: GenerateOptions
): Promise<Question[]> {
  const { pdfTexts, exampleImageUrl, topic } = options;

  const contextText = pdfTexts
    .map((text, i) => `--- Documento ${i + 1} ---\n${text.slice(0, 8000)}`)
    .join("\n\n");

  const prompt = `Sos un profesor de ${topic}. Generá exactamente 20 afirmaciones para un juego de "Verdadero o Falso" basadas en el siguiente material de estudio.

MATERIAL DE ESTUDIO:
${contextText}

REGLAS:
- Cada afirmación debe ser clara y poder responderse con Verdadero o Falso.
- Aproximadamente la mitad deben ser verdaderas y la mitad falsas.
- Las afirmaciones falsas deben contener errores plausibles (no absurdos).
- Incluí una breve explicación de por qué es verdadera o falsa.
- Variá la dificultad: algunas fáciles, otras más desafiantes.
- NO repitas afirmaciones similares.

Respondé ÚNICAMENTE con un JSON válido (sin markdown, sin backticks) con este formato:
[
  {
    "statement": "La afirmación aquí",
    "answer": true,
    "explanation": "Breve explicación"
  }
]`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];

  // Si hay imagen de ejemplo, intentar incluirla como referencia visual
  if (exampleImageUrl) {
    try {
      const imageResponse = await fetch(exampleImageUrl);
      if (imageResponse.ok) {
        const buffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType =
          imageResponse.headers.get("content-type") || "image/png";
        parts.push({
          inlineData: { mimeType: contentType, data: base64 },
        });
        parts.push({
          text: "La imagen de arriba es un ejemplo del tipo de contenido del material. Usala como referencia adicional.",
        });
      }
    } catch {
      // Si falla la descarga de la imagen, continuamos solo con texto
    }
  }

  const result = await model.generateContent(parts);
  const text = result.response.text();

  // Limpiar posible markdown del response
  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  const parsed = JSON.parse(cleaned) as Array<{
    statement: string;
    answer: boolean;
    explanation: string;
  }>;

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Gemini no devolvió preguntas válidas");
  }

  return parsed.slice(0, 20).map((q, i) => ({
    id: i + 1,
    statement: q.statement,
    answer: q.answer,
    explanation: q.explanation,
  }));
}
