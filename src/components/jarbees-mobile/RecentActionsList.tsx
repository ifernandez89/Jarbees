// src/components/jarbees-mobile/RecentActionsList.tsx
"use client";

import React from "react";
import { RecentAction } from "@/lib/jarbees-mobile/jarbeesMobile.types";
import {
  Camera,
  Settings,
  Smartphone,
  Wifi,
  Bluetooth,
  Volume1,
  Volume2,
  VolumeX,
  Vibrate,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Music,
  Headphones,
  BatteryCharging,
  Clock,
  Sparkles,
  Moon,
  Sun,
  Share2,
  CheckCircle2,
  Info,
  Calculator,
  Timer,
  MapPin,
  Globe,
} from "lucide-react";

interface RecentActionsListProps {
  actions: RecentAction[];
  onActionClick?: (action: RecentAction) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Camera,
  Settings,
  Smartphone,
  Wifi,
  Bluetooth,
  Volume1,
  Volume2,
  VolumeX,
  Vibrate,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Music,
  Headphones,
  BatteryCharging,
  Clock,
  Sparkles,
  Moon,
  Sun,
  Share2,
  Info,
  Calculator,
  Timer,
  MapPin,
  Globe,
};

export const RecentActionsList: React.FC<RecentActionsListProps> = ({
  actions,
  onActionClick,
}) => {
  if (!actions || actions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 text-center backdrop-blur-sm">
        <p className="text-xs font-medium text-slate-500">
          No hay acciones recientes. Hablá o escribí un comando para comenzar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Últimas Acciones
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">
          {actions.length} {actions.length === 1 ? "registro" : "registros"}
        </span>
      </div>

      <div className="space-y-2">
        {actions.map((act) => {
          const IconComp = ICON_MAP[act.iconName || ""] || CheckCircle2;
          const domainColor =
            act.intent.domain === "device"
              ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
              : act.intent.domain === "audio" || act.intent.domain === "media"
              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
              : act.intent.domain === "calculator"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : act.intent.domain === "timer"
              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
              : act.intent.domain === "context" || act.intent.domain === "location"
              ? "bg-teal-500/10 text-teal-400 border-teal-500/30"
              : act.intent.domain === "capabilities"
              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
              : act.intent.domain === "handoff"
              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
              : "bg-slate-500/10 text-slate-400 border-slate-500/30";

          return (
            <div
              key={act.id}
              onClick={() => onActionClick && onActionClick(act)}
              className="flex flex-col rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 backdrop-blur-md transition-all hover:border-cyan-500/30 hover:bg-slate-850/80 cursor-pointer group active:scale-[0.99] space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${domainColor}`}>
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {act.resultMessage}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate italic">
                      &ldquo;{act.userCommand}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 ml-2">
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${domainColor}`}>
                    {act.intent.domain}
                  </span>
                  <span className="text-[9px] text-slate-500 mt-1 font-mono">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              </div>

              {/* CARD DE REPORTE DE ESTADO DEL DISPOSITIVO */}
              {act.cardType === "status_report" && act.cardData && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 font-mono text-[11px] text-slate-300 grid grid-cols-2 gap-2 mt-1">
                  <div>🔋 Batería: <span className="text-emerald-400 font-bold">{String(act.cardData.battery)}%</span></div>
                  <div>⚡ Cargando: <span className="text-amber-400 font-bold">{act.cardData.charging ? "Sí" : "No"}</span></div>
                  <div>🔊 Volumen: <span className="text-cyan-400 font-bold">{String(act.cardData.volume)}%</span></div>
                  <div>🎧 Auriculares: <span className="text-blue-400 font-bold">{act.cardData.headphones ? "Conectados" : "No"}</span></div>
                  <div>🎵 Música: <span className="text-purple-400 font-bold">{act.cardData.music === "playing" ? "Reproduciendo" : "Pausada"}</span></div>
                  <div>📶 Red: <span className="text-cyan-300 font-bold">{String(act.cardData.network)}</span></div>
                  <div>📱 Pantalla: <span className="text-slate-200 font-bold">{String(act.cardData.screen)}</span></div>
                  <div>🕐 Hora: <span className="text-slate-300 font-bold">{String(act.cardData.time)}</span></div>
                </div>
              )}

              {/* CARD DE CÁLCULO */}
              {act.cardType === "calculation" && act.cardData && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 flex items-center justify-between mt-1">
                  <div className="font-mono text-xs text-slate-400">
                    {String(act.cardData.expression || "")}
                  </div>
                  <div className="font-mono text-base font-bold text-emerald-400">
                    = {String(act.cardData.result || "")}
                  </div>
                </div>
              )}

              {/* CARD DE CAPACIDADES */}
              {act.cardType === "capabilities" && act.cardData && Array.isArray(act.cardData.capabilities) && (
                <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3 text-[11px] text-slate-300 space-y-1.5 mt-1">
                  <p className="font-bold text-cyan-300">Capacidades en el teléfono:</p>
                  <ul className="space-y-1 list-disc list-inside text-slate-400">
                    {(act.cardData.capabilities as string[]).map((cap, idx) => (
                      <li key={idx}>{cap}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
