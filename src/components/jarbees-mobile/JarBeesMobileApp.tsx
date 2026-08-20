// src/components/jarbees-mobile/JarBeesMobileApp.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AssistantState,
  DeviceContext,
  DiagnosticsInfo,
  RecentAction,
  ActiveTimer,
  CoreHealthStatus,
} from "@/lib/jarbees-mobile/jarbeesMobile.types";
import {
  getDeviceContext,
  subscribeDeviceContext,
  initBrowserTelemetry,
} from "@/lib/jarbees-mobile/deviceContext";
import { getInterpreterProvider } from "@/lib/jarbees-mobile/providers";
import {
  dispatchCommand,
  createRecentAction,
  subscribeTimers,
} from "@/lib/jarbees-mobile/commandDispatcher";
import { checkCoreHealth, getEffectiveCoreUrl, sendMobileCommand } from "@/lib/jarbees-mobile/services/mobileGateway.api";
import { AudioOrbVisualizer } from "./AudioOrbVisualizer";
import { RecentActionsList } from "./RecentActionsList";
import { DiagnosticsDrawer } from "./DiagnosticsDrawer";
import {
  Mic,
  Send,
  SlidersHorizontal,
  Volume2,
  Battery,
  Headphones,
  Keyboard,
  X,
  VolumeX,
  Camera,
  Timer as TimerIcon,
  Trash2,
  Cpu,
  RefreshCw,
} from "lucide-react";

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart?: () => void;
  onresult?: (event: SpeechRecognitionResultEvent) => void;
  onerror?: (event: { error: string }) => void;
  onend?: () => void;
}

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

