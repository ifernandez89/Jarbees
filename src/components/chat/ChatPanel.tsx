"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Virtuoso } from 'react-virtuoso';
import { ChatMessage } from "./ChatMessage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  responseTime?: number; // en milisegundos
  feedback?: "up" | "down";
}

interface ChatPanelProps {
  messages: Message[];
  isTyping: boolean;
  onClearChat: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onFeedback: (messageId: string, type: "up" | "down") => void;
  onRegenerate: (messageId: string) => void;
  workspaceName: string;
  documents: string[];
  memoryItems: string[];
  sources: string[];
}

export function ChatPanel({
  messages,
  isTyping,
  onClearChat,
  sidebarOpen,
  onToggleSidebar,
  onFeedback,
  onRegenerate,
  workspaceName,
  documents,
  memoryItems,
  sources,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [follow, setFollow] = useState(true);

  // Only scroll the empty-state anchor when there are no messages
  useEffect(() => {
    if (messages.length === 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  return (
    <div className="flex h-[calc(100vh-124px)] overflow-hidden">
      <aside className={`border-r border-slate-800 bg-slate-950/90 md:backdrop-blur-sm transition-all duration-200 ${sidebarOpen ? "w-72" : "w-16"}`}>
        <div className="flex h-full flex-col p-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-200 transition hover:border-cyan-500/40 hover:bg-slate-800"
            aria-label="Alternar sidebar"
          >
            ☰
          </button>
          {sidebarOpen ? (
            <div className="space-y-4 text-sm text-slate-200">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Workspace</p>
                    <p className="mt-2 text-slate-100">{workspaceName}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-1 text-[11px] text-slate-200 transition hover:border-cyan-500/40 hover:bg-slate-800"
                  >
                    Cambiar
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Documentos</p>
                <div className="mt-3 space-y-2">
                  {documents.slice(0, 3).map((doc) => (
                    <div key={doc} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-slate-200">
                      {doc}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Memoria</p>
                <p className="mt-2 text-slate-300">{memoryItems.length} notas activas</p>
                <div className="mt-3 flex flex-col gap-2">
                  {memoryItems.slice(0, 2).map((memory) => (
                    <div key={memory} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-slate-200">
                      {memory}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Fuentes usadas</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sources.map((source) => (
                    <span key={source} className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-[11px] text-slate-200">
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-col items-center gap-4 text-[11px] text-slate-400">
              <span>WS</span>
              <span>Doc</span>
              <span>Mem</span>
              <span>Src</span>
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/50 px-4 py-3 md:backdrop-blur-sm sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 sm:text-base">Conversaciones</h2>
          <p className="text-[11px] text-slate-400">Respuesta local • Tiempo visible</p>
        </div>
        <button
          onClick={onClearChat}
          className="text-sm text-slate-400 transition-colors hover:text-red-400"
        >
          Limpiar chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 px-3 py-3 pb-28 sm:px-6 sm:py-4 sm:pb-32" style={{ minHeight: 0 }}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center text-slate-300">
            <div className="mb-5 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-lg md:shadow-2xl shadow-slate-950/50">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-2xl shadow-lg shadow-cyan-500/20">
                <Image src="/JarBees_logo.png" alt="JarBees" width={40} height={40} className="object-contain" />
              </div>
              <p className="text-xl font-semibold text-slate-100">JarBees está listo</p>
              <p className="mt-2 max-w-md text-sm text-slate-400">Haz una pregunta, pide ayuda o explora un tema. El tiempo de respuesta aparece automáticamente debajo de cada mensaje.</p>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {['Astronomía', 'Matemática', 'Hora', 'Calendario'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-500/50 hover:bg-slate-800"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Virtuoso
            style={{ height: '100%' }}
            data={messages}
            initialTopMostItemIndex={messages.length - 1}
            overscan={100}
            atBottomStateChange={(atBottom) => setFollow(atBottom)}
            itemContent={(index, msg) => {
              const prev = index > 0 ? messages[index - 1] : null;
              const showDaySeparator = prev
                ? new Date(prev.timestamp).toDateString() !== new Date(msg.timestamp).toDateString()
                : true;

              return (
                <div key={msg.id}>
                  {showDaySeparator && (
                    <div className="my-3 flex items-center justify-center text-xs text-slate-500">
                      <span className="mx-3 inline-block h-px w-24 bg-slate-800" />
                      <span>{new Date(msg.timestamp).toLocaleDateString()}</span>
                      <span className="mx-3 inline-block h-px w-24 bg-slate-800" />
                    </div>
                  )}
                  <ChatMessage
                    messageId={msg.id}
                    role={msg.role}
                    content={msg.content}
                    timestamp={msg.timestamp}
                    responseTime={msg.responseTime}
                    onFeedback={onFeedback}
                    onRegenerate={onRegenerate}
                    feedback={msg.feedback}
                  />
                </div>
              );
            }}
            followOutput={follow ? (isTyping ? 'smooth' : true) : false}
            components={{ Footer: () => <div ref={messagesEndRef} /> }}
          />
        )}
      </div>
      </section>
    </div>
  );
}
