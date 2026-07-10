import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdminRequest } from "@/lib/admin";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB por archivo
const PDF_CONTENT_TYPES = ["application/pdf"];
const IMAGE_CONTENT_TYPES = ["image/png", "image/jpeg"];

type UploadPayload = {
  kind?: "pdf" | "image";
};

function parseClientPayload(clientPayload: string | null): UploadPayload {
  if (!clientPayload) return {};

  try {
    return JSON.parse(clientPayload) as UploadPayload;
  } catch {
    return {};
  }
}

/**
 * POST /api/upload/token
 * Genera tokens temporales para client uploads de Vercel Blob.
 * Los archivos viajan directo del navegador a Blob; esta función solo autoriza.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!isAdminRequest(request)) {
          throw new Error("No autorizado");
        }

        const payload = parseClientPayload(clientPayload);

        if (payload.kind === "pdf") {
          if (!pathname.startsWith("pdfs/")) {
            throw new Error("Ruta de PDF inválida");
          }

          return {
            allowedContentTypes: PDF_CONTENT_TYPES,
            maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
            tokenPayload: clientPayload,
            addRandomSuffix: true,
          };
        }

        if (payload.kind === "image") {
          if (!pathname.startsWith("images/")) {
            throw new Error("Ruta de imagen inválida");
          }

          return {
            allowedContentTypes: IMAGE_CONTENT_TYPES,
            maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
            tokenPayload: clientPayload,
            addRandomSuffix: true,
          };
        }

        throw new Error("Tipo de archivo no permitido");
      },
      onUploadCompleted: async () => {
        // La URL final se guarda en KV desde /api/upload cuando el cliente termina.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de upload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