export default function JarBeesMobileApp() {
  const [state, setState] = useState<AssistantState>("idle");
  const [context, setContext] = useState<DeviceContext>(getDeviceContext());
  const [statusMessage, setStatusMessage] = useState<string>("Estoy listo");
  const [activeSubtext, setActiveSubtext] = useState<string>("Decime qué necesitás");
  const [transcript, setTranscript] = useState<string>("");
  const [textInput, setTextInput] = useState<string>("");
  const [showTextInput, setShowTextInput] = useState<boolean>(false);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);

  // Estado de conexión con JarBees Core (PC en casa)
  const [coreHealth, setCoreHealth] = useState<CoreHealthStatus>({
    online: false,
    latencyMs: 0,
    url: getEffectiveCoreUrl(),
  });
  const [isCheckingCore, setIsCheckingCore] = useState<boolean>(false);

  // Proveedor activo: server | webgpu | fallback | core
  const [providerId, setProviderId] = useState<"server" | "webgpu" | "fallback" | "core">("server");

  // Diagnóstico
  const [diagnostics, setDiagnostics] = useState<DiagnosticsInfo>({
    providerId: "server",
    modelName: "zarigata/Qwen2.5-0.5B-Instruct:CRAZYMODE",
    status: "ready",
    latencyMs: 0,
    lastIntent: null,
    confidence: 0.95,
  });

  // Referencias para Speech Recognition y VAD
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const performCoreHealthCheck = useCallback(async () => {
    setIsCheckingCore(true);
    const health = await checkCoreHealth();
    setCoreHealth(health);
    setIsCheckingCore(false);
  }, []);

  // Inicializar telemetría de dispositivo, temporizadores y health check del Core
  useEffect(() => {
    initBrowserTelemetry();
    const unsubContext = subscribeDeviceContext((newCtx) => {
      setContext(newCtx);
      setDiagnostics((prev) => ({ ...prev, contextSnapshot: newCtx }));
    });
    const unsubTimers = subscribeTimers((timers) => {
      setActiveTimers(timers);
    });

    performCoreHealthCheck();
    const coreInterval = setInterval(performCoreHealthCheck, 20000);

    return () => {
      unsubContext();
      unsubTimers();
      clearInterval(coreInterval);
    };
  }, [performCoreHealthCheck]);

  // Timer countdown ticker
  useEffect(() => {
    if (activeTimers.length === 0) return;
    const interval = setInterval(() => {
      setActiveTimers((prev) =>
        prev
          .map((t) => ({ ...t, remainingSeconds: Math.max(0, t.remainingSeconds - 1) }))
          .filter((t) => t.remainingSeconds > 0)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimers.length]);

  // Manejo de cámara real o simulada
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraOpen && typeof navigator !== "undefined" && navigator.mediaDevices) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then((s) => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(() => {
          // Fallback silencioso si no hay cámara
        });
    }
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [isCameraOpen]);

  // Procesamiento con Qwen 0.5B / Core Gateway
  const handleProcessCommand = useCallback(
    async (command: string) => {
      if (!command.trim()) return;

      setState("processing");
      setStatusMessage(providerId === "core" ? "Enviando a PC Core..." : "JarBees piensa...");
      setActiveSubtext(`Interpretando: "${command}"`);
      setDiagnostics((prev) => ({ ...prev, status: "inferring" }));

      try {
        const provider = getInterpreterProvider(providerId);
        const currentCtx = getDeviceContext();

        const result = await provider.interpret(command, currentCtx);

        // Despacho del Intent estructurado
        setState("executing");
        setStatusMessage(
          result.intent.domain === "core"
            ? "PC Core ejecutando..."
            : result.intent.domain === "device"
            ? "Ejecutando acción..."
            : result.intent.domain === "calculator"
            ? "Calculando..."
            : result.intent.domain === "timer"
            ? "Configurando temporizador..."
            : result.intent.domain === "handoff"
            ? "Conectando con JarBees Core..."
            : "Aplicando cambios..."
        );

        const dispatchRes = await dispatchCommand(result.intent, command, async (query) => {
          // Handoff hacia JarBees Core vía MobileGateway
          const coreRes = await sendMobileCommand("QUERY", { query }, currentCtx, command);
          if (coreRes.success) {
            return `PC Core respondió: ${coreRes.message || "OK"}`;
          }
          return `PC Core Offline (${coreRes.message}). Operando en modo local.`;
        });

        if (dispatchRes.cardType === "camera") {
          setIsCameraOpen(true);
        }

        setStatusMessage(dispatchRes.message);
        setActiveSubtext(`"${command}"`);

        // Feedback de voz sintética si está activado
        if (ttsEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {
          try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(dispatchRes.message.replace(/[\u{1F300}-\u{1FAFF}]/gu, ""));
            utter.lang = "es-ES";
            utter.rate = 1.05;
            window.speechSynthesis.speak(utter);
          } catch {
            // Ignorar fallo de TTS
          }
        }

        // Guardar en historial de acciones recientes
        const newAction = createRecentAction(command, result.intent, dispatchRes);
        setRecentActions((prev) => [newAction, ...prev.slice(0, 7)]);

        // Actualizar diagnóstico
        setDiagnostics({
          providerId,
          modelName: result.provider,
          status: "ready",
          latencyMs: result.latencyMs,
          lastRawResponse: result.rawText,
          lastIntent: result.intent,
          confidence: 0.96,
          contextSnapshot: currentCtx,
        });

        setTimeout(() => {
          setState("idle");
        }, 2500);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "No se pudo procesar la solicitud";
        setState("error");
        setStatusMessage("Error al interpretar");
        setActiveSubtext(errMsg);
        setTimeout(() => setState("idle"), 3000);
      } finally {
        setTranscript("");
      }
    },
    [providerId, ttsEnabled]
  );

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Inicializar Web Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const windowWithSpeech = window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
      };
      const SpeechRecognitionConstructor =
        windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

      if (SpeechRecognitionConstructor) {
        const reco = new SpeechRecognitionConstructor();
        reco.continuous = false;
        reco.interimResults = true;
        reco.lang = "es-ES";

        reco.onstart = () => {
          isListeningRef.current = true;
          setState("listening");
          setStatusMessage("JarBees escucha...");
          setActiveSubtext("Hablá con naturalidad...");
        };

        reco.onresult = (event: SpeechRecognitionResultEvent) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
          setActiveSubtext(`"${currentTranscript}"`);

          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (currentTranscript.trim()) {
              reco.stop();
            }
          }, 1400);
        };

        reco.onerror = (event: { error: string }) => {
          if (event.error !== "no-speech") {
            setStatusMessage("No se pudo capturar audio");
            setActiveSubtext("Tocá para reintentar o escribí abajo");
          }
          stopListening();
        };

        reco.onend = () => {
          isListeningRef.current = false;
          if (transcript.trim()) {
            handleProcessCommand(transcript.trim());
          } else {
            setState("idle");
            setStatusMessage("Estoy listo");
            setActiveSubtext("Decime qué necesitás");
          }
        };

        recognitionRef.current = reco;
      }
    }
  }, [transcript, handleProcessCommand, stopListening]);

  const startListening = () => {
    if (state === "processing") return;
    setTranscript("");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {
        recognitionRef.current.stop();
      }
    } else {
      setShowTextInput(true);
      setStatusMessage("Micrófono no disponible");
      setActiveSubtext("Escribí tu comando abajo:");
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const cmd = textInput.trim();
    setTextInput("");
    setShowTextInput(false);
    handleProcessCommand(cmd);
  };

  return (
    <main className="flex min-h-screen flex-col justify-between bg-slate-950 text-slate-100 selection:bg-cyan-500/30">
      {/* 1. TOP BAR / TELEMETRÍA DISCRETA Y ESTADO CORE */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-900/80 bg-slate-950/80 px-4 py-2.5 backdrop-blur-md">
        {/* Marca */}
        <div className="flex items-center gap-2">
          <span className="text-xl">🐝</span>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
              JarBees <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800">MOBILE</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-mono">Edge Assistant & Core Bridge</p>
          </div>
        </div>

        {/* Indicadores de Dispositivo + Core Status + Developer Gear */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Badge de Conexión con JarBees Core (PC en casa) */}
          <button
            onClick={performCoreHealthCheck}
            title={coreHealth.online ? `PC Core Conectada (${coreHealth.latencyMs}ms)` : "PC en casa offline - Operando en modo local"}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-all ${
              coreHealth.online
                ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
            }`}
          >
            <Cpu className="h-3 w-3" />
            <span>{isCheckingCore ? "Verificando..." : coreHealth.online ? `Core ${coreHealth.latencyMs}ms` : "Core Offline"}</span>
            <RefreshCw className={`h-2.5 w-2.5 text-slate-500 ${isCheckingCore ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <Battery className="h-3 w-3 text-emerald-400" /> {context.battery}%
            </span>
            <span className="flex items-center gap-1">
              <Volume2 className="h-3 w-3 text-cyan-400" /> {context.volume}%
            </span>
            {context.headphones && (
              <span className="flex items-center gap-1 text-blue-400">
                <Headphones className="h-3 w-3" />
              </span>
            )}
          </div>

          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white transition-colors"
            title={ttsEnabled ? "Voz activada" : "Voz silenciada"}
          >
            {ttsEnabled ? <Volume2 className="h-4 w-4 text-cyan-400" /> : <VolumeX className="h-4 w-4 text-slate-600" />}
          </button>

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-cyan-500/50 hover:bg-slate-850 hover:text-cyan-300 transition-all shadow-sm"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="text-[11px] hidden sm:inline">Settings</span>
          </button>
        </div>
      </header>

      {/* 2. ZONA CENTRAL: ESTADO DEL ASISTENTE Y ORBE */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-lg mx-auto w-full text-center">
        {/* Mensaje de Estado Principal */}
        <div className="space-y-1.5 mb-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-slate-800 px-3 py-1 text-[11px] text-cyan-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
            {state === "idle"
              ? "Disponible"
              : state === "listening"
              ? "Escuchando..."
              : state === "processing"
              ? "Procesando..."
              : "Ejecutando"}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {statusMessage}
          </h2>
          <p className="text-sm text-slate-400 max-w-xs mx-auto truncate font-medium">
            {activeSubtext}
          </p>
        </div>

        {/* Orbe Visualizador Central */}
        <AudioOrbVisualizer
          state={state}
          onClick={state === "listening" ? stopListening : startListening}
        />

        {/* Botón táctil principal [ HABLAR ] */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            onClick={state === "listening" ? stopListening : startListening}
            className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all transform active:scale-95 shadow-lg ${
              state === "listening"
                ? "bg-amber-500 text-slate-950 shadow-amber-500/30 animate-pulse"
                : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-cyan-600/30 hover:from-cyan-500 hover:to-blue-500"
            }`}
          >
            <Mic className={`h-4 w-4 ${state === "listening" ? "animate-bounce" : ""}`} />
            <span>{state === "listening" ? "DETENER Y ENVIAR" : "HABLAR"}</span>
          </button>
        </div>

        {/* WIDGET DE TEMPORIZADORES ACTIVOS */}
        {activeTimers.length > 0 && (
          <div className="w-full max-w-sm mt-4 p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 text-left space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300">
              <span className="flex items-center gap-1.5">
                <TimerIcon className="h-4 w-4" /> Temporizadores Activos
              </span>
              <button
                onClick={() => handleProcessCommand("cancelá todos los temporizadores")}
                className="text-[10px] text-amber-400/80 hover:text-amber-200 flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Cancelar
              </button>
            </div>
            {activeTimers.map((t) => (
              <div key={t.id} className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-300">
                  <span>{t.label}</span>
                  <span className="font-bold text-amber-400">
                    {Math.floor(t.remainingSeconds / 60)}:{(t.remainingSeconds % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-1000"
                    style={{ width: `${(t.remainingSeconds / t.durationSeconds) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chips de los 5 casos de prueba principales de V1 */}
        <div className="mt-6 flex flex-wrap justify-center gap-1.5 max-w-sm">
          {[
            "JarBees, abrí la cámara",
            "Bajá un poco el volumen",
            "¿Cuánta batería tengo?",
            "Calculá cuánto me queda si descuento 21% de 1837",
            "¿Qué podés hacer?",
            "JarBees, ¿cómo está mi teléfono?",
            "Poneme un temporizador de 18 minutos",
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => handleProcessCommand(chip)}
              className="rounded-lg border border-slate-800/80 bg-slate-900/50 px-2.5 py-1 text-[11px] text-slate-400 hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-300 transition-all"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* 3. BARRA INFERIOR: HISTORIAL RECIENTE + INPUT DE TEXTO */}
      <footer className="w-full max-w-lg mx-auto px-4 pb-6 space-y-4">
        {/* Historial de Acciones Recientes */}
        <RecentActionsList
          actions={recentActions}
          onActionClick={(act) => handleProcessCommand(act.userCommand)}
        />

        {/* Botón y Barra de Entrada de Texto [ ESCRIBIR ] */}
        {showTextInput ? (
          <form
            onSubmit={handleTextSubmit}
            className="flex items-center gap-2 rounded-2xl border border-cyan-500/40 bg-slate-900/90 p-2 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2"
          >
            <input
              type="text"
              autoFocus
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Escribí un comando (e.g. 'Abrí la cámara', 'Calculá 500 - 137')..."
              className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="rounded-xl bg-cyan-500 p-2 text-slate-950 hover:bg-cyan-400 disabled:opacity-40 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowTextInput(false)}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setShowTextInput(true)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-300 transition-colors py-2 px-4 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900"
            >
              <Keyboard className="h-3.5 w-3.5" />
              <span>ESCRIBIR UN COMANDO</span>
            </button>
          </div>
        )}
      </footer>

      {/* MODAL DE CÁMARA */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-sm rounded-3xl border border-purple-500/30 bg-slate-950 p-4 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-purple-300">
                <Camera className="h-4 w-4" /> Cámara del Dispositivo
              </span>
              <button
                onClick={() => setIsCameraOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-800">
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-500 text-xs space-y-2">
                <Camera className="h-10 w-10 text-purple-400 animate-pulse" />
                <span>Vista previa de cámara activa</span>
              </div>
            </div>
            <button
              onClick={() => setIsCameraOpen(false)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
            >
              Cerrar Cámara
            </button>
          </div>
        </div>
      )}

      {/* Drawer de Diagnóstico y Telemetría */}
      <DiagnosticsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        diagnostics={diagnostics}
        context={context}
        coreHealth={coreHealth}
        onRefreshCoreHealth={performCoreHealthCheck}
        onProviderChange={(p) => setProviderId(p)}
      />
    </main>
  );
}
