// src/components/jarbees-mobile/DiagnosticsDrawer.tsx
"use client";

import React, { useState } from "react";
import { DiagnosticsInfo, DeviceContext } from "@/lib/jarbees-mobile/jarbeesMobile.types";
import { updateDeviceContext } from "@/lib/jarbees-mobile/deviceContext";
import { getInterpreterProvider, WebGpuLocalProvider } from "@/lib/jarbees-mobile/providers";
import {
  X,
  Cpu,
  Zap,
  Activity,
  Layers,
  Sliders,
  Copy,
  Check,
  Headphones,
  Battery,
  Volume2,
  Music,
  Download,
  CheckCircle2,
} from "lucide-react";

interface DiagnosticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: DiagnosticsInfo;
  context: DeviceContext;
  onProviderChange: (providerId: "server" | "webgpu" | "fallback") => void;
}

export const DiagnosticsDrawer: React.FC<DiagnosticsDrawerProps> = ({
  isOpen,
  onClose,
  diagnostics,
  context,
  onProviderChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [loadStatus, setLoadStatus] = useState<{ loading: boolean; progress: number; text: string }>({
    loading: false,
    progress: 0,
    text: "",
  });

  if (!isOpen) return null;

  const handleCopyJson = () => {
    if (diagnostics.lastIntent) {
      navigator.clipboard.writeText(JSON.stringify(diagnostics.lastIntent, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePreloadWebGpu = async () => {
    const provider = getInterpreterProvider("webgpu") as WebGpuLocalProvider;
    if (!provider || !provider.loadModel) return;

    setLoadStatus({ loading: true, progress: 5, text: "Iniciando descarga de Qwen 0.5B Q4..." });
    await provider.loadModel((progress, text) => {
      setLoadStatus({ loading: progress < 100, progress, text });
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity">
      <div className="flex h-full w-full max-w-md flex-col bg-slate-950/95 border-l border-slate-850 p-5 text-slate-200 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Developer Diagnostics
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-5 text-xs">
          {/* 1. SELECCIÓN DE PROVEEDOR / MOTOR */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-cyan-400" /> Motor de Inferencia
              </span>
              <span className="rounded bg-cyan-950 px-2 py-0.5 font-mono text-[10px] text-cyan-300 border border-cyan-800">
                {diagnostics.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { id: "server" as const, label: "Server (Ollama)" },
                { id: "webgpu" as const, label: "WebGPU (HuggingFace)" },
                { id: "fallback" as const, label: "Rule Fallback" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => onProviderChange(p.id)}
                  className={`rounded-lg py-2 px-2 text-[10px] font-semibold transition-all border ${
                    diagnostics.providerId === p.id
                      ? "border-cyan-500 bg-cyan-500/20 text-cyan-200 shadow-sm"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-500 font-mono">
              Modelo: {diagnostics.modelName}
            </p>

            {/* Botón de carga bajo demanda para WebGPU */}
            {diagnostics.providerId === "webgpu" && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Modelo en Navegador (ONNX Q4)</span>
                  <button
                    onClick={handlePreloadWebGpu}
                    disabled={loadStatus.loading || loadStatus.progress === 100}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] disabled:opacity-50 transition-colors shadow"
                  >
                    {loadStatus.progress === 100 ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                    <span>{loadStatus.progress === 100 ? "Modelo Cargado" : loadStatus.loading ? "Descargando..." : "Cargar Modelo"}</span>
                  </button>
                </div>

                {loadStatus.loading && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-cyan-300">
                      <span>{loadStatus.text}</span>
                      <span>{loadStatus.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 transition-all duration-300"
                        style={{ width: `${loadStatus.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. TELEMETRÍA DE INFERENCIA */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-400" /> Latencia
              </span>
              <p className="text-lg font-bold font-mono text-amber-300 mt-1">
                {diagnostics.latencyMs} <span className="text-xs font-normal">ms</span>
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-emerald-400" /> Confianza
              </span>
              <p className="text-lg font-bold font-mono text-emerald-300 mt-1">
                {diagnostics.confidence ?? 0.95}
              </p>
            </div>
          </div>

          {/* 3. CONTEXTO DE DISPOSITIVO INTERACTIVO (SIMULADOR) */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-purple-400" /> Simulador de Contexto
              </span>
              <span className="text-[10px] text-slate-500">Live Device State</span>
            </div>

            {/* Batería */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Battery className="h-3.5 w-3.5 text-emerald-400" /> Nivel de Batería
                </span>
                <span className="font-mono text-slate-200">{context.battery}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={context.battery}
                onChange={(e) => updateDeviceContext({ battery: Number(e.target.value) })}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Volumen */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> Volumen de Audio
                </span>
                <span className="font-mono text-slate-200">{context.volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={context.volume}
                onChange={(e) => updateDeviceContext({ volume: Number(e.target.value) })}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Toggles de Auriculares, Música */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => updateDeviceContext({ headphones: !context.headphones })}
                className={`flex items-center justify-between rounded-lg p-2 text-[11px] border ${
                  context.headphones
                    ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300"
                    : "border-slate-800 bg-slate-950 text-slate-400"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Headphones className="h-3.5 w-3.5" /> Auriculares
                </span>
                <span className="font-bold">{context.headphones ? "ON" : "OFF"}</span>
              </button>

              <button
                onClick={() =>
                  updateDeviceContext({
                    music: context.music === "playing" ? "paused" : "playing",
                  })
                }
                className={`flex items-center justify-between rounded-lg p-2 text-[11px] border ${
                  context.music === "playing"
                    ? "border-blue-500/50 bg-blue-950/40 text-blue-300"
                    : "border-slate-800 bg-slate-950 text-slate-400"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5" /> Música
                </span>
                <span className="font-bold">
                  {context.music === "playing" ? "PLAY" : "PAUSE"}
                </span>
              </button>
            </div>
          </div>

          {/* 4. VISUALIZADOR DE ÚLTIMO INTENT (JSON) */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Último Intent JSON</span>
              <button
                onClick={handleCopyJson}
                disabled={!diagnostics.lastIntent}
                className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>

            <pre className="max-h-48 overflow-x-auto rounded-lg bg-slate-950 p-2.5 font-mono text-[11px] text-cyan-300/90 border border-slate-850">
              {diagnostics.lastIntent
                ? JSON.stringify(diagnostics.lastIntent, null, 2)
                : '// Esperando comando...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
