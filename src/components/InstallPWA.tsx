"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "./ui/button";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if user already dismissed the prompt recently
    const dismissedUntil = localStorage.getItem("pwa-install-dismissed");
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
      return;
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("PWA instalada exitosamente");
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    // Dismiss for 7 days
    const dismissUntil = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("pwa-install-dismissed", dismissUntil.toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-slide-up">
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-4 shadow-2xl shadow-cyan-500/10 backdrop-blur-sm">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-2 shadow-lg shadow-cyan-500/20">
            <Image 
              src={`${BASE_PATH}/JarBees_logo.png`}
              alt="JarBees" 
              width={36} 
              height={36} 
              className="object-contain"
            />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-100">
              Instalar JarBees
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Acceso rápido desde tu pantalla de inicio. Funciona offline.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-semibold text-white hover:from-cyan-400 hover:to-blue-500"
          >
            Instalar
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            className="text-xs text-slate-400 hover:text-slate-300"
          >
            Ahora no
          </Button>
        </div>
      </div>
    </div>
  );
}
