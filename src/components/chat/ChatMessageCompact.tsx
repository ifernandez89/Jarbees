"use client";
import { Clock, AlertTriangle } from "lucide-react";
import Image from "next/image";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface ChatMessageCompactProps {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  responseTime?: number;
  isError?: boolean;
}

export function ChatMessageCompact({ role, content, responseTime, isError }: ChatMessageCompactProps) {
  const isUser = role === "user";
  const isSystem = role === "system";

  // Mensaje de error del sistema
  if (isSystem || isError) {
    return (
      <div className="py-3">
        <div className="mx-auto flex w-full max-w-3xl px-4">
          <div className="flex w-full items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <p className="text-sm text-amber-300">{content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 py-4 ${isUser ? "" : "bg-slate-900/30"}`}>
      <div className="mx-auto flex w-full max-w-3xl gap-3 px-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white">
              Tú
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-1.5">
              <Image
                src={`${BASE_PATH}/JarBees_logo.png`}
                alt="JarBees"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="text-sm leading-relaxed text-slate-100">
            {content}
          </div>
          {!isUser && responseTime && (
            <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {(responseTime / 1000).toFixed(2)}s
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
