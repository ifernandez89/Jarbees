// src/lib/jarbees-mobile/commandDispatcher.ts
import { Intent, RecentAction, ActiveTimer } from "./jarbeesMobile.types";
import { updateDeviceContext, getDeviceContext } from "./deviceContext";

export interface DispatchResult {
  message: string;
  success: boolean;
  iconName: string;
  cardType?: "status_report" | "calculation" | "timer" | "capabilities" | "location" | "camera";
  cardData?: Record<string, unknown>;
  handoffPayload?: Record<string, unknown>;
}

// Gestor de temporizadores activos en memoria
const activeTimers: ActiveTimer[] = [];
const timerListeners = new Set<(timers: ActiveTimer[]) => void>();

export function subscribeTimers(cb: (timers: ActiveTimer[]) => void): () => void {
  timerListeners.add(cb);
  cb([...activeTimers]);
  return () => timerListeners.delete(cb);
}

function notifyTimerListeners() {
  timerListeners.forEach((cb) => cb([...activeTimers]));
}

// Evaluador matemático determinista seguro
export function evaluateMathExpression(expr: string): { result: number | string; formatted: string; success: boolean } {
  try {
    let clean = expr.toLowerCase().replace(/,/g, ".").trim();

    // Caso porcentaje: "1837 - 21%" -> 1837 - (1837 * 0.21)
    const percentMinusMatch = clean.match(/^([\d.]+)\s*-\s*([\d.]+)\s*%/);
    if (percentMinusMatch) {
      const base = parseFloat(percentMinusMatch[1]);
      const pct = parseFloat(percentMinusMatch[2]);
      const discount = base * (pct / 100);
      const total = base - discount;
      return {
        result: Math.round(total * 100) / 100,
        formatted: `${base} - ${pct}% = ${Math.round(total * 100) / 100}`,
        success: true,
      };
    }

    const percentPlusMatch = clean.match(/^([\d.]+)\s*\+\s*([\d.]+)\s*%/);
    if (percentPlusMatch) {
      const base = parseFloat(percentPlusMatch[1]);
      const pct = parseFloat(percentPlusMatch[2]);
      const extra = base * (pct / 100);
      const total = base + extra;
      return {
        result: Math.round(total * 100) / 100,
        formatted: `${base} + ${pct}% = ${Math.round(total * 100) / 100}`,
        success: true,
      };
    }

    // Limpieza de caracteres válidos para expresión aritmética
    clean = clean.replace(/×/g, "*").replace(/÷/g, "/");
    clean = clean.replace(/[^0-9+\-*/().\s]/g, "");

    if (!clean.trim()) {
      return { result: 0, formatted: "Expresión inválida", success: false };
    }

    // Evaluación segura mediante Function contenida
    const val = Function(`'use strict'; return (${clean})`)();
    if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
      const rounded = Math.round(val * 1000) / 1000;
      return {
        result: rounded,
        formatted: `${expr} = ${rounded}`,
        success: true,
      };
    }
    return { result: 0, formatted: "Cálculo no computable", success: false };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error";
    return { result: 0, formatted: `Error de cálculo (${msg})`, success: false };
  }
}

