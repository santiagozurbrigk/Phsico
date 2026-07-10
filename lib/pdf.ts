/**
 * Extrae texto de un PDF desde su URL en Vercel Blob.
 */
export async function extractTextFromPdfUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar el PDF: ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // pdf-parse es CommonJS; importación dinámica para compatibilidad
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Extrae texto de múltiples PDFs en paralelo.
 */
export async function extractTextsFromPdfs(
  pdfUrls: string[]
): Promise<string[]> {
  const results = await Promise.all(
    pdfUrls.map((url) => extractTextFromPdfUrl(url))
  );
  return results.filter((text) => text.trim().length > 0);
}
