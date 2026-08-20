"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ChatHeroSection } from "./ChatHeroSection";
const ChatPanel = dynamic(() => import("./ChatPanel").then(mod => mod.ChatPanel), { ssr: false });
import { loadConversation, saveConversation } from "@/lib/db";
import { MAX_MESSAGE_LENGTH } from "@/lib/utils";
import { ChatInputBar } from "./ChatInputBar";
import { hacerPregunta, getLastAssistantMessage } from "../../app/services/preguntas.api";
import { getLibraryIndex, type LibraryIndexItem } from "../../app/services/jarbees.api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  responseTime?: number; // en milisegundos
  feedback?: "up" | "down"; // feedback del usuario
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

export default function ChatInterface() {
  const [view, setView] = useState<"hero" | "chat">("hero");
  const [messages, setMessages] = useState<Message[]>([]);
  const MAX_IN_MEMORY = 200; // keep recent messages in memory for low-end devices
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [librarySuggestions, setLibrarySuggestions] = useState<LibraryIndexItem[]>([]);

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
        console.warn("No se pudo cargar el índice de la biblioteca para autocompletado en ChatInterface:", error);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const workspaceName = "JarBees Workspace";
  const documents = [
    "Manual de voz",
    "Guía de prompts",
    "Resumen de entrenamiento",
  ];
  const memoryItems = [
    "Contexto de usuario activo",
    "Preferencias de estilo",
    "Última tarea guardada",
  ];
  const sources = ["Local", "Modelo", "Documentos"];

  // start with sidebar closed on small screens
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSidebarOpen(window.innerWidth >= 640);
    }
  }, []);

  // Check browser support
  useEffect(() => {
    const SpeechRecognitionAPI = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new (SpeechRecognitionAPI as unknown as new () => SpeechRecognitionLike)();
      recognitionRef.current.lang = "es-ES";
      // continuous: true evita cortes por silencio y errores "network"
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onstart = () => setIsListening(true);
      
      recognitionRef.current.onend = () => {
        // Si el navegador cortó por sí solo y el usuario no detuvo manualmente,
        // intentamos reiniciar automáticamente
        if (recognitionRef.current !== null && isListening) {
          try {
            recognitionRef.current.start();
            return;
          } catch {
            // Si falla el reinicio, dejamos que termine
          }
        }
        setIsListening(false);
      };

      recognitionRef.current.onresult = (event: SpeechRecognitionEventLike) => {
        // Tomar el último resultado disponible (más reciente)
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript;
        setInputValue(transcript);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEventLike) => {
        // Solo loguear errores críticos, ignorar "network" y "aborted"
        if (event.error !== "network" && event.error !== "aborted" && event.error !== "no-speech") {
          console.warn("Speech recognition error:", event.error);
        }
        // No forzar setIsListening(false) aquí — dejar que onend lo maneje
        // para permitir reintentos automáticos
      };
    }

    if ("speechSynthesis" in window) {
      setSpeechSupported(true);
    }
  }, [isListening]);

  // Load saved conversation from IndexedDB (key: 'default')
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await loadConversation('default');
        if (mounted && saved?.messages) {
          // Keep only the most recent messages in memory
          const msgs = Array.isArray(saved.messages) ? saved.messages : [];
          setMessages(msgs.slice(-MAX_IN_MEMORY));
          setView('chat');
        }
      } catch {
        // ignore
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Persist conversations to IndexedDB (debounced)
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

  // Helper to add a message while capping in-memory size
  const addMessage = (msg: Message) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      if (next.length > MAX_IN_MEMORY) return next.slice(-MAX_IN_MEMORY);
      return next;
    });
  };

  // Handle voice input
  const toggleVoiceInput = () => {
    if (isListening) {
      // Guardamos referencia local y limpiamos el ref ANTES de llamar stop()
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      recognition?.stop();
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

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Nombres de voces masculinas conocidas, en orden de preferencia
  const MALE_VOICE_NAMES = [
    "Microsoft Pablo",        // Windows es-ES
    "Microsoft Jorge",        // Windows es-MX / es-AR
    "Google español",         // Chrome Android/Desktop es-ES
    "Jorge",
    "Pablo",
    "Diego",
    "Carlos",
    "Ricardo",
    "Miguel",
    "Andrés",
    "Enrique",
  ];

  // Palabras que indican voz femenina (para descartar)
  const FEMALE_KEYWORDS = ["female", "femenina", "mujer", "woman", "laura", "helena",
    "mónica", "monica", "paulina", "luciana", "isabela", "rosa", "sabina", "lupe"];

  const selectMaleVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const esVoices = voices.filter((v) =>
      v.lang.startsWith("es") || v.lang.startsWith("ES"),
    );
    const pool = esVoices.length ? esVoices : voices;

    // 1. Buscar por nombre exacto conocido
    for (const name of MALE_VOICE_NAMES) {
      const match = pool.find((v) =>
        v.name.toLowerCase().includes(name.toLowerCase()),
      );
      if (match) return match;
    }

    // 2. Descartar voces femeninas y devolver la primera restante
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
    // Las voces pueden no estar cargadas aún en el primer render
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

  // Handle speech synthesis
  const speakText = (text: string) => {
    if (!speechSupported || !audioEnabled) return;

    // Cancel any currently speaking utterances
    window.speechSynthesis.cancel();

    getOrLoadVoice((voice) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      // Parámetros estilo JARVIS: voz grave, ritmo pausado y preciso
      utterance.rate = 0.92;   // ligeramente más lento que normal
      utterance.pitch = 0.75;  // más grave (0 = mínimo, 2 = máximo)
      utterance.volume = 1;

      if (voice) utterance.voice = voice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    });
  };

  // Handle message submission
  const handleSubmit = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    if (trimmedInput.length > MAX_MESSAGE_LENGTH) {
      setInputError(`Mensaje máximo: ${MAX_MESSAGE_LENGTH} caracteres.`);
      return;
    }

    setInputError(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmedInput,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInputValue("");
    setInputError(null);
    setIsTyping(true);
    const startTime = performance.now(); // Rastrear tiempo inicio

    try {
        const { answer } = await hacerPregunta(trimmedInput, "ollama", { autoGeolocation: true });
      const endTime = performance.now(); // Rastrear tiempo fin
      const responseTime = endTime - startTime; // Calcular tiempo total

      

      // Añadir mensaje asistente vacío para streaming visual
      const assistantId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        responseTime,
      };

      addMessage(assistantMessage);

      // Simular streaming token-level mostrando incrementalmente
      const tokens = answer.split(/(\s+)/); // conservar espacios
      let accumulated = "";
      const interval = 40; // ms por "token"
      tokens.forEach((tok, idx) => {
        setTimeout(() => {
          accumulated += tok;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
          );
          // al final del stream
          if (idx === tokens.length - 1) {
            setIsTyping(false);
            // Speak response if audio enabled
            if (audioEnabled && !isSpeaking) {
              speakText(answer);
            }
          }
        }, interval * idx);
      });
    } catch (error) {
      console.error("Error:", error);
      setIsTyping(false);
    }
  };

  const handleRepeatLast = () => {
    const lastMessage = getLastAssistantMessage();
    if (!lastMessage) {
      console.warn("No hay último mensaje guardado para repetir.");
      return;
    }

    const repeatMessage: Message = {
      id: `${Date.now()}-repeat`,
      role: "assistant",
      content: lastMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, repeatMessage]);
    if (audioEnabled && speechSupported) {
      speakText(lastMessage);
    }
  };

  const handleFeedback = (messageId: string, type: "up" | "down") => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        // Toggle: if same feedback clicked again, remove it
        if (m.feedback === type) {
          return { ...m, feedback: undefined } as Message;
        }
        return { ...m, feedback: type };
      })
    );
  };

  const handleRegenerate = async (messageId: string) => {
    if (isTyping) return;

    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const previousUserMessage = [...messages]
      .slice(0, messageIndex)
      .reverse()
      .find((m) => m.role === "user");

    const prompt = previousUserMessage?.content?.trim();
    if (!prompt) return;

    setIsTyping(true);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content: "", responseTime: undefined } : m
      )
    );

    const startTime = performance.now();

    try {
        const { answer } = await hacerPregunta(prompt, "ollama", { autoGeolocation: true });
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const tokens = answer.split(/(\s+)/);
      let accumulated = "";
      const interval = 40;

      tokens.forEach((tok, idx) => {
        setTimeout(() => {
          accumulated += tok;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, content: accumulated, responseTime } : m
            )
          );
          if (idx === tokens.length - 1) {
            setIsTyping(false);
            if (audioEnabled && !isSpeaking) {
              speakText(answer);
            }
          }
        }, interval * idx);
      });
    } catch (error) {
      console.error("Error al regenerar:", error);
      setIsTyping(false);
    }
  };

  // Handle action clicks
  const handleActionClick = (action: "image" | "write" | "search") => {
    // Implementar lógica específica por acción
    const messages: Message[] = [
      {
        id: Date.now().toString(),
        role: "assistant",
        content: `He seleccionado la acción: ${action}. ¿Qué te gustaría hacer exactamente?`,
        timestamp: new Date(),
      },
    ];
    setMessages((prev) => [...prev, ...messages]);
    setView("chat");
  };

  // Handle chat start
  const handleChatStart = () => {
    setView("chat");
  };

  // Handle clear chat
  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 px-4 py-3 md:backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
              <Image src="/JarBees_logo.png" alt="JarBees" width={24} height={24} className="object-contain" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-semibold text-slate-100 sm:text-lg">JarBees</h1>
              <p className="text-[11px] text-slate-400 sm:text-xs">Modelo disponible</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300 sm:inline-flex">🟢 Local</span>
            <button
              onClick={handleRepeatLast}
              className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-200 transition hover:border-cyan-500/40 hover:bg-slate-800"
              title="Repetir última respuesta"
            >
              🔁 Repetir
            </button>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`rounded-full p-2 transition-colors ${
                audioEnabled ? "text-cyan-400" : "text-slate-500"
              }`}
              title={audioEnabled ? "Desactivar audio" : "Activar audio"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6"
              >
                <path d="M13.5 4.06c0-1.336-1.098-2.414-2.414-2.414a2.414 2.414 0 00-2.414 2.414v1.383l-1.85 1.85a.75.75 0 001.06 1.06l1.85-1.85v1.383a2.414 2.414 0 002.414 2.414 2.414 2.414 0 002.414-2.414A2.414 2.414 0 0013.5 4.06z" />
                {audioEnabled && (
                  <path d="M15.332 10.5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5a.75.75 0 01.75-.75z" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {view === "hero" ? (
          <ChatHeroSection
            onActionClick={handleActionClick}
            onChatStart={handleChatStart}
          />
        ) : (
          <ChatPanel
            messages={messages}
            isTyping={isTyping}
            onClearChat={handleClearChat}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            onFeedback={handleFeedback}
            onRegenerate={handleRegenerate}
            workspaceName={workspaceName}
            documents={documents}
            memoryItems={memoryItems}
            sources={sources}
          />
        )}
      </main>

      {/* Input Bar (only in chat view) */}
      {view === "chat" && (
        <ChatInputBar
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
          onVoiceStart={toggleVoiceInput}
          onVoiceStop={toggleVoiceInput}
          isListening={isListening}
          audioEnabled={audioEnabled}
          onToggleAudio={() => setAudioEnabled(!audioEnabled)}
          isSpeaking={isSpeaking}
          onToggleSpeaking={() => setIsSpeaking(!isSpeaking)}
          onActionClick={handleActionClick}
          maxLength={MAX_MESSAGE_LENGTH}
          errorMessage={inputError ?? undefined}
          suggestions={librarySuggestions}
        />
      )}
    </div>
  );
}
