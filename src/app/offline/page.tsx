"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function OfflinePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const checkConnection = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        router.push("/");
      }
    };

    // Check immediately
    checkConnection();

    // Listen for online event
    window.addEventListener("online", checkConnection);
    window.addEventListener("offline", () => setIsOnline(false));

    // Retry every 5 seconds
    const interval = setInterval(() => {
      setRetryCount((prev) => prev + 1);
      checkConnection();
    }, 5000);

    return () => {
      window.removeEventListener("online", checkConnection);
      window.removeEventListener("offline", () => setIsOnline(false));
      clearInterval(interval);
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center">
      <div className="max-w-md space-y-6">
        {/* Logo/Icon */}
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 shadow-lg">
          <span className="text-5xl">📡</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-slate-100">
          Sin conexión
        </h1>

        {/* Description */}
        <p className="text-slate-400">
          No hay conexión a internet. Las páginas que ya visitaste están
          disponibles, pero necesitás estar online para usar el chat con IA.
        </p>

        {/* Retry info */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-sm text-slate-500">
            Intentando reconectar automáticamente...
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Intento #{retryCount}
          </p>
        </div>

        {/* Manual retry button */}
        <button
          onClick={() => {
            setRetryCount((prev) => prev + 1);
            if (navigator.onLine) {
              router.push("/");
            }
          }}
          className="w-full rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 px-6 py-3 font-semibold text-cyan-400 transition-colors hover:from-cyan-500/20 hover:to-blue-600/20"
        >
          Reintentar ahora
        </button>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <div
            className={`h-2 w-2 rounded-full ${
              isOnline ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          <span className="text-slate-500">
            {isOnline ? "Conectado" : "Desconectado"}
          </span>
        </div>
      </div>
    </div>
  );
}
