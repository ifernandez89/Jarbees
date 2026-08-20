// src/components/jarbees-mobile/AudioOrbVisualizer.tsx
"use client";

import React from "react";
import { AssistantState } from "@/lib/jarbees-mobile/jarbeesMobile.types";

interface AudioOrbVisualizerProps {
  state: AssistantState;
  onClick?: () => void;
  isTouchHolding?: boolean;
}

export const AudioOrbVisualizer: React.FC<AudioOrbVisualizerProps> = ({
  state,
  onClick,
  isTouchHolding,
}) => {
  return (
    <div className="relative flex items-center justify-center py-6 select-none">
      {/* Halo de luz / Glow de fondo dinámico */}
      <div
        className={`absolute -inset-4 rounded-full blur-3xl transition-all duration-700 pointer-events-none opacity-60 ${
          state === "listening"
            ? "bg-amber-500/40 scale-125 animate-pulse"
            : state === "processing"
            ? "bg-cyan-500/40 scale-110 animate-spin"
            : state === "executing"
            ? "bg-emerald-500/40 scale-120"
            : "bg-cyan-600/20 scale-90 hover:scale-100"
        }`}
      />

      {/* Anillos de pulsación durante escucha */}
      {state === "listening" && (
        <>
          <div className="absolute h-44 w-44 rounded-full border border-amber-400/30 animate-ping duration-1000" />
          <div className="absolute h-52 w-52 rounded-full border border-amber-400/15 animate-ping duration-1500" />
        </>
      )}

      {/* Orbe Central */}
      <button
        onClick={onClick}
        type="button"
        aria-label="Botón de interacción del asistente"
        className={`relative z-10 flex h-36 w-36 items-center justify-center rounded-full transition-all duration-300 transform active:scale-95 shadow-2xl focus:outline-none ${
          state === "listening" || isTouchHolding
            ? "bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 shadow-amber-500/50 scale-105"
            : state === "processing"
            ? "bg-gradient-to-tr from-cyan-700 via-cyan-600 to-blue-500 shadow-cyan-500/40"
            : state === "executing"
            ? "bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 shadow-emerald-500/50 scale-105"
            : "bg-gradient-to-tr from-slate-900 via-slate-800 to-cyan-950/80 border border-cyan-500/30 hover:border-cyan-400 shadow-cyan-900/30 hover:scale-102"
        }`}
      >
        {/* Renderizado de estado dentro del orbe */}
        {state === "listening" ? (
          // Visualizador de onda de audio cuando escucha
          <div className="flex items-center gap-1.5 h-12">
            {[40, 75, 100, 60, 90, 45, 80].map((h, i) => (
              <span
                key={`wave-bar-${i}`}
                className="w-1.5 bg-white/95 rounded-full animate-pulse"
                style={{
                  height: `${h}%`,
                  animationDuration: `${0.4 + (i % 3) * 0.2}s`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        ) : state === "processing" ? (
          // Spinner cuántico cuando procesa
          <div className="relative flex items-center justify-center">
            <div className="h-14 w-14 rounded-full border-3 border-white/20 border-t-white animate-spin" />
            <span className="absolute text-xl font-bold text-white tracking-widest animate-pulse">
              ◉
            </span>
          </div>
        ) : state === "executing" ? (
          // Check o abeja activa cuando ejecuta
          <div className="flex flex-col items-center">
            <span className="text-3xl animate-bounce">🐝</span>
          </div>
        ) : (
          // Estado disponible / reposo
          <div className="flex flex-col items-center group">
            <span className="text-4xl filter drop-shadow-md group-hover:scale-110 transition-transform">
              🐝
            </span>
            <div className="mt-1 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-cyan-300/80">
                Online
              </span>
            </div>
          </div>
        )}

        {/* Borde sutil reflectivo */}
        <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
      </button>
    </div>
  );
};
