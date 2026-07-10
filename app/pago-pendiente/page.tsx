export default function PagoPendientePage() {
  return (
    <div className="w-full max-w-md mx-auto text-center">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Pago pendiente</h2>
        <p className="text-gray-600 mb-6">
          Tu pago está pendiente de confirmación. Una vez que se acredite,
          tu acceso premium se activará automáticamente.
        </p>
        <a
          href="/pago-exitoso"
          className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
        >
          Verificar estado del pago
        </a>
      </div>
    </div>
  );
}
