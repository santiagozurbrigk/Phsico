import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getConfig, saveConfig } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/upload
 * Panel admin: sube PDFs + imagen de ejemplo a Vercel Blob.
 * Protegido con ADMIN_PASSWORD.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = formData.get("password") as string;
  const topic = (formData.get("topic") as string) || "Psicología";

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const config = await getConfig();
  config.topic = topic;

  // Subir PDFs
  const pdfFiles = formData.getAll("pdfs") as File[];
  for (const file of pdfFiles) {
    if (file.size === 0) continue;
    const blob = await put(`pdfs/${file.name}`, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    config.pdfs.push({ name: file.name, url: blob.url });
  }

  // Subir imagen de ejemplo (opcional)
  const imageFile = formData.get("exampleImage") as File | null;
  if (imageFile && imageFile.size > 0) {
    const blob = await put(`images/${imageFile.name}`, imageFile, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    config.exampleImageUrl = blob.url;
  }

  await saveConfig(config);

  return NextResponse.json({
    success: true,
    config: {
      pdfs: config.pdfs.map((p) => p.name),
      exampleImageUrl: config.exampleImageUrl,
      topic: config.topic,
    },
  });
}

/**
 * GET /api/upload — devuelve la config actual (requiere password en query)
 */
export async function GET(request: NextRequest) {
  const password = request.nextUrl.searchParams.get("password");

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const config = await getConfig();
  return NextResponse.json({ config });
}
