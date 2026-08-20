"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChatInputSimple } from "./ChatInputSimple";
import { ChatMessageCompact } from "./ChatMessageCompact";
import { loadConversation, saveConversation } from "@/lib/db";
import { MAX_MESSAGE_LENGTH } from "@/lib/utils";
import { hacerPregunta, classifyError, initSession, fetchHistory, type HistoryMessage } from "../../app/services/preguntas.api";
import { analyzeImage, ingestPdf, getLibraryIndex, type LibraryIndexItem } from "../../app/services/jarbees.api";
import type { AttachedFile } from "./ChatInputSimple";
import { startBalanceSession, submitBalanceAnswer, finishBalanceSession, getLatestBalance, type BalanceReport, type BalanceQuestion } from "../../app/services/balance.api";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  responseTime?: number;
  isError?: boolean;
}

interface SpeechRecognitionEventLike extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      length: number;
    };
    length: number;
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

export default function ChatInterfaceSimple() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [audioEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const [librarySuggestions, setLibrarySuggestions] = useState<LibraryIndexItem[]>([]);

  // Estado Energético Questionnaire & Report States
  const [showBalancePrompt, setShowBalancePrompt] = useState(false);
  const [isBalanceActive, setIsBalanceActive] = useState(false);
  const [balanceSessionId, setBalanceSessionId] = useState<number | null>(null);
  const [balanceQuestions, setBalanceQuestions] = useState<BalanceQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [balanceAnswers, setBalanceAnswers] = useState<Record<number, string>>({});
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [balanceLoadingStatus, setBalanceLoadingStatus] = useState<string | null>(null);
  const [balanceReport, setBalanceReport] = useState<BalanceReport | null>(null);
  const [hasMoreQuestions, setHasMoreQuestions] = useState(true);

  // Cargar índice de la biblioteca para autocompletado
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const docs = await getLibraryIndex();
        if (mounted) {
          setLibrarySuggestions(docs);
        }
      } catch (error) {
        console.warn("No se pudo cargar el índice de la biblioteca para autocompletado:", error);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const MAX_IN_MEMORY = 200;

  // Nombres de voces masculinas conocidas
  const MALE_VOICE_NAMES = [
    "Microsoft Pablo", "Microsoft Jorge", "Google español",
    "Jorge", "Pablo", "Diego", "Carlos", "Ricardo", "Miguel",
  ];

  const FEMALE_KEYWORDS = ["female", "femenina", "mujer", "woman", "laura", "helena",
    "mónica", "monica", "paulina", "luciana", "isabela", "rosa", "sabina", "lupe"];

  const selectMaleVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const esVoices = voices.filter((v) =>
      v.lang.startsWith("es") || v.lang.startsWith("ES"),
    );
    const pool = esVoices.length ? esVoices : voices;

    for (const name of MALE_VOICE_NAMES) {
      const match = pool.find((v) =>
        v.name.toLowerCase().includes(name.toLowerCase()),
      );
      if (match) return match;
    }

    const nonFemale = pool.filter(
      (v) => !FEMALE_KEYWORDS.some((kw) => v.name.toLowerCase().includes(kw)),
    );
    return nonFemale[0] ?? pool[0] ?? null;
  };

  const getOrLoadVoice = (callback: (voice: SpeechSynthesisVoice | null) => void) => {
    if (voiceRef.current) {
      callback(voiceRef.current);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      voiceRef.current = selectMaleVoice();
      callback(voiceRef.current);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        voiceRef.current = selectMaleVoice();
        window.speechSynthesis.onvoiceschanged = null;
        callback(voiceRef.current);
      };
    }
  };

  const sanitizeForSpeech = (text: string): string =>
    text
      // emojis y símbolos Unicode
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
      .replace(/[\u{2600}-\u{27BF}]/gu, "")
      // markdown: negrita, cursiva, código, encabezados, listas, separadores
      .replace(/#{1,6}\s*/g, "")
      .replace(/\*{1,3}([^*]*)\*{1,3}/g, "$1")
      .replace(/_{1,2}([^_]*)_{1,2}/g, "$1")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/^[-*•·]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      .replace(/^>\s*/gm, "")
      .replace(/[-]{3,}/g, "")
      // URLs
      .replace(/https?:\/\/\S+/g, "")
      // espacios múltiples y líneas vacías extra
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const speakText = (text: string) => {
    if (!speechSupported || !audioEnabled) return;
    window.speechSynthesis.cancel();
    getOrLoadVoice((voice) => {
      const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
      utterance.lang = "es-ES";
      utterance.rate = 0.92;
      utterance.pitch = 0.75;
      utterance.volume = 1;
      if (voice) utterance.voice = voice;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    });
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // ─── NIVEL 1: Init sesión + recuperar historial del backend ─────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 1. Obtener / crear sessionId en el backend
        const sessionId = await initSession();

        if (!mounted) return;

        if (sessionId) {
          // 2. Recuperar historial del backend para reconstruir el chat
          const history = await fetchHistory(sessionId);

          if (mounted && history.length > 0) {
            const msgs: Message[] = history.map((h: HistoryMessage, i: number) => ({
              id: `history-${i}`,
              role: h.role,
              content: h.content,
              timestamp: h.timestamp ? new Date(h.timestamp) : new Date(),
            }));
            setMessages(msgs.slice(-MAX_IN_MEMORY));
          } else {
            // 3. Fallback: IndexedDB local si el backend no tiene historial
            const saved = await loadConversation("default");
            if (mounted && saved?.messages) {
              const msgs = Array.isArray(saved.messages) ? saved.messages : [];
              setMessages(msgs.slice(-MAX_IN_MEMORY));
            }
          }
        }

        // 4. Verificar si es momento de realizar el balance energético (Proactividad)
        try {
          const latest = await getLatestBalance();
          if (!mounted) return;
          if ("message" in latest) {
            setShowBalancePrompt(true);
          } else if (latest.nextRecommendedAt) {
            const nextDate = new Date(latest.nextRecommendedAt);
            if (new Date() >= nextDate) {
              setShowBalancePrompt(true);
            }
          }
        } catch (err) {
          console.warn("No se pudo comprobar el estado del balance energético:", err);
        }

      } catch (error) {
        // Si todo falla, arrancamos con chat vacío
        void error;
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Save conversation
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        saveConversation('default', messages);
      } catch {
        // ignore
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [messages]);

  // Check browser support
  useEffect(() => {
    const SpeechRecognitionAPI = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new (SpeechRecognitionAPI as unknown as new () => SpeechRecognitionLike)();
      recognition.lang = "es-ES";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript;
        setInputValue(transcript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (event.error !== "network" && event.error !== "aborted" && event.error !== "no-speech") {
          console.warn("Speech recognition error:", event.error);
        }
      };

      recognitionRef.current = recognition;
    }

    if ("speechSynthesis" in window) {
      setSpeechSupported(true);
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (msg: Message) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      if (next.length > MAX_IN_MEMORY) return next.slice(-MAX_IN_MEMORY);
      return next;
    });
  };

  // ─── Métodos del Cuestionario de Balance Energético ───────────────────────────────
  const handleStartBalance = async () => {
    setIsTyping(true);
    setShowBalancePrompt(false);
    try {
      const data = await startBalanceSession("manual");
      setBalanceSessionId(data.sessionId);
      setBalanceQuestions(data.questions);
      setCurrentQuestionIndex(0);
      setBalanceAnswers({});
      setIsBalanceActive(true);
      setInputValue("");
      setHasMoreQuestions(true);
    } catch (error) {
      console.error("Error al iniciar balance:", error);
      addMessage({
        id: Date.now().toString(),
        role: "system",
        content: "⚠️ No se pudo iniciar el cuestionario de balance energético. Verificá que el backend esté encendido.",
        timestamp: new Date(),
        isError: true,
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!balanceSessionId || balanceQuestions.length === 0) return;
    const currentQuestion = balanceQuestions[currentQuestionIndex];
    if (!currentQuestion) return;

    setIsSubmittingAnswer(true);
    try {
      const res = await submitBalanceAnswer(balanceSessionId, currentQuestion.id, inputValue.trim());
      const nextAnswers = { ...balanceAnswers, [currentQuestion.id]: inputValue.trim() };
      setBalanceAnswers(nextAnswers);

      const nextIdx = currentQuestionIndex + 1;

      if (nextIdx < balanceQuestions.length) {
        // Navegando hacia adelante por preguntas ya cargadas anteriormente
        setCurrentQuestionIndex(nextIdx);
        const nextQuestion = balanceQuestions[nextIdx];
        setInputValue(nextQuestion ? nextAnswers[nextQuestion.id] || "" : "");
      } else {
        // En la última pregunta cargada
        if (res.nextQuestion) {
          // Agregar la nueva pregunta dinámica al array
          setBalanceQuestions((prev) => [...prev, res.nextQuestion!]);
          setCurrentQuestionIndex(nextIdx);
          setInputValue("");
          setHasMoreQuestions(true);
        } else {
          // No hay más preguntas, la entrevista terminó
          setHasMoreQuestions(false);
        }
      }
    } catch (error) {
      console.error("Error al guardar respuesta:", error);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex === 0) return;
    const currentQuestion = balanceQuestions[currentQuestionIndex];
    if (!currentQuestion) return;

    const nextAnswers = { ...balanceAnswers, [currentQuestion.id]: inputValue.trim() };
    setBalanceAnswers(nextAnswers);

    const prevIdx = currentQuestionIndex - 1;
    setCurrentQuestionIndex(prevIdx);

    const prevQuestion = balanceQuestions[prevIdx];
    setInputValue(prevQuestion ? nextAnswers[prevQuestion.id] || "" : "");
  };

  const handleFinishQuestionnaire = async () => {
    if (!balanceSessionId || balanceQuestions.length === 0) return;
    const currentQuestion = balanceQuestions[currentQuestionIndex];
    if (!currentQuestion) return;

    setIsSubmittingAnswer(true);
    setBalanceLoadingStatus("Guardando respuesta final...");
    try {
      await submitBalanceAnswer(balanceSessionId, currentQuestion.id, inputValue.trim());
      const finalAnswers = { ...balanceAnswers, [currentQuestion.id]: inputValue.trim() };
      setBalanceAnswers(finalAnswers);

      setBalanceLoadingStatus("Iniciando procesamiento del balance...");
      const statusSteps = [
        "Analizando respuestas de las 7 dimensiones...",
        "Calculando tránsitos astrológicos y posiciones planetarias...",
        "Generando recomendaciones y puntos ciegos mediante IA...",
        "Creando reporte de balance energético...",
      ];

      let stepIdx = 0;
      const interval = setInterval(() => {
        if (stepIdx < statusSteps.length) {
          setBalanceLoadingStatus(statusSteps[stepIdx]);
          stepIdx++;
        }
      }, 2000);

      const report = await finishBalanceSession(balanceSessionId);

      clearInterval(interval);
      setBalanceLoadingStatus(null);
      setBalanceReport(report);
      setIsBalanceActive(false);
      setInputValue("");
    } catch (error) {
      console.error("Error al finalizar balance:", error);
      setBalanceLoadingStatus(null);
      alert("Hubo un error al generar el análisis. Asegurate de que el backend y el LLM estén funcionando correctamente.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleViewLatestReport = async () => {
    setIsTyping(true);
    try {
      const report = await getLatestBalance();
      if ("message" in report) {
        alert("Aún no completaste ningún cuestionario de balance energético.");
      } else {
        setBalanceReport(report as BalanceReport);
        setIsBalanceActive(false);
      }
    } catch (error: unknown) {
      console.error("Error al obtener último balance:", error);
      const err = error as Error;
      alert(`No se pudo cargar tu balance energético actual: ${err.message || String(error)}`);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (error) {
        console.warn("Error al detener el reconocimiento de voz:", error);
      }
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.warn("No se pudo iniciar el reconocimiento de voz:", error);
        }
      }
    }
  };

  const handleSubmit = async () => {
    const trimmedInput = inputValue.trim();

    if (!trimmedInput && !attachedFile) return;

    // Pausar inmediatamente cualquier dictado/respuesta de voz en curso
    stopSpeaking();

    if (trimmedInput.toLowerCase() === "/balance" || trimmedInput.toLowerCase() === "/cuestionario") {
      setInputValue("");
      handleStartBalance();
      return;
    }

    if (trimmedInput.length > MAX_MESSAGE_LENGTH) {
      setInputError(`Mensaje máximo: ${MAX_MESSAGE_LENGTH} caracteres.`);
      return;
    }

    setInputError(null);

    const userContent = attachedFile
      ? trimmedInput
        ? `[${attachedFile.type === "image" ? "Imagen" : "PDF"}: ${attachedFile.file.name}] ${trimmedInput}`
        : `[${attachedFile.type === "image" ? "Imagen" : "PDF"}: ${attachedFile.file.name}]`
      : trimmedInput;

    addMessage({
      id: Date.now().toString(),
      role: "user",
      content: userContent,
      timestamp: new Date(),
    });

    setInputValue("");
    setInputError(null);
    const currentFile = attachedFile;
    setAttachedFile(null);
    setIsTyping(true);

    const startTime = performance.now();
    const sessionId =
      typeof window !== "undefined"
        ? (window.localStorage.getItem("jarbees_session_id") ?? undefined)
        : undefined;

    try {
      let answer: string;
      let responseTime: number;

      if (currentFile?.type === "image") {
        const result = await analyzeImage(currentFile.file, {
          question: trimmedInput || undefined,
          mode: "general",
          sessionId,
        });
        responseTime = result.latencyMs ?? performance.now() - startTime;
        answer = result.answer;

      } else if (currentFile?.type === "pdf") {
        const result = await ingestPdf(currentFile.file, {
          title: currentFile.file.name.replace(/\.pdf$/i, ""),
          question: trimmedInput || undefined,
          sessionId,
        });
        responseTime = performance.now() - startTime;
        // Si el backend respondió una pregunta, mostramos esa respuesta;
        // si no, confirmamos la ingestión
        answer = result.answer
          ? result.answer
          : `✅ PDF "${result.title}" guardado en tu biblioteca. Se procesaron ${result.chunks} fragmentos y ya está disponible para consultas.`;

      } else {
        const result = await hacerPregunta(trimmedInput, "ollama", { autoGeolocation: true });
        responseTime = performance.now() - startTime;
        answer = result.answer;
      }

      const assistantId = (Date.now() + 1).toString();
      addMessage({
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        responseTime,
      });

      const tokens = answer.split(/(\s+)/);
      let accumulated = "";
      tokens.forEach((tok, idx) => {
        setTimeout(() => {
          accumulated += tok;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
          );
          if (idx === tokens.length - 1) {
            setIsTyping(false);
            if (audioEnabled && !isSpeaking) speakText(answer);
          }
        }, 40 * idx);
      });

    } catch (error) {
      const errorMsg = classifyError(error);
      setIsTyping(false);
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "system",
        content: errorMsg,
        timestamp: new Date(),
        isError: true,
      });
    }
  };

  const renderProactivityPrompt = () => {
    return (
      <div className="mx-auto my-4 max-w-2xl rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 to-blue-950/40 p-4 shadow-lg shadow-cyan-500/5 backdrop-blur-sm animate-fade-in flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Balance Energético Recomendado</h4>
            <p className="text-xs text-slate-400">Pasaron más de 15 días desde tu último balance de estado o no tenés registros previos.</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowBalancePrompt(false)}
            className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 transition"
          >
            Ignorar
          </button>
          <button
            onClick={handleStartBalance}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition"
          >
            Realizar Hoy
          </button>
        </div>
      </div>
    );
  };

  const renderQuestionnaire = () => {
    const currentQuestion = balanceQuestions[currentQuestionIndex];
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/60 p-6 md:p-8 shadow-2xl backdrop-blur-md flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">Balance de Estado Energético</span>
            </div>
            <span className="text-xs font-medium text-slate-400">
              Pregunta {currentQuestionIndex + 1} de 10
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
              style={{ width: `${Math.min(((currentQuestionIndex + 1) / 10) * 100, 100)}%` }}
            />
          </div>

          <div className="my-4">
            <h3 className="text-lg md:text-xl font-medium text-slate-100 leading-relaxed">
              {currentQuestion?.question}
            </h3>
            <p className="mt-2 text-xs text-slate-500 italic">
              Respondé libremente y con honestidad sobre cómo solés actuar en esta situación. Podés usar dictado de voz.
            </p>
          </div>

          <div className="relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribí tu reflexión aquí..."
              className="w-full min-h-[120px] max-h-[240px] rounded-2xl border border-slate-700 bg-slate-950/85 p-4 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition resize-y"
            />
            {isListening && (
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] text-cyan-400 border border-cyan-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping" />
                Escuchando...
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-2">
              <button
                onClick={toggleVoiceInput}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${isListening
                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                title={isListening ? "Detener dictado" : "Dictar respuesta"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M11.75 20.75a.75.75 0 0 1 1.5 0V22a.75.75 0 0 1-1.5 0v-1.25Z" />
                  <path d="M19 12a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V20h-3a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-1.07A7 7 0 0 0 19 12Z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                Anterior
              </button>

              {/* Opción de finalizar temprano si hay al menos 5 respuestas */}
              {currentQuestionIndex >= 4 && hasMoreQuestions && (
                <button
                  onClick={handleFinishQuestionnaire}
                  disabled={!inputValue.trim() || isSubmittingAnswer}
                  className="rounded-xl bg-gradient-to-r from-emerald-500/85 to-teal-600/85 px-4 py-2 text-xs font-medium text-white shadow-md shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1.5"
                  title="Finalizar la entrevista y generar el informe ahora (mínimo 5 respuestas)"
                >
                  {isSubmittingAnswer ? (
                    <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                  ) : null}
                  Generar Informe
                </button>
              )}

              {(currentQuestionIndex < balanceQuestions.length - 1 || hasMoreQuestions) ? (
                <button
                  onClick={handleNextQuestion}
                  disabled={!inputValue.trim() || isSubmittingAnswer}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-medium text-white shadow-lg shadow-cyan-500/10 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1.5"
                >
                  {isSubmittingAnswer ? (
                    <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                  ) : null}
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={handleFinishQuestionnaire}
                  disabled={!inputValue.trim() || isSubmittingAnswer}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2 text-xs font-medium text-white shadow-lg shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1.5"
                >
                  {isSubmittingAnswer ? (
                    <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                  ) : null}
                  Generar Informe
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBalanceReportDashboard = (report: BalanceReport) => {
    const dimensionGradients: Record<string, string> = {
      "expansión": "from-purple-500 to-indigo-600",
      "expansion": "from-purple-500 to-indigo-600",
      "disciplina": "from-blue-500 to-cyan-600",
      "armonía": "from-teal-400 to-emerald-500",
      "armonia": "from-teal-400 to-emerald-500",
      "perseverancia": "from-emerald-400 to-green-500",
      "análisis": "from-amber-400 to-orange-500",
      "analisis": "from-amber-400 to-orange-500",
      "integración": "from-orange-500 to-red-600",
      "integracion": "from-orange-500 to-red-600",
      "manifestación": "from-pink-500 to-rose-600",
      "manifestacion": "from-pink-500 to-rose-600",
    };

    const getGradient = (dim: string) => {
      return dimensionGradients[dim.toLowerCase()] || "from-cyan-500 to-blue-600";
    };

    return (
      <div className="mx-auto max-w-4xl p-4 md:p-6 animate-fade-in text-slate-100 flex flex-col gap-6 overflow-y-auto h-full max-h-[85vh]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="text-center sm:text-left">
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-[11px] text-cyan-400 font-semibold uppercase tracking-wide">
              Informe de Balance Energético
            </span>
            <h2 className="text-xl md:text-2xl font-bold mt-2 text-slate-100">Tu Estado Energético</h2>
            <p className="text-xs text-slate-400 mt-1">
              Evaluado el {new Date(report.completedAt).toLocaleDateString("es-AR", { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => setBalanceReport(null)}
            className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 px-4 py-2 text-xs font-semibold text-slate-200 transition shadow-md shrink-0"
          >
            ← Volver al Chat
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 rounded-3xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-500/5 blur-2xl pointer-events-none" />
            <span className="text-[10px] uppercase tracking-wider text-cyan-400/80 font-bold mb-4">Puntaje Vitalidad</span>
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-cyan-500/20 bg-cyan-950/30 shadow-lg shadow-cyan-500/5">
              <span className="text-3xl font-extrabold text-cyan-400">{report.scoreGeneral}</span>
              <span className="text-[9px] font-bold tracking-widest text-cyan-500/70 uppercase">Total</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed max-w-[180px]">
              Tu energía general muestra una integración activa de tus dimensiones cotidianas.
            </p>
          </div>

          <div className="md:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/30 p-6 flex flex-col justify-center shadow-lg relative overflow-hidden">
            <svg className="absolute top-4 right-4 h-8 w-8 text-slate-850 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2 block">Resumen Energético</span>
            <p className="text-xs md:text-sm text-slate-200 italic leading-relaxed whitespace-pre-line pr-4">
              &ldquo;{report.summary}&rdquo;
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100">Distribución de Energía</h4>
              <p className="text-[11px] text-slate-400 mt-1">Cómo utilizás tu vitalidad en las 7 dimensiones clave</p>
            </div>
            <div className="flex flex-col gap-3.5">
              {Object.entries(report.energyDistribution).map(([dim, val]) => (
                <div key={dim} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="capitalize text-slate-300">{dim}</span>
                    <span className="text-cyan-400">{val}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${getGradient(dim)} transition-all duration-1000`}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-gradient-to-br from-indigo-950/20 via-slate-900/50 to-purple-950/20 p-6 shadow-lg flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute -right-16 -bottom-16 h-36 w-36 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                🪐 Clima Astrológico
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">Influencia cósmica en tu estado de energía actual</p>
            </div>
            <p className="text-[11px] md:text-xs text-slate-300 leading-relaxed overflow-y-auto max-h-[190px] pr-1">
              {report.analysis.astrologyConnection || "Tu balance energético actual se integra armónicamente con las configuraciones celestes. Los planetas estimulan la manifestación de tus metas."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col gap-2.5 shadow-md">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              🟢 Fortalezas
            </h5>
            <ul className="flex flex-col gap-2">
              {report.analysis.fortalezas.map((f, idx) => (
                <li key={idx} className="text-[11px] text-slate-300 leading-relaxed flex gap-1.5">
                  <span className="text-emerald-400 shrink-0">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col gap-2.5 shadow-md">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              🟡 En Crecimiento
            </h5>
            <ul className="flex flex-col gap-2">
              {report.analysis.enCrecimiento.map((f, idx) => (
                <li key={idx} className="text-[11px] text-slate-300 leading-relaxed flex gap-1.5">
                  <span className="text-amber-400 shrink-0">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex flex-col gap-2.5 shadow-md">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
              🔴 Necesitan Atención
            </h5>
            <ul className="flex flex-col gap-2">
              {report.analysis.necesitanAtencion.map((f, idx) => (
                <li key={idx} className="text-[11px] text-slate-300 leading-relaxed flex gap-1.5">
                  <span className="text-red-400 shrink-0">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/30 p-5 flex flex-col gap-2">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lo que observo</h5>
            <p className="text-[11px] md:text-xs text-slate-300 leading-relaxed">
              {report.analysis.loQueObservo}
            </p>
          </div>
          <div className="rounded-3xl border border-amber-500/10 bg-amber-500/5 p-5 flex flex-col gap-2">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              ⚠️ Punto Ciego
            </h5>
            <p className="text-[11px] md:text-xs text-amber-100/90 leading-relaxed bg-amber-950/20 rounded-xl p-3 border border-amber-500/10 italic">
              &ldquo;{report.analysis.puntoCiego}&rdquo;
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-emerald-950/10 via-slate-900/40 to-teal-950/10 p-5 shadow-lg flex flex-col gap-3 border-l-4 border-l-emerald-500">
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              🌱 Plan de Acción Recomendado
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Pasos sugeridos para integrar y potenciar tus energías</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-1">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Acción Focalizada</span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {report.recommendations.accionFocalizada}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide">Pregunta para Reflexionar</span>
              <p className="text-[11px] text-slate-300 leading-relaxed italic">
                &ldquo;{report.recommendations.preguntaReflexion}&rdquo;
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide">Semilla para Meditar</span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {report.recommendations.semilla}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-1.5 shadow-lg shadow-cyan-500/20">
              <Image
                src={`${BASE_PATH}/JarBees_logo.png`}
                alt="JarBees"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-100">JarBees</h1>
              <p className="text-xs text-slate-400">Asistente conversacional</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/reader")}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/20 hover:border-cyan-500/50 shadow-sm"
              title="Abrir Lector de Audiolibros"
            >
              <span>🎧</span>
              <span>Lector</span>
            </button>

            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20"
                title="Detener lectura"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                Detener lectura
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {balanceLoadingStatus ? (
          <div className="flex h-full flex-col items-center justify-center px-4 py-8">
            <div className="max-w-md text-center flex flex-col items-center gap-4">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent shadow-lg shadow-cyan-500/20" />
              <h3 className="text-lg font-semibold text-slate-100 animate-pulse">Generando Informe...</h3>
              <p className="text-xs text-slate-400 leading-relaxed italic">
                {balanceLoadingStatus}
              </p>
            </div>
          </div>
        ) : balanceReport ? (
          renderBalanceReportDashboard(balanceReport)
        ) : isBalanceActive ? (
          renderQuestionnaire()
        ) : (
          <>
            {/* Proactivity Banner */}
            {showBalancePrompt && renderProactivityPrompt()}

            {messages.length === 0 && !isTyping && (
              <div className="flex h-full items-center justify-center px-4 py-16">
                <div className="max-w-md text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-4 shadow-lg shadow-cyan-500/20">
                    <Image
                      src={`${BASE_PATH}/JarBees_logo.png`}
                      alt="JarBees"
                      width={64}
                      height={64}
                      className="object-contain"
                    />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-100">JarBees está listo</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Iniciá una conversación por voz o texto
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Escribí <code className="text-cyan-400">/balance</code> para iniciar tu cuestionario de estado energético.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessageCompact
                key={msg.id}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
                responseTime={msg.responseTime}
                isError={msg.isError}
              />
            ))}

            {isTyping && (
              <ChatMessageCompact
                role="assistant"
                content="Escribiendo..."
              />
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      {!isBalanceActive && !balanceReport && !balanceLoadingStatus && (
        <ChatInputSimple
          value={inputValue}
          onChange={(value) => {
            if (value.length > MAX_MESSAGE_LENGTH) {
              setInputError(`Mensaje máximo: ${MAX_MESSAGE_LENGTH} caracteres.`);
              setInputValue(value.slice(0, MAX_MESSAGE_LENGTH));
            } else {
              setInputError(null);
              setInputValue(value);
            }
          }}
          onSubmit={handleSubmit}
          onVoiceToggle={toggleVoiceInput}
          isListening={isListening}
          isTyping={isTyping}
          maxLength={MAX_MESSAGE_LENGTH}
          errorMessage={inputError ?? undefined}
          attachedFile={attachedFile}
          onFileAttach={setAttachedFile}
          suggestions={librarySuggestions}
        />
      )}
    </div>
  );
}
