import { NextRequest, NextResponse } from "next/server";
import { getConfig, saveConfig } from "@/lib/store";
import { isAdminRequest } from "@/lib/admin";

export const dynamic = "force-dynamic";

type UploadedPdf = {
  name: string;
  url: string;
};

/**
 * POST /api/upload
 * Guarda en KV las URLs ya subidas a Vercel Blob desde el cliente.
 * Protegido con sesión admin httpOnly.
 */
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await request.json()) as {
    topic?: string;
    pdfs?: UploadedPdf[];
    exampleImageUrl?: string | null;
  };

  const config = await getConfig();
  config.topic = body.topic?.trim() || "Psicología";

  if (Array.isArray(body.pdfs) && body.pdfs.length > 0) {
    config.pdfs.push(
      ...body.pdfs.filter(
        (pdf) =>
          typeof pdf.name === "string" &&
          typeof pdf.url === "string" &&
          pdf.url.startsWith("https://")
      )
    );
  }

  if (body.exampleImageUrl && body.exampleImageUrl.startsWith("https://")) {
    config.exampleImageUrl = body.exampleImageUrl;
  }

  await saveConfig(config);

  return NextResponse.json({
    success: true,
    config,
  });
}

/**
 * GET /api/upload — devuelve la config actual (requiere sesión admin)
 */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const config = await getConfig();
  return NextResponse.json({ config });
}
