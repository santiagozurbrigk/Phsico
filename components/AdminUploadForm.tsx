"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";

type ConfigPdf = {
  name: string;
  url: string;
};

type UploadMessage = {
  type: "success" | "error" | "info" | "summary";
  text: string;
};

type FileUploadResult = {
  fileName: string;
  success: boolean;
  error?: string;
};

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = "20MB";
const MAX_UPLOAD_ATTEMPTS = 2; // 1 intento inicial + 1 reintento automático

function sanitizeFilename(filename: string): string {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

function validatePdf(file: File): string | null {
  const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
  const hasPdfMime =
    file.type === "application/pdf" ||
    file.type === "application/x-pdf" ||
    file.type === "";

  if (!hasPdfExtension && !hasPdfMime) {
    return "tipo no permitido (solo PDF)";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `supera el tamaño máximo de ${MAX_FILE_SIZE_LABEL}`;
  }

  return null;
}

function getPdfContentType(file: File): string {
  if (file.type === "application/pdf" || file.type === "application/x-pdf") {
    return file.type;
  }
  return "application/pdf";
}

function getImageContentType(file: File): string {
  if (file.type === "image/png" || file.type === "image/jpeg") {
    return file.type;
  }
  return file.name.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
}

function validateImage(file: File): string | null {
  if (!["image/png", "image/jpeg"].includes(file.type)) {
    return "tipo no permitido (solo PNG o JPG)";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `supera el tamaño máximo de ${MAX_FILE_SIZE_LABEL}`;
  }

  return null;
}

function shouldRetryUpload(error: unknown): boolean {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    if (
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("load failed")
    ) {
      return false;
    }
  }

  return true;
}

function formatUploadError(error: unknown): string {
  if (!error) return "Error desconocido";

  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    if (
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("load failed")
    ) {
      return [
        "Error de red/CORS al hacer PUT a blob.vercel-storage.com.",
        "El navegador suele mostrar esto cuando Blob rechaza el upload (400/403) sin devolver headers CORS.",
        "Causas frecuentes: contentType no coincide, token inválido/expirado, pathname sin extensión o store mal configurado.",
        `[TypeError: ${error.message}]`,
      ].join(" ");
    }
  }

  if (error instanceof Error) {
    const parts: string[] = [error.message];

    if (error.name && error.name !== "Error") {
      parts.push(`[name: ${error.name}]`);
    }

    const extra = error as Error & Record<string, unknown>;

    if ("code" in extra && extra.code !== undefined && extra.code !== "") {
      parts.push(`[code: ${String(extra.code)}]`);
    }

    if ("retryAfter" in extra && extra.retryAfter !== undefined) {
      parts.push(`[retryAfter: ${String(extra.retryAfter)}]`);
    }

    if (error.cause) {
      parts.push(`[cause: ${formatUploadError(error.cause)}]`);
    }

    const known = new Set(["message", "name", "stack", "cause"]);
    for (const [key, value] of Object.entries(extra)) {
      if (!known.has(key) && value !== undefined) {
        try {
          parts.push(`[${key}: ${JSON.stringify(value)}]`);
        } catch {
          parts.push(`[${key}: ${String(value)}]`);
        }
      }
    }

    return parts.join(" ");
  }

  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function buildUploadSummary(results: FileUploadResult[]): string {
  const successCount = results.filter((result) => result.success).length;
  const failures = results.filter((result) => !result.success);

  const lines = [
    `Resumen final: ${successCount} archivo(s) subidos correctamente, ${failures.length} fallaron.`,
  ];

  for (const failure of failures) {
    lines.push(`${failure.fileName}: ${failure.error}`);
  }

  return lines.join("\n");
}

