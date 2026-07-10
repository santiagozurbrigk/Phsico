import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Verdadero o Falso",
  description:
    "Juego de Verdadero o Falso con preguntas generadas por IA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <main className="min-h-screen flex flex-col">
          <header className="bg-white border-b border-gray-100 py-4 px-6">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <Link href="/" className="text-xl font-bold text-primary">
                Verdadero o Falso
              </Link>
              <span className="text-xs text-gray-400">Powered by IA</span>
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center p-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
