"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  getLibraryIndex,
  getReaderDocument,
  type LibraryIndexItem,
  type ReaderDocumentResponse
} from "../services/jarbees.api";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function ReaderPage() {
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryIndexItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeDoc, setActiveDoc] = useState<ReaderDocumentResponse | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [backendUrlInput, setBackendUrlInput] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("jarbees_backend_url");
      if (saved) setBackendUrlInput(saved);
    }
  }, []);

  const handleSaveBackendUrl = () => {
    if (typeof window !== "undefined") {
      if (backendUrlInput.trim()) {
        window.localStorage.setItem("jarbees_backend_url", backendUrlInput.trim().replace(/\/$/, ""));
      } else {
        window.localStorage.removeItem("jarbees_backend_url");
      }
    }
    setShowConfigModal(false);
    loadLibrary();
  };

  // Estados del reproductor de audio
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Refs para control de flujo secuencial continuo
  const blockIndexRef = useRef(0);
  const activeDocRef = useRef<ReaderDocumentResponse | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    blockIndexRef.current = currentBlockIndex;
  }, [currentBlockIndex]);

  useEffect(() => {
    activeDocRef.current = activeDoc;
  }, [activeDoc]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Cargar lista completa de libros desde el backend en /api/reader
  const loadLibrary = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const docs = await getLibraryIndex();
      setLibrary(docs);
    } catch (err) {
      console.warn("Error cargando biblioteca en /reader:", err);
      setErrorMessage("No se pudo conectar con la biblioteca del backend. Verificá que el backend esté corriendo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  // Filtrar biblioteca por búsqueda
  const filteredLibrary = library.filter((item) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = item.titulo ? item.titulo.toLowerCase().includes(q) : false;
    const authorMatch = item.autor ? item.autor.toLowerCase().includes(q) : false;
    return titleMatch || authorMatch;
  });

  // Manejar selección de un libro para escuchar
  const handleSelectBook = async (item: LibraryIndexItem) => {
    stopPlayback();
    // Desbloquear permisos de voz nativos del navegador móvil en el gesto directo del toque
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const dummy = new SpeechSynthesisUtterance("");
      dummy.volume = 0;
      window.speechSynthesis.speak(dummy);
    }

    setLoadingDoc(true);
    setErrorMessage(null);
    const docId = item.id !== undefined ? item.id : item.titulo;
    try {
      const data = await getReaderDocument(docId);
      setActiveDoc(data);
      setCurrentBlockIndex(0);
      blockIndexRef.current = 0;
      setProgress(0);
      setIsPlaying(true); // Iniciar reproducción automáticamente al seleccionar libro
    } catch (err) {
      console.error("Error al cargar documento:", err);
      setErrorMessage(`No se pudo cargar el texto del libro "${item.titulo}".`);
    } finally {
      setLoadingDoc(false);
    }
  };

  // Función para síntesis y emisión del bloque activo (oración por oración)
  const speakCurrentBlock = (index: number) => {
    const doc = activeDocRef.current;
    if (!doc || !doc.blocks || !doc.blocks[index]) return;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      isPlayingRef.current = true;
      window.speechSynthesis.cancel();

      const textToSpeak = doc.blocks[index];
      // Dividir el bloque en oraciones para que los sintetizadores de voz móviles no fallen por longitud excesiva
      const rawSentences = textToSpeak.match(/[^.!?]+[.!?\s]+/g) || [textToSpeak];
      const sentences = rawSentences.map((s) => s.trim()).filter((s) => s.length > 0);
      let sentenceIndex = 0;

      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(
        (v) => v.lang.startsWith("es") || v.lang.includes("ES") || v.lang.includes("MX") || v.lang.includes("AR")
      );

      const speakNextSentence = () => {
        if (!isPlayingRef.current) return;

        if (sentenceIndex >= sentences.length) {
          // Bloque completado
          const nextIndex = blockIndexRef.current + 1;
          const currentDoc = activeDocRef.current;
          if (currentDoc && nextIndex < currentDoc.blocks.length) {
            blockIndexRef.current = nextIndex;
            setCurrentBlockIndex(nextIndex);
          } else {
            setIsPlaying(false);
            isPlayingRef.current = false;
            setProgress(100);
          }
          return;
        }

        const sentenceText = sentences[sentenceIndex];
        const utterance = new SpeechSynthesisUtterance(sentenceText);
        utterance.lang = "es-ES";
        if (spanishVoice) {
          utterance.voice = spanishVoice;
        }
        utterance.rate = playbackSpeed;
        utteranceRef.current = utterance;

        utterance.onend = () => {
          if (!isPlayingRef.current) return;
          sentenceIndex++;
          speakNextSentence();
        };

        utterance.onerror = (e) => {
          console.warn("[Reader] Evento onerror en Web Speech API:", e);
          if (e.error !== "interrupted" && e.error !== "canceled") {
            sentenceIndex++;
            speakNextSentence();
          }
        };

        if (typeof window !== "undefined" && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        window.speechSynthesis.speak(utterance);
      };

      speakNextSentence();
    }
  };

  // Efecto al cambiar de bloque o estado de reproducción
  useEffect(() => {
    if (isPlaying && activeDoc && activeDoc.blocks && activeDoc.blocks.length > 0) {
      speakCurrentBlock(currentBlockIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentBlockIndex, playbackSpeed]);

  // Keep-alive en dispositivos móviles (Android / iOS)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        if (typeof window !== "undefined" && window.speechSynthesis.speaking && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Actualizar progreso %
  useEffect(() => {
    if (activeDoc && activeDoc.blocks && activeDoc.blocks.length > 0) {
      const pct = ((currentBlockIndex + 1) / activeDoc.blocks.length) * 100;
      setProgress(pct);
    }
  }, [currentBlockIndex, activeDoc]);

  const handlePlay = () => {
    if (!activeDoc) return;
    setIsPlaying(true);
    isPlayingRef.current = true;
    if (typeof window !== "undefined" && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    } else {
      speakCurrentBlock(currentBlockIndex);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (typeof window !== "undefined" && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  };

  const stopPlayback = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentBlockIndex(0);
    blockIndexRef.current = 0;
    setProgress(0);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 px-4 py-3 sticky top-0 z-50 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 p-1.5 shadow-md shadow-cyan-500/10">
              <Image
                src={`${BASE_PATH}/JarBees_logo.png`}
                alt="JarBees Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>🎧 JarBees Reader</span>
                <span className="rounded-md bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">
                  Audiobook AI
                </span>
              </h1>
              <p className="text-xs text-slate-400">Escuchá tus libros con lectura sintética inteligente</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 transition shadow-sm"
              title="Configurar URL del backend Ngrok"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Backend URL</span>
            </button>
            <button
              onClick={() => router.push("/preguntas/new")}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition shadow-sm"
            >
              <span>💬</span>
              <span>Volver al Chat</span>
            </button>
          </div>
        </div>
      </header>

      {/* Modal / Banner de Configuración de Backend */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>⚙️ Configurar URL del Backend</span>
            </h3>
            <p className="text-xs text-slate-400">
              Ingresá tu URL pública de Ngrok (ej: <code className="text-cyan-300">https://xxxx.ngrok-free.app</code>). Se guardará en tu navegador para conectar el celular con la biblioteca de tu casa.
            </p>
            <input
              type="text"
              placeholder="https://tu-tunnel.ngrok-free.app"
              value={backendUrlInput}
              onChange={(e) => setBackendUrlInput(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBackendUrl}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 transition"
              >
                Guardar y Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <main className="flex-1 mx-auto max-w-4xl w-full p-4 md:p-6 flex flex-col gap-6">
        {/* Banner de Error */}
        {errorMessage && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300 flex items-center justify-between gap-3">
            <span>⚠️ {errorMessage}</span>
            <button
              onClick={loadLibrary}
              className="underline font-bold text-red-200 shrink-0"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Reproductor de Audio Activo */}
        {activeDoc && (
          <section className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-slate-900/80 to-blue-950/30 p-5 md:p-6 shadow-2xl backdrop-blur-md flex flex-col gap-5 relative overflow-hidden animate-fade-in">
            <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 text-2xl shadow-inner border border-cyan-500/20">
                  📄
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">Audiolibro en reproducción</span>
                  <h2 className="text-lg md:text-xl font-bold text-slate-100">{activeDoc.title}</h2>
                  <p className="text-xs text-slate-400 font-medium">
                    {activeDoc.author} • {activeDoc.paginas} páginas • Total: {activeDoc.blocks.length} bloques
                  </p>
                </div>
              </div>

              {/* Indicador de estado */}
              <div className="flex items-center gap-2">
                {isPlaying ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs text-cyan-300 font-medium">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
                    </span>
                    Bloque {currentBlockIndex + 1} de {activeDoc.blocks.length}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs text-slate-400">
                    Pausado (Bloque {currentBlockIndex + 1} de {activeDoc.blocks.length})
                  </span>
                )}
              </div>
            </div>

            {/* Texto del bloque actual */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 min-h-[90px] flex items-center justify-center">
              <p className="text-sm text-slate-200 italic leading-relaxed text-center">
                &ldquo;{activeDoc.blocks[currentBlockIndex] || "Fin del documento"}&rdquo;
              </p>
            </div>

            {/* Barra de progreso interactiva */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                <span>Bloque {currentBlockIndex + 1} / {activeDoc.blocks.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(activeDoc.blocks.length - 1, 1)}
                value={currentBlockIndex}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  setCurrentBlockIndex(idx);
                  blockIndexRef.current = idx;
                  if (isPlaying) {
                    speakCurrentBlock(idx);
                  }
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-400"
              />
            </div>

            {/* Elemento nativo HTML <audio> */}
            <audio
              ref={audioRef}
              controls
              className="w-full hidden"
              src=""
            />

            {/* Controles de Reproducción */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3">
                {!isPlaying ? (
                  <button
                    onClick={handlePlay}
                    className="flex h-11 px-5 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition"
                  >
                    <span>▶</span>
                    <span className="text-sm">Escuchar</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="flex h-11 px-5 items-center justify-center gap-2 rounded-2xl bg-amber-500/20 border border-amber-500/40 font-bold text-amber-300 hover:bg-amber-500/30 transition"
                  >
                    <span>⏸</span>
                    <span className="text-sm">Pausar</span>
                  </button>
                )}

                <button
                  onClick={stopPlayback}
                  className="flex h-11 px-4 items-center justify-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-800 font-semibold text-slate-300 hover:bg-slate-700 transition"
                  title="Detener"
                >
                  <span>⏹</span>
                  <span className="text-xs">Stop</span>
                </button>

                {/* Botón Siguiente Bloque */}
                <button
                  onClick={() => {
                    if (activeDoc && currentBlockIndex < activeDoc.blocks.length - 1) {
                      const next = currentBlockIndex + 1;
                      setCurrentBlockIndex(next);
                      blockIndexRef.current = next;
                      if (isPlaying) speakCurrentBlock(next);
                    }
                  }}
                  disabled={!activeDoc || currentBlockIndex >= activeDoc.blocks.length - 1}
                  className="flex h-11 px-3 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition text-xs font-semibold"
                  title="Siguiente Bloque"
                >
                  ▶▶
                </button>
              </div>

              {/* Selector de Velocidad */}
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-medium px-2">Velocidad:</span>
                {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                      playbackSpeed === speed
                        ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Sección Biblioteca */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>📚 Biblioteca de Libros</span>
                <span className="text-xs font-normal text-slate-400">({filteredLibrary.length})</span>
              </h2>
              <p className="text-xs text-slate-400">Seleccioná un libro para iniciar la lectura por audio</p>
            </div>

            {/* Campo de Búsqueda */}
            <div className="relative min-w-[240px]">
              <input
                type="text"
                placeholder="🔎 Buscar por título o autor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Listado de Libros */}
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent shadow-lg shadow-cyan-500/20" />
                <p className="text-xs text-slate-400">Consultando biblioteca en el backend...</p>
              </div>
            </div>
          ) : filteredLibrary.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center flex flex-col items-center gap-3">
              <p className="text-sm text-slate-400">No se encontraron libros en la biblioteca.</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Si estás accediendo desde tu celular o GitHub Pages, configurá la URL de tu túnel de Ngrok para conectar con tu PC de casa.
              </p>
              <button
                onClick={() => setShowConfigModal(true)}
                className="mt-1 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 transition shadow-sm"
              >
                ⚙️ Configurar URL de Backend (Ngrok)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLibrary.map((item, index) => (
                <div
                  key={`book-${item.id || item.titulo || index}-${index}`}
                  className={`group rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between gap-3 shadow-md ${
                    activeDoc?.title === item.titulo
                      ? "border-cyan-500/50 bg-cyan-950/20 shadow-cyan-500/5"
                      : "border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 text-cyan-400 text-xl border border-slate-700 group-hover:border-cyan-500/30 transition">
                      📄
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className="text-sm font-semibold text-slate-100 truncate group-hover:text-cyan-300 transition">
                        {item.titulo}
                      </h3>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {item.autor || "Desconocido"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 font-medium uppercase">
                          {item.formato || "PDF"}
                        </span>
                        <span className="text-[10px] text-cyan-400 font-medium">
                          {item.paginas ? `${item.paginas} págs` : "PDF Completo"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectBook(item)}
                    disabled={loadingDoc && activeDoc?.title === item.titulo}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 border border-slate-700 py-2 text-xs font-semibold text-slate-200 transition group-hover:border-cyan-500/40 group-hover:bg-cyan-500/10 group-hover:text-cyan-300"
                  >
                    {loadingDoc && activeDoc?.title === item.titulo ? (
                      <span>Cargando libro completo...</span>
                    ) : (
                      <span>▶ Escuchar Libro Completo</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
