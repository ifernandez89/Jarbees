"use client";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { hacerPregunta } from "../../app/services/preguntas.api";
import { MAX_MESSAGE_LENGTH } from "@/lib/utils";

const LoadingSVG = () => (
  <svg
    width="50"
    height="50"
    viewBox="0 0 50 50"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="25"
      cy="25"
      r="20"
      stroke="#000"
      strokeWidth="3"
      fill="none"
      strokeDasharray="31.415, 31.415"
      strokeDashoffset="0"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 25 25"
        to="360 25 25"
        dur="1s"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
);

type HistorialItem = {
  pregunta: string;
  respuesta: string;
  tiempoRespuesta: number; // en segundos
};

type FormValues = {
  pregunta: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: ((event: Event) => void) | null;
};

type SpeechRecognitionResultLike = {
  0: {
    transcript: string;
  };
  length: number;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorLike = {
  error: string;
};

export default function ChatAgent() {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [tiempo, setTiempo] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceInputSupported, setVoiceInputSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const tiempoRef = useRef(0);
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldAutoSubmitRef = useRef(false);
  const voiceBaseRef = useRef("");
  const questionHistoryRef = useRef<string[]>([]);
  const historyBrowseIndexRef = useRef<number | null>(null);
  const draftBeforeHistoryRef = useRef("");

  type PreguntaFrecuente = {
    categoria: string;
    icono: string;
    preguntas: string[];
  };

  const preguntasFrecuentes: PreguntaFrecuente[] = [
    {
      categoria: "Astronomía",
      icono: "🌙",
      preguntas: [
        "¿En qué fase está la luna hoy?",
        "¿Cuándo es la próxima luna llena?",
        "¿A qué hora amanece hoy en Rosario?",
        "¿A qué hora anochece hoy en Buenos Aires?",
        "¿Cuándo es el próximo solsticio?",
        "¿Cuándo hay un eclipse solar o lunar próximo?",
        "¿Cómo está Saturno ahora, es visible desde Argentina?",
        "¿Cuándo se puede ver Júpiter esta semana?",
      ],
    },
    {
      categoria: "Calendarios",
      icono: "📅",
      preguntas: [
        "¿Qué fecha es hoy en el calendario Maya?",
        "¿Cuál es mi kin maya del 15/06/1990?",
        "¿Qué fecha es hoy en el calendario Hebreo?",
        "¿Qué festividad hebrea cae esta semana?",
      ],
    },
    {
      categoria: "Matemáticas",
      icono: "📐",
      preguntas: [
        "¿Cuánto es 25 * 4 + raíz de 16?",
        "¿Cuánto es la derivada de x^2 + 3x?",
        "¿Cuánto es la integral de sin(x)?",
        "Resolvé: (5! + 2^8) / 4",
      ],
    },
    {
      categoria: "Celulares",
      icono: "📱",
      preguntas: [
        "¿Qué modelos de celulares tienen disponibles en stock?",
        "¿Cuáles son los celulares más económicos y qué características incluyen?",
        "¿Qué modelos tienen mayor capacidad de RAM y almacenamiento?",
        "¿Cuáles son los celulares con mejor cámara según especificaciones?",
        "¿Qué opciones hay para comprar con financiamiento o cuotas?",
        "¿Ofrecen garantía en los celulares? ¿Cuánto tiempo dura?",
        "¿Tienen celulares reacondicionados o usados?",
        "¿Qué celulares son compatibles con redes 5G?",
        "¿Cuáles son los celulares más recomendados para gaming?",
        "¿Cuáles son los celulares con mayor duración de batería?",
      ],
    },
  ];

  const accionesRapidas = [
    { label: "🌙 Luna", pregunta: "¿En qué fase está la luna hoy?" },
    { label: "🌅 Amanecer", pregunta: "¿A qué hora amanece hoy en Buenos Aires?" },
    { label: "🪐 Saturno", pregunta: "¿Cómo está Saturno ahora, es visible?" },
    { label: "📅 Kin Maya", pregunta: "¿Qué fecha es hoy en el calendario Maya?" },
    { label: "✡️ Hebreo", pregunta: "¿Qué fecha es hoy en el calendario Hebreo?" },
    { label: "📐 Mate", pregunta: "¿Cuánto es la derivada de x^2 + 3x?" },
    { label: "🌍 Solsticio", pregunta: "¿Cuándo es el próximo solsticio?" },
    { label: "🕐 Hora", pregunta: "¿Qué hora local es ahora en Buenos Aires, Argentina?" },
  ];

  const iniciarContador = () => {
    setTiempo(0);
    tiempoRef.current = 0;
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    intervaloRef.current = setInterval(() => {
      tiempoRef.current += 1;
      setTiempo(tiempoRef.current);
    }, 1000);
  };

  const detenerContador = () => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  };

  useEffect(() => {
    setSpeechSupported(
      typeof window !== "undefined" && "speechSynthesis" in window,
    );

    const browserWindow = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };

    setVoiceInputSupported(
      Boolean(browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition),
    );

    const storedPreference = window.localStorage.getItem("chat-agent-audio");
    if (storedPreference !== null) {
      setAudioEnabled(storedPreference === "true");
    }

    return () => detenerContador(); // cleanup
  }, []);

  useEffect(() => {
    window.localStorage.setItem("chat-agent-audio", String(audioEnabled));
  }, [audioEnabled]);

  useEffect(() => {
    if (!audioEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [audioEnabled]);

  useEffect(() => {
    questionHistoryRef.current = historial.map((item) => item.pregunta);
  }, [historial]);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      recognition?.abort();
      detenerContador();
    };
  }, []);

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

  const reproducirAudio = (texto: string) => {
    if (!audioEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    getOrLoadVoice((voice) => {
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = "es-ES";
      // Parámetros estilo JarBees: voz grave, ritmo pausado y preciso
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

  const detenerAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const clearQuestionHistoryBrowse = () => {
    historyBrowseIndexRef.current = null;
    draftBeforeHistoryRef.current = "";
  };

  const updateQuestionHistory = (nextIndex: number) => {
    const questions = questionHistoryRef.current;
    const nextQuestion = questions[nextIndex];

    if (typeof nextQuestion !== "string") {
      return;
    }

    historyBrowseIndexRef.current = nextIndex;
    setValue("pregunta", nextQuestion, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const setQuickQuestion = (pregunta: string) => {
    setValue("pregunta", pregunta, {
      shouldDirty: true,
      shouldTouch: true,
    });
    clearQuestionHistoryBrowse();
  };

  const handleQuestionHistoryNavigation = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    const currentValue = getValues("pregunta") ?? "";
    const cursorAtStart =
      event.currentTarget.selectionStart === 0 &&
      event.currentTarget.selectionEnd === 0;

    if (event.key === "ArrowUp" && (currentValue.length === 0 || cursorAtStart)) {
      event.preventDefault();

      const questions = questionHistoryRef.current;
      if (!questions.length) {
        return;
      }

      if (historyBrowseIndexRef.current === null) {
        draftBeforeHistoryRef.current = currentValue;
        updateQuestionHistory(questions.length - 1);
        return;
      }

      if (historyBrowseIndexRef.current > 0) {
        updateQuestionHistory(historyBrowseIndexRef.current - 1);
      }

      return;
    }

    if (event.key === "ArrowDown" && historyBrowseIndexRef.current !== null) {
      event.preventDefault();

      const lastIndex = questionHistoryRef.current.length - 1;
      if (historyBrowseIndexRef.current < lastIndex) {
        updateQuestionHistory(historyBrowseIndexRef.current + 1);
        return;
      }

      historyBrowseIndexRef.current = null;
      setValue("pregunta", draftBeforeHistoryRef.current, {
        shouldDirty: true,
        shouldTouch: true,
      });
      draftBeforeHistoryRef.current = "";
    }
  };

  const iniciarEntradaPorVoz = () => {
    if (loading || !voiceInputSupported || isListening) {
      return;
    }

    const browserWindow = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };

    const SpeechRecognitionConstructor =
      browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setVoiceMessage("Este navegador no soporta dictado por voz.");
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = "es-ES";
    recognition.interimResults = true;
    // continuous: true evita que el navegador corte por silencio
    recognition.continuous = true;

    voiceBaseRef.current = getValues("pregunta")?.trim() ?? "";
    // Ya NO auto-enviamos: el usuario decide cuándo enviar
    shouldAutoSubmitRef.current = false;
    setVoiceMessage("🎙️ Escuchando... hablá todo el tiempo que necesites. Presioná «Consultar» para enviar.");

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      // Acumulamos todos los resultados (finales e intermedios)
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("")
        .trim();

      const nextValue = voiceBaseRef.current
        ? `${voiceBaseRef.current} ${transcript}`.trim()
        : transcript;

      setValue("pregunta", nextValue, {
        shouldDirty: true,
        shouldTouch: true,
      });
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      recognitionRef.current = null;
      setVoiceMessage(
        event.error === "not-allowed"
          ? "Necesitás permitir el micrófono para usar dictado por voz."
          : "No se pudo reconocer el audio. Intentá de nuevo.",
      );
    };

    recognition.onend = () => {
      // Si el navegador cortó por sí solo (sin que el usuario lo detenga),
      // reiniciamos automáticamente para mantener la grabación activa
      if (recognitionRef.current !== null) {
        try {
          recognition.start();
          return;
        } catch {
          // Si falla el reinicio, damos por terminada la grabación
        }
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
      setVoiceMessage("No se pudo iniciar el dictado por voz.");
    }
  };

  const detenerEntradaPorVoz = () => {
    // Guardamos referencia local y limpiamos el ref ANTES de llamar stop(),
    // así el handler onend sabe que fue el usuario quien detuvo (no corte del navegador)
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.stop();
    setIsListening(false);
    setVoiceMessage("Grabación detenida. Podés editar el texto y luego presionar «Consultar».");
  };

  const submitQuestion = handleSubmit(async (data) => {
    setLoading(true);
    iniciarContador();
    try {
      const { answer } = await hacerPregunta(data.pregunta, "ollama", { autoGeolocation: true });
      const tiempoFinal = tiempoRef.current;
      detenerContador();
      reproducirAudio(answer);
      setHistorial((prev) => [
        ...prev,
        {
          pregunta: data.pregunta,
          respuesta: answer,
          tiempoRespuesta: tiempoFinal,
        },
      ]);
    } catch (error) {
      const mensajeError =
        error instanceof Error
          ? error.message
          : "No se pudo obtener la respuesta del agente.";
      const tiempoFinal = tiempoRef.current;
      detenerContador();
      setHistorial((prev) => [
        ...prev,
        {
          pregunta: data.pregunta,
          respuesta: `⚠️ Error: ${mensajeError}`,
          tiempoRespuesta: tiempoFinal,
        },
      ]);
    } finally {
      setLoading(false);
      reset();
      setVoiceMessage("");
      clearQuestionHistoryBrowse();
    }
  });

  const formatTiempo = (segundos: number) => {
    const min = Math.floor(segundos / 60);
    const sec = segundos % 60;
    return `${min > 0 ? `${min}m ` : ""}${sec}s`;
  };

  return (
    <div className="flex h-screen bg-[#F9FAFB] text-[#1F2937]">
      <div className="w-1/2 p-4 border-r border-gray-300">
        <Card className="h-full shadow-md border border-[#D1D5DB] bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              ¿En qué puedo ayudarte?
            </CardTitle>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              <div>
                <p className="font-semibold text-gray-800">Modo de respuesta</p>
                <p className="text-gray-600">
                  {speechSupported
                    ? "Audio activado por defecto, con opción de dejarlo en solo texto."
                    : "Este navegador no soporta audio; las respuestas se mostrarán solo en texto."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {audioEnabled && speechSupported && (
                  <button
                    type="button"
                    onClick={detenerAudio}
                    className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    Detener audio
                  </button>
                )}
                <div className="flex rounded-full border border-gray-300 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setAudioEnabled(true)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    audioEnabled && speechSupported
                      ? "bg-[#2563EB] text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  disabled={!speechSupported}
                >
                  Audio
                </button>
                <button
                  type="button"
                  onClick={() => setAudioEnabled(false)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    !audioEnabled
                      ? "bg-[#2563EB] text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Solo texto
                </button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitQuestion} className="space-y-4">
              <div className="space-y-3">
                <textarea
                  placeholder="Escribí tu texto, pregunta o tema a resumir..."
                  {...register("pregunta", {
                    required: "La pregunta no puede estar vacía.",
                    maxLength: {
                      value: MAX_MESSAGE_LENGTH,
                      message: `Mensaje máximo: ${MAX_MESSAGE_LENGTH} caracteres.`,
                    },
                  })}
                  onKeyDown={handleQuestionHistoryNavigation}
                  className="min-h-[120px] text-sm border border-gray-300 rounded p-2 w-full resize-none bg-gray-100 text-black"
                  maxLength={MAX_MESSAGE_LENGTH}
                />
                {errors.pregunta?.message && (
                  <p className="text-sm text-red-500">{errors.pregunta.message}</p>
                )}
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Acciones rápidas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {accionesRapidas.map((accion) => (
                      <button
                        key={accion.label}
                        type="button"
                        onClick={() => setQuickQuestion(accion.pregunta)}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100"
                      >
                        {accion.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Astronomía, calendarios, matemáticas y más — sin clave de API.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 text-sm bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-2 px-4 rounded"
                  >
                    {loading ? "Consultando..." : "Consultar al Agente"}
                  </Button>
                  <button
                    type="button"
                    onClick={isListening ? detenerEntradaPorVoz : iniciarEntradaPorVoz}
                    disabled={loading || !voiceInputSupported}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      isListening
                        ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                        : "border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
                    } ${loading || !voiceInputSupported ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <span aria-hidden="true">{isListening ? "■" : "🎤"}</span>
                    {isListening ? "Detener y enviar" : "Hablar"}
                  </button>
                </div>
                <p className="text-xs text-gray-600">
                  {voiceInputSupported
                    ? isListening
                      ? "🎙️ Grabando... hablá todo el tiempo que necesites. Cuando termines, presioná «Detener» y luego «Consultar»."
                      : "Podés dictar tu pregunta con el micrófono. La grabación continuará hasta que la detengas vos."
                    : "Este navegador no soporta dictado por voz, pero podés escribir tu pregunta manualmente."}
                </p>
                {voiceMessage && (
                  <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    {voiceMessage}
                  </p>
                )}
              </div>
            </form>
            <div className="mt-4">
              <CardTitle className="text-lg font-bold">
                Preguntas Frecuentes
              </CardTitle>
              <div className="mt-2 space-y-3 max-h-72 overflow-y-auto pr-1">
                {preguntasFrecuentes.map((grupo) => (
                  <div key={grupo.categoria}>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1 px-1">
                      {grupo.icono} {grupo.categoria}
                    </p>
                    {grupo.preguntas.map((pregunta, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => reset({ pregunta })}
                        className="text-left w-full p-2 bg-[#E5E7EB] rounded hover:bg-[#D1D5DB] text-sm mb-1"
                      >
                        {pregunta}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="w-1/2 p-4 overflow-y-auto">
        <Card className="h-full shadow-md border border-[#D1D5DB] bg-[#F3F4F6]">
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">
                Historial de Interacción
              </CardTitle>
              {isSpeaking && (
                <button
                  type="button"
                  onClick={detenerAudio}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 animate-pulse"
                  aria-label="Detener audio de respuesta"
                >
                  <span aria-hidden="true">■</span>
                  Detener audio
                </button>
              )}
            </div>
            {loading && (
              <div className="text-sm text-gray-600">
                ⏱️ Tiempo transcurrido: {formatTiempo(tiempo)}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="p-4 bg-white rounded-lg border border-[#D1D5DB] shadow-sm">
                <LoadingSVG />
                <p className="mt-2 text-gray-600">Cargando respuesta...</p>
              </div>
            )}
            {!loading && historial.length === 0 && (
              <p className="text-gray-600">
                Las respuestas del agente aparecerán aquí.
              </p>
            )}
            {!loading &&
              historial.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-lg border border-gray-300"
                >
                  <p className="font-semibold mb-1">🧾 Pregunta:</p>
                  <p className="mb-2 text-gray-800">{item.pregunta}</p>
                  <p className="font-semibold mb-1">💡 Respuesta:</p>
                  <p className="text-gray-800">{item.respuesta}</p>
                  <p className="mt-2 text-sm text-gray-500">
                    ⏱️ Tiempo de respuesta: {formatTiempo(item.tiempoRespuesta)}
                  </p>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