export default function AdminUploadForm() {
  const [password, setPassword] = useState("");
  const [topic, setTopic] = useState("Psicología");
  const [status, setStatus] = useState<string | null>(null);
  const [messages, setMessages] = useState<UploadMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<{
    pdfs: ConfigPdf[];
    exampleImageUrl: string | null;
    topic: string;
  } | null>(null);

  function addMessage(message: UploadMessage) {
    setMessages((current) => [...current, message]);
  }

  async function ensureAdminSession() {
    if (!password) return;

    const res = await fetch("/api/upload/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      throw new Error("Contraseña de admin incorrecta.");
    }
  }

  async function loadConfig() {
    if (!password) return;
    setIsLoading(true);
    setStatus(null);
    setMessages([]);

    try {
      await ensureAdminSession();
      const res = await fetch("/api/upload");

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "No se pudo cargar la configuración.");
      }

      const data = await res.json();
      setCurrentConfig(data.config);
      setTopic(data.config.topic);
      setStatus("Configuración cargada.");
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Error de conexión."}`
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function uploadFileWithRetry(
    file: File,
    pathname: string,
    clientPayload: string,
    contentType: string
  ) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
      try {
        if (attempt === 1) {
          addMessage({
            type: "info",
            text: `Subiendo ${file.name} como ${contentType} → ${pathname}`,
          });
        } else {
          addMessage({
            type: "info",
            text: `${file.name}: reintentando automáticamente (intento ${attempt}/${MAX_UPLOAD_ATTEMPTS})...`,
          });
        }

        return await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/api/upload/token",
          clientPayload,
          contentType,
        });
      } catch (error) {
        lastError = error;
        const errorText = formatUploadError(error);

        if (attempt < MAX_UPLOAD_ATTEMPTS && shouldRetryUpload(error)) {
          addMessage({
            type: "info",
            text: `${file.name}: falló en el intento ${attempt} — ${errorText}`,
          });
          continue;
        }

        addMessage({
          type: "error",
          text: `${file.name}: ${errorText}`,
        });
        break;
      }
    }

    throw lastError;
  }

  async function uploadPdf(file: File): Promise<{
    uploaded: ConfigPdf | null;
    result: FileUploadResult;
  }> {
    const validationError = validatePdf(file);
    if (validationError) {
      const errorText = validationError;
      addMessage({ type: "error", text: `${file.name}: ${errorText}` });
      return {
        uploaded: null,
        result: { fileName: file.name, success: false, error: errorText },
      };
    }

    try {
      const blob = await uploadFileWithRetry(
        file,
        `pdfs/${sanitizeFilename(file.name)}`,
        JSON.stringify({ kind: "pdf" }),
        getPdfContentType(file)
      );

      addMessage({ type: "success", text: `${file.name}: subido correctamente.` });
      return {
        uploaded: { name: file.name, url: blob.url },
        result: { fileName: file.name, success: true },
      };
    } catch (error) {
      const errorText = formatUploadError(error);
      addMessage({
        type: "error",
        text: `${file.name}: ${errorText}`,
      });
      return {
        uploaded: null,
        result: { fileName: file.name, success: false, error: errorText },
      };
    }
  }

  async function uploadImage(file: File): Promise<{
    uploaded: string | null;
    result: FileUploadResult;
  }> {
    const validationError = validateImage(file);
    if (validationError) {
      const errorText = validationError;
      addMessage({ type: "error", text: `${file.name}: ${errorText}` });
      return {
        uploaded: null,
        result: { fileName: file.name, success: false, error: errorText },
      };
    }

    try {
      const blob = await uploadFileWithRetry(
        file,
        `images/${sanitizeFilename(file.name)}`,
        JSON.stringify({ kind: "image" }),
        getImageContentType(file)
      );

      addMessage({
        type: "success",
        text: `${file.name}: imagen subida correctamente.`,
      });
      return {
        uploaded: blob.url,
        result: { fileName: file.name, success: true },
      };
    } catch (error) {
      const errorText = formatUploadError(error);
      addMessage({
        type: "error",
        text: `${file.name}: ${errorText}`,
      });
      return {
        uploaded: null,
        result: { fileName: file.name, success: false, error: errorText },
      };
    }
  }

  async function saveUploadedConfig(
    uploadedPdfs: ConfigPdf[],
    exampleImageUrl: string | null
  ) {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        pdfs: uploadedPdfs,
        exampleImageUrl,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setCurrentConfig(data.config);
      return;
    }

    throw new Error(data.error || "No se pudo guardar la configuración.");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);
    setMessages([]);

    const form = e.currentTarget;
    const pdfInput = form.elements.namedItem("pdfs") as HTMLInputElement;
    const imageInput = form.elements.namedItem("exampleImage") as HTMLInputElement;
    const pdfFiles = Array.from(pdfInput.files ?? []);
    const imageFile = imageInput.files?.[0] ?? null;

    try {
      await ensureAdminSession();

      const uploadResults: FileUploadResult[] = [];
      const uploadedPdfs: ConfigPdf[] = [];

      for (const file of pdfFiles) {
        const { uploaded, result } = await uploadPdf(file);
        uploadResults.push(result);
        if (uploaded) uploadedPdfs.push(uploaded);
      }

      let exampleImageUrl: string | null = null;
      if (imageFile) {
        const { uploaded, result } = await uploadImage(imageFile);
        uploadResults.push(result);
        exampleImageUrl = uploaded;
      }

      if (uploadedPdfs.length > 0 || exampleImageUrl) {
        await saveUploadedConfig(uploadedPdfs, exampleImageUrl);
      }

      const summary = buildUploadSummary(uploadResults);
      addMessage({ type: "summary", text: summary });

      const failedCount = uploadResults.filter((result) => !result.success).length;
      const successCount = uploadResults.filter((result) => result.success).length;

      if (uploadResults.length === 0) {
        setStatus("No seleccionaste archivos para subir.");
      } else if (failedCount > 0) {
        setStatus(summary);
      } else {
        setStatus(
          `Archivos subidos y configuración guardada correctamente. ${successCount} archivo(s) subidos.`
        );
      }
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Error de conexión."}`
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerate() {
    setIsLoading(true);
    setStatus(null);
    setMessages([]);

    try {
      await ensureAdminSession();
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(`Se generaron ${data.count} preguntas correctamente.`);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch {
      setStatus("Error de conexión.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Panel de Administración</h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña de admin
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="ADMIN_PASSWORD"
            />
            <button
              onClick={loadConfig}
              disabled={isLoading || !password}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              Cargar config
            </button>
          </div>
        </div>

        {currentConfig && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
            <p>
              <strong>Tema:</strong> {currentConfig.topic}
            </p>
            <p>
              <strong>PDFs:</strong>{" "}
              {currentConfig.pdfs.length > 0
                ? currentConfig.pdfs.map((pdf) => pdf.name).join(", ")
                : "Ninguno"}
            </p>
            <p>
              <strong>Imagen:</strong>{" "}
              {currentConfig.exampleImageUrl ? "Cargada" : "No cargada"}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tema del juego
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PDFs (material de estudio)
            </label>
            <input
              type="file"
              name="pdfs"
              accept="application/pdf,.pdf"
              multiple
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-400">
              Se sube cada PDF directamente a Vercel Blob. Máximo{" "}
              {MAX_FILE_SIZE_LABEL} por archivo.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imagen de ejemplo (opcional)
            </label>
            <input
              type="file"
              name="exampleImage"
              accept="image/png,image/jpeg"
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-400">
              PNG o JPG. Máximo {MAX_FILE_SIZE_LABEL}.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {isLoading ? "Subiendo..." : "Subir archivos"}
          </button>
        </form>

        <button
          onClick={handleGenerate}
          disabled={isLoading || !password}
          className="w-full mt-3 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          {isLoading ? "Generando..." : "Forzar generación de preguntas"}
        </button>

        {status && (
          <p
            className={`mt-4 text-sm whitespace-pre-wrap break-words ${
              status.startsWith("Error") || status.includes("fallaron")
                ? "text-red-600"
                : "text-green-600"
            }`}
          >
            {status}
          </p>
        )}

        {messages.length > 0 && (
          <div className="mt-4 max-h-72 overflow-y-auto rounded-lg bg-gray-50 p-3 text-sm space-y-2">
            {messages.map((message, index) => (
              <p
                key={`${message.type}-${index}`}
                className={`whitespace-pre-wrap break-words ${
                  message.type === "error"
                    ? "text-red-600"
                    : message.type === "success"
                      ? "text-green-600"
                      : message.type === "summary"
                        ? "text-amber-800 font-medium border-t border-amber-200 pt-2"
                        : "text-gray-500"
                }`}
              >
                {message.text}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
