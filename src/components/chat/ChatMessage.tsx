"use client";
import Image from "next/image";
interface ChatMessageProps {
  messageId?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  responseTime?: number; // en milisegundos
  feedback?: "up" | "down";
  onFeedback?: (messageId: string, type: "up" | "down") => void;
  onRegenerate?: (messageId: string) => void;
}

export function ChatMessage({ messageId, role, content, timestamp, isTyping = false, responseTime, feedback, onFeedback, onRegenerate }: ChatMessageProps) {
  const isUser = role === "user";


  const formatRelativeTime = (date: Date) => {
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);

    if (diffMin < 1) return "ahora";
    if (diffMin < 60) {
      return new Intl.RelativeTimeFormat("es", { numeric: "auto" }).format(-diffMin, "minute");
    }

    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) {
      return new Intl.RelativeTimeFormat("es", { numeric: "auto" }).format(-diffHours, "hour");
    }

    return timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error("No se pudo copiar el mensaje", error);
    }
  };

  return (
    <div
      className={`group flex w-full gap-3 px-3 py-2 transition-all duration-200 hover:bg-slate-900/30 sm:px-4 sm:py-3 ${
        isUser ? "bg-transparent" : "bg-slate-900/40"
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          isUser
            ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white"
            : "bg-gradient-to-br from-emerald-500 to-green-600 text-white"
        }`}
      >
        {isUser ? (
          "Tú"
        ) : (
          <Image src="/JarBees_logo.png" alt="JarBees" width={20} height={20} className="object-contain" />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-100">
            {isUser ? "Tú" : "JarBees"}
          </span>
          <span className="text-[11px] text-slate-400">
            {formatRelativeTime(timestamp)}
          </span>
          {!isUser && responseTime && !isTyping && (
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-200">
              ⚡ {(responseTime / 1000).toFixed(2)}s
            </span>
          )}
        </div>

        <div
          className={`prose relative max-w-none rounded-2xl p-3 text-slate-100 shadow-sm ${
            isUser
              ? "bg-slate-800/90"
              : "border border-slate-700/60 bg-[#111827] text-slate-100"
          }`}
        >
          {!isUser && !isTyping && (
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
              <button type="button" onClick={handleCopy} className="rounded-md bg-slate-800/80 px-2 py-1 text-[11px] text-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-700">📋 Copiar</button>
              <button
                type="button"
                onClick={() => onRegenerate && messageId && onRegenerate(messageId)}
                className="rounded-md bg-slate-800/80 px-2 py-1 text-[11px] text-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-700"
              >🔄 Regenerar</button>
              <button
                type="button"
                onClick={() => onFeedback && messageId && onFeedback(messageId, "up")}
                className={`rounded-md px-2 py-1 text-[11px] transition ${feedback === "up" ? "bg-emerald-600 text-white" : "bg-slate-800/80 text-slate-200 hover:bg-slate-700"}`}
              >
                👍
              </button>
              <button
                type="button"
                onClick={() => onFeedback && messageId && onFeedback(messageId, "down")}
                className={`rounded-md px-2 py-1 text-[11px] transition ${feedback === "down" ? "bg-red-600 text-white" : "bg-slate-800/80 text-slate-200 hover:bg-slate-700"}`}
              >
                👎
              </button>
            </div>
          )}
          {isTyping ? (
            <div className="space-y-2 rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-3">
              <div className="flex items-center gap-2 text-[13px] text-cyan-200">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" />
                <span>JarBees está escribiendo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-16 animate-pulse rounded-full bg-slate-700" />
                <span className="h-2 w-24 animate-pulse rounded-full bg-slate-700" style={{ animationDelay: "120ms" }} />
                <span className="h-2 w-10 animate-pulse rounded-full bg-slate-700" style={{ animationDelay: "240ms" }} />
              </div>
              <div className="flex gap-1 pt-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-100">{content}</p>
          )}
        </div>
      </div>
    </div>
  );
}