export async function dispatchCommand(
  intent: Intent,
  userCommand: string,
  onHandoff?: (query: string, reason?: string) => Promise<string>
): Promise<DispatchResult> {
  const ctx = getDeviceContext();

  // Vibración háptica en mobile si está disponible
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(40);
    } catch {
      // Ignorar
    }
  }

  switch (intent.domain) {
    // 1. DISPOSITIVO & APPS
    case "device": {
      if (intent.action === "search_browser") {
        const query = intent.query || userCommand;
        if (typeof window !== "undefined") {
          window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
        }
        return {
          message: `Buscando en Internet: "${query}"`,
          success: true,
          iconName: "Globe",
        };
      }

      if (intent.action === "open_app") {
        const target = (intent.target || "app").toLowerCase();
        if (target.includes("camera") || target.includes("cámara") || target.includes("foto")) {
          return {
            message: "Abriendo cámara del dispositivo 📷",
            success: true,
            iconName: "Camera",
            cardType: "camera",
          };
        }
        if (target.includes("calc") || target.includes("calculadora")) {
          return {
            message: "Abriendo calculadora 🧮",
            success: true,
            iconName: "Calculator",
            cardType: "calculation",
            cardData: { expression: "0", result: "Lista para operar" },
          };
        }
        if (target.includes("browser") || target.includes("navegador") || target.includes("chrome")) {
          if (typeof window !== "undefined") {
            window.open("https://www.google.com", "_blank");
          }
          return {
            message: "Abriendo navegador web 🌐",
            success: true,
            iconName: "Globe",
          };
        }
        if (target.includes("setting") || target.includes("ajuste") || target.includes("configuraci")) {
          return {
            message: "Abriendo panel de configuración ⚙️",
            success: true,
            iconName: "Settings",
          };
        }
        return {
          message: `Abriendo aplicación: ${target}`,
          success: true,
          iconName: "Smartphone",
        };
      }

      return {
        message: `Acción de dispositivo ejecutada (${intent.action || "listo"})`,
        success: true,
        iconName: "Smartphone",
      };
    }

    // 2. AUDIO & VOLUMEN
    case "audio": {
      if (intent.action === "volume_down") {
        const delta = intent.amount || 20;
        const newVol = Math.max(0, ctx.volume - delta);
        updateDeviceContext({ volume: newVol });
        return { message: `Volumen reducido al ${newVol}% 🔉`, success: true, iconName: "Volume1" };
      }

      if (intent.action === "volume_up") {
        const delta = intent.amount || 20;
        const newVol = Math.min(100, ctx.volume + delta);
        updateDeviceContext({ volume: newVol });
        return { message: `Volumen aumentado al ${newVol}% 🔊`, success: true, iconName: "Volume2" };
      }

      if (intent.action === "set_volume") {
        const level = Math.min(100, Math.max(0, Number(intent.amount ?? intent.level ?? 50)));
        updateDeviceContext({ volume: level });
        return { message: `Volumen ajustado al ${level}% 🔊`, success: true, iconName: "Volume2" };
      }

      if (intent.action === "set_mode" || intent.action === "mute") {
        if (intent.mode === "silent" || intent.action === "mute") {
          updateDeviceContext({ volume: 0 });
          return { message: "Modo silencio activado 🔇", success: true, iconName: "VolumeX" };
        }
        if (intent.mode === "vibrate") {
          return { message: "Modo vibración activado 📳", success: true, iconName: "Vibrate" };
        }
        return { message: `Modo de sonido: ${intent.mode}`, success: true, iconName: "Volume2" };
      }

      return { message: "Ajustes de audio actualizados", success: true, iconName: "Volume2" };
    }

    // 3. REPRODUCCIÓN DE MEDIOS
    case "media": {
      if (intent.action === "play") {
        updateDeviceContext({ music: "playing" });
        const outputMsg = ctx.headphones ? "en auriculares 🎧" : "en altavoz 🔊";
        return { message: `Reproduciendo música ${outputMsg}`, success: true, iconName: "Play" };
      }
      if (intent.action === "pause" || intent.action === "stop") {
        updateDeviceContext({ music: "paused" });
        return { message: "Música pausada ⏸️", success: true, iconName: "Pause" };
      }
      if (intent.action === "next") {
        return { message: "Siguiente pista ⏭️", success: true, iconName: "SkipForward" };
      }
      if (intent.action === "previous") {
        return { message: "Pista anterior ⏮️", success: true, iconName: "SkipBack" };
      }
      return { message: "Control de música ejecutado", success: true, iconName: "Music" };
    }

    // 4. ESTADO DEL TELÉFONO & CONTEXTO
    case "context": {
      if (intent.action === "device_status") {
        return {
          message: "📱 Estado del dispositivo consultado",
          success: true,
          iconName: "Smartphone",
          cardType: "status_report",
          cardData: {
            battery: ctx.battery,
            charging: ctx.charging,
            volume: ctx.volume,
            headphones: ctx.headphones,
            music: ctx.music,
            network: ctx.network,
            screen: ctx.screen,
            time: ctx.time,
          },
        };
      }

      if (intent.action === "battery_status") {
        const chargingStr = ctx.charging ? " (cargando ⚡)" : "";
        return {
          message: `Batería al ${ctx.battery}%${chargingStr}`,
          success: true,
          iconName: "BatteryCharging",
        };
      }

      if (intent.action === "charging_status") {
        return {
          message: ctx.charging ? "El teléfono está cargando ⚡" : "El teléfono no está cargando",
          success: true,
          iconName: "BatteryCharging",
        };
      }

      if (intent.action === "headphones_status") {
        return {
          message: ctx.headphones ? "Auriculares conectados 🎧" : "No hay auriculares conectados",
          success: true,
          iconName: "Headphones",
        };
      }

      if (intent.action === "music_status") {
        return {
          message: ctx.music === "playing" ? "Música reproduciéndose 🎵" : "Música detenida",
          success: true,
          iconName: "Music",
        };
      }

      if (intent.action === "time_status") {
        return { message: `Son las ${ctx.time} 🕐`, success: true, iconName: "Clock" };
      }

      return {
        message: `Estado: Batería ${ctx.battery}% | Vol ${ctx.volume}% | ${ctx.network}`,
        success: true,
        iconName: "Info",
      };
    }

    // 5. CÁLCULOS DETERMINISTAS
    case "calculator": {
      const expr = intent.expression || userCommand;
      const calcResult = evaluateMathExpression(expr);
      return {
        message: `Resultado: ${calcResult.result} 🧮`,
        success: calcResult.success,
        iconName: "Calculator",
        cardType: "calculation",
        cardData: {
          expression: expr,
          result: calcResult.result,
          formatted: calcResult.formatted,
        },
      };
    }

    // 6. TEMPORIZADORES REALES
    case "timer": {
      if (intent.action === "create_timer" || !intent.action) {
        const mins = intent.duration_minutes || 1;
        const secs = mins * 60;
        const label = intent.label || `Temporizador ${mins}m`;
        const newTimer: ActiveTimer = {
          id: `timer-${Date.now()}`,
          label,
          durationSeconds: secs,
          remainingSeconds: secs,
          createdAt: Date.now(),
          isRunning: true,
        };
        activeTimers.push(newTimer);
        notifyTimerListeners();
        return {
          message: `Temporizador de ${mins} min creado ⏱️`,
          success: true,
          iconName: "Timer",
          cardType: "timer",
          cardData: { timer: newTimer },
        };
      }

      if (intent.action === "cancel_timer") {
        const count = activeTimers.length;
        activeTimers.length = 0;
        notifyTimerListeners();
        return {
          message: count > 0 ? `Se cancelaron ${count} temporizadores` : "No había temporizadores activos",
          success: true,
          iconName: "Timer",
        };
      }

      if (intent.action === "list_timers") {
        return {
          message: activeTimers.length > 0
            ? `Tenés ${activeTimers.length} temporizador(es) activo(s)`
            : "No tenés temporizadores activos",
          success: true,
          iconName: "Timer",
          cardType: "timer",
          cardData: { timers: [...activeTimers] },
        };
      }

      return { message: "Gestión de temporizadores realizada", success: true, iconName: "Timer" };
    }

    // 7. CAPABILITY DISCOVERY
    case "capabilities": {
      const isOffline = intent.mode === "offline";
      return {
        message: isOffline
          ? "Capacidades Locales (Sin Internet)"
          : "Capacidades de JarBees Mobile",
        success: true,
        iconName: "Sparkles",
        cardType: "capabilities",
        cardData: {
          isOffline,
          capabilities: [
            "📱 Aplicaciones (Cámara, Calculadora, Navegador, Ajustes)",
            "🔊 Control de Audio y Volumen (Subir, Bajar, Silencio, Música)",
            "⏱️ Temporizadores y Alarmas en tiempo real",
            "🧮 Cálculos Matemáticos Deterministas",
            "🔋 Estado del Dispositivo (Batería, Carga, Auriculares, Red)",
            "📶 Consulta de Conectividad (WiFi, Bluetooth, Internet)",
            "📍 Ubicación GPS actual",
            "🕐 Hora y Fecha del sistema",
          ],
          coreCapabilities: [
            "🧠 JarBees Core (Consultas avanzadas, RAG, Trámites y Conocimiento)",
          ],
        },
      };
    }

    // 8. CONECTIVIDAD
    case "connectivity": {
      if (intent.action === "get_wifi_state") {
        const isWifi = ctx.network === "WiFi";
        return {
          message: isWifi ? "Conectado a red Wi-Fi 📶" : "No conectado a Wi-Fi",
          success: true,
          iconName: "Wifi",
        };
      }
      if (intent.action === "get_bluetooth_state") {
        return {
          message: ctx.bluetooth ? "Bluetooth está activado" : "Bluetooth está desactivado",
          success: true,
          iconName: "Bluetooth",
        };
      }
      const isOnline = ctx.network !== "Offline";
      return {
        message: isOnline ? `Conexión a Internet activa (${ctx.network})` : "Dispositivo sin conexión a Internet",
        success: true,
        iconName: "Wifi",
      };
    }

    // 9. UBICACIÓN
    case "location": {
      if (typeof window !== "undefined" && "geolocation" in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          const lat = Math.round(pos.coords.latitude * 10000) / 10000;
          const lon = Math.round(pos.coords.longitude * 10000) / 10000;
          updateDeviceContext({ location: { lat, lon } });
          return {
            message: `📍 Ubicación: Lat ${lat}, Lon ${lon}`,
            success: true,
            iconName: "MapPin",
            cardType: "location",
            cardData: { lat, lon },
          };
        } catch {
          // Fallback a ubicación simulada si se deniega permiso
        }
      }
      return {
        message: "📍 Ubicación actual: Lat -34.6037, Lon -58.3816",
        success: true,
        iconName: "MapPin",
        cardType: "location",
        cardData: { lat: -34.6037, lon: -58.3816 },
      };
    }

    // 10. ESTADO DEL ASISTENTE JARBEES
    case "jarbees": {
      if (intent.action === "status" || !intent.action) {
        return { message: "🐝 JarBees está activo y disponible.", success: true, iconName: "Sparkles" };
      }
      if (intent.action === "sleep") {
        return { message: "JarBees entra en modo reposo.", success: true, iconName: "Moon" };
      }
      if (intent.action === "wake") {
        return { message: "¡Despierto! ¿Qué necesitás?", success: true, iconName: "Sun" };
      }
      return { message: "JarBees listo.", success: true, iconName: "Sparkles" };
    }

    // 11. HANDOFF A JARBEES CORE
    case "handoff":
    default: {
      const queryText = intent.query || userCommand;
      let coreResponse = `Consultando a JarBees Core: "${queryText}"`;
      if (onHandoff) {
        try {
          coreResponse = await onHandoff(queryText, intent.reason);
        } catch {
          coreResponse = `Handoff a Core: "${queryText}" enviado para procesamiento.`;
        }
      }
      return {
        message: coreResponse,
        success: true,
        iconName: "Share2",
        handoffPayload: { query: queryText, reason: intent.reason },
      };
    }
  }
}

export function createRecentAction(
  userCommand: string,
  intent: Intent,
  dispatchResult: DispatchResult
): RecentAction {
  return {
    id: `action-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    userCommand,
    intent,
    resultMessage: dispatchResult.message,
    success: dispatchResult.success,
    iconName: dispatchResult.iconName,
    cardType: dispatchResult.cardType,
    cardData: dispatchResult.cardData,
  };
}
