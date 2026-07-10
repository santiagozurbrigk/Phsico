"use client";

import { useState } from "react";

export default function AdminUploadForm() {
  const [password, setPassword] = useState("");
  const [topic, setTopic] = useState("Psicología");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<{
    pdfs: string[];
    exampleImageUrl: string | null;
    topic: string;
  } | null>(null);

  async function loadConfig() {
    if (!password) return;
    const res = await fetch(`/api/upload?password=${encodeURIComponent(password)}`);
    if (res.ok) {
      const data = await res.json();
      setCurrentConfig(data.config);
      setTopic(data.config.topic);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);

    const formData = new FormData(e.currentTarget);
    formData.set("password", password);
    formData.set("topic", topic);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("Archivos subidos correctamente.");
        setCurrentConfig(data.config);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch {
      setStatus("Error de conexión.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerate() {
    setIsLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
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
                ? currentConfig.pdfs.join(", ")
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
              accept=".pdf"
              multiple
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imagen de ejemplo (opcional)
            </label>
            <input
              type="file"
              name="exampleImage"
              accept="image/*"
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:cursor-pointer"
            />
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
      </div>
    </div>
  );
}
