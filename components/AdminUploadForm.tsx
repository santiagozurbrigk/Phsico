"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";

type ConfigPdf = {
  name: string;
  url: string;
};

type UploadMessage = {
  type: "success" | "error" | "info";
  text: string;
};

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = "20MB";

function sanitizeFilename(filename: string): string {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

function validatePdf(file: File): string | null {
  if (file.type !== "application/pdf") {
    return "tipo no permitido (solo PDF)";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `supera el tamaño máximo de ${MAX_FILE_SIZE_LABEL}`;
  }

  return null;
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

  async function uploadPdf(file: File): Promise<ConfigPdf | null> {
    const validationError = validatePdf(file);
    if (validationError) {
      addMessage({ type: "error", text: `${file.name}: ${validationError}.` });
      return null;
    }

    try {
      addMessage({ type: "info", text: `Subiendo ${file.name}...` });
      const blob = await upload(`pdfs/${sanitizeFilename(file.name)}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload/token",
        clientPayload: JSON.stringify({ kind: "pdf" }),
      });

      addMessage({ type: "success", text: `${file.name}: subido correctamente.` });
      return { name: file.name, url: blob.url };
    } catch (error) {
      addMessage({
        type: "error",
        text: `${file.name}: ${
          error instanceof Error ? error.message : "falló la subida"
        }.`,
      });
      return null;
    }
  }

  async function uploadImage(file: File): Promise<string | null> {
    const validationError = validateImage(file);
    if (validationError) {
      addMessage({ type: "error", text: `${file.name}: ${validationError}.` });
      return null;
    }

    try {
      addMessage({ type: "info", text: `Subiendo imagen ${file.name}...` });
      const blob = await upload(`images/${sanitizeFilename(file.name)}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload/token",
        clientPayload: JSON.stringify({ kind: "image" }),
      });

      addMessage({
        type: "success",
        text: `${file.name}: imagen subida correctamente.`,
      });
      return blob.url;
    } catch (error) {
      addMessage({
        type: "error",
        text: `${file.name}: ${
          error instanceof Error ? error.message : "falló la subida"
        }.`,
      });
      return null;
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

      const uploadedPdfs: ConfigPdf[] = [];
      for (const file of pdfFiles) {
        const uploadedPdf = await uploadPdf(file);
        if (uploadedPdf) uploadedPdfs.push(uploadedPdf);
      }

      const exampleImageUrl = imageFile ? await uploadImage(imageFile) : null;

      await saveUploadedConfig(uploadedPdfs, exampleImageUrl);

      const failedCount =
        pdfFiles.length + (imageFile ? 1 : 0) -
        uploadedPdfs.length -
        (imageFile && exampleImageUrl ? 1 : 0);

      if (failedCount > 0) {
        setStatus(
          `Config guardada. ${failedCount} archivo(s) no se pudieron subir; revisá el detalle.`
        );
      } else {
        setStatus("Archivos subidos y configuración guardada correctamente.");
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
            className={`mt-4 text-sm ${
              status.startsWith("Error") ? "text-red-600" : "text-green-600"
            }`}
          >
            {status}
          </p>
        )}

        {messages.length > 0 && (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-lg bg-gray-50 p-3 text-sm">
            {messages.map((message, index) => (
              <p
                key={`${message.type}-${index}`}
                className={
                  message.type === "error"
                    ? "text-red-600"
                    : message.type === "success"
                      ? "text-green-600"
                      : "text-gray-500"
                }
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
