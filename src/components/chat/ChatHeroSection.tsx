"use client";
import { useState } from "react";
import Image from "next/image";
import { ActionButton } from "./ActionButton";

interface ChatHeroSectionProps {
  onActionClick: (action: "image" | "write" | "search") => void;
  onChatStart: () => void;
}

export function ChatHeroSection({ onActionClick, onChatStart }: ChatHeroSectionProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-4 text-center">
      {/* Logo y título */}
      <div className="mb-8 md:animate-fade-in-up">
        <div className="mb-4 flex justify-center">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 opacity-30 md:blur-2xl"></div>
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg md:shadow-2xl">
              <Image src="/JarBees_logo.png" alt="JarBees" width={40} height={40} className="object-contain" />
            </div>
          </div>
        </div>
        <h1 className="mb-4 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
          Asistente IA
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-400">
          ¿Por dónde empezamos hoy? Puedo ayudarte con imágenes, redacción, búsquedas y mucho más.
        </p>
      </div>

      {/* Acciones rápidas */}
      <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
        <ActionButton
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-8 w-8"
            >
              <path d="M1.5 5.25a3 3 0 013-3h15a3 3 0 013 3v13.5a3 3 0 01-3 3h-15a3 3 0 01-3-3V5.25zM12 12.75a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zM18.375 19.125a.75.75 0 00-1.05-1.05l-2.25 2.25a.75.75 0 001.05 1.05l2.25-2.25zM12 16.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM6.375 19.125a.75.75 0 00-1.05-1.05l-2.25 2.25a.75.75 0 001.05 1.05l2.25-2.25z" />
            </svg>
          }
          label="Crear imagen"
          onClick={() => onActionClick("image")}
        />
        <ActionButton
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-8 w-8"
            >
              <path d="M11.7 2.805a.75.75 0 01.6 0A27.2 27.2 0 0112 4.08c2.565.313 5.056.755 7.47 1.349a.75.75 0 01.531 1.145l-1.937 1.938a.75.75 0 00-.176.53c.24.804.461 1.625.66 2.46a.75.75 0 01-.721.996H3.889a.75.75 0 01-.721-.996c.199-.835.42-1.656.66-2.46a.75.75 0 00-.176-.53L.544 4.33a.75.75 0 01.531-1.145A27.2 27.2 0 0112 4.08c2.565.313 5.056.755 7.47 1.349z" />
            </svg>
          }
          label="Escribir o editar"
          onClick={() => onActionClick("write")}
        />
        <ActionButton
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-8 w-8"
            >
              <path
                fillRule="evenodd"
                d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
                clipRule="evenodd"
              />
            </svg>
          }
          label="Buscar información"
          onClick={() => onActionClick("search")}
        />
      </div>

      {/* Botón principal */}
      <button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onChatStart}
        className={`group relative overflow-hidden rounded-full px-10 py-4 transition-all duration-300 ${
          isHovered
            ? "scale-105 shadow-[0_0_40px_rgba(6,182,212,0.4)]"
            : "shadow-lg"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
        <span className="relative flex items-center gap-3 text-xl font-semibold text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`h-6 w-6 transition-transform duration-300 ${isHovered ? "translate-x-1" : ""}`}
          >
            <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.137 0 4.252.139 6.337.408 1.922.25 3.29 1.86 3.405 3.72l.135 2.133c.214 3.378-1.288 6.54-3.578 8.34l-2.76 2.288c-1.539 1.273-3.76 1.273-5.297 0L8.34 18.26c-2.29-1.8-3.792-4.962-3.578-8.34l.135-2.133c.115-1.86 1.483-3.47 3.405-3.72zM12 15.75a3 3 0 100-6 3 3 0 000 6z" />
          </svg>
          Comenzar a chatear
        </span>
      </button>
    </div>
  );
}
