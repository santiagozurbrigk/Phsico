export default function PagoFallidoPage() {
  return (
    <div className="w-full max-w-md mx-auto text-center">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2 text-red-700">
          Pago no completado
        </h2>
        <p className="text-gray-600 mb-6">
          El pago no se pudo procesar. No se realizó ningún cargo.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
