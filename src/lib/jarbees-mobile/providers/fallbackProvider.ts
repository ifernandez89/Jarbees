// src/lib/jarbees-mobile/providers/fallbackProvider.ts
import { IInterpreterProvider, InterpreterResult, DeviceContext, Intent } from "../jarbeesMobile.types";

export class RuleFallbackProvider implements IInterpreterProvider {
  id = "fallback";
  name = "Rule & Offline Fallback Engine";

  async interpret(command: string, context: DeviceContext): Promise<InterpreterResult> {
    const startTime = Date.now();
    const lower = command.toLowerCase().trim();
    let intent: Intent;

    // 1. CALCULATOR / MATEMÁTICAS
    if (
      lower.includes("calcul") ||
      lower.includes("cuánto es") ||
      lower.includes("cuanto es") ||
      lower.includes("cuánto me queda") ||
      lower.includes("cuanto me queda") ||
      lower.includes("descuento") ||
      lower.includes("%") ||
      lower.includes("por ") ||
      lower.includes("más ") ||
      lower.includes("menos ") ||
      /\d+\s*[\-+*/×÷%]\s*\d+/.test(lower)
    ) {
      let expr = command;
      // Extraer patrones comunes
      const pctMatch = lower.match(/(?:descuento|descuento de|descuento del)?\s*(\d+)\s*%\s*(?:de|del)?\s*(\d+)/i) ||
                       lower.match(/(\d+)\s*(?:menos|descontando)\s*(?:el)?\s*(\d+)\s*%/i);
      if (pctMatch) {
        if (lower.includes("menos") || lower.includes("descontando")) {
          expr = `${pctMatch[1]} - ${pctMatch[2]}%`;
        } else {
          expr = `${pctMatch[2]} - ${pctMatch[1]}%`;
        }
      } else {
        const mathExtract = lower
          .replace(/cuánto es|cuanto es|calculá cuánto es|calcula cuanto es|calculá|calcula|si tengo|y gasto|cuánto me queda|cuanto me queda|\?/gi, "")
          .replace(/por/g, "*")
          .replace(/dividido/g, "/")
          .replace(/más|mas/g, "+")
          .replace(/menos/g, "-")
          .trim();
        if (mathExtract) expr = mathExtract;
      }
      intent = { domain: "calculator", action: "calculate", expression: expr };
    }
    // 2. TEMPORIZADORES
    else if (lower.includes("temporizador") || lower.includes("alarma") || lower.includes("minuto")) {
      if (lower.includes("cancel") || lower.includes("apag")) {
        intent = { domain: "timer", action: "cancel_timer", label: "all" };
      } else if (lower.includes("qué") || lower.includes("cuáles") || lower.includes("listar")) {
        intent = { domain: "timer", action: "list_timers" };
      } else {
        const numMatch = lower.match(/(\d+)\s*(?:minuto|minutos|min|m)/);
        const mins = numMatch ? parseInt(numMatch[1], 10) : 1;
        intent = { domain: "timer", action: "create_timer", duration_minutes: mins };
      }
    }
    // 3. CAPABILITIES / DESCUBRIMIENTO
    else if (lower.includes("qué podés hacer") || lower.includes("que podes hacer") || lower.includes("ayuda") || lower.includes("capacidades")) {
      const mode = lower.includes("sin internet") || lower.includes("offline") ? "offline" : "all";
      intent = { domain: "capabilities", action: "discover_capabilities", mode };
    }
    // 4. ESTADO COMPLETO DEL TELÉFONO
    else if (lower.includes("cómo está mi teléfono") || lower.includes("como esta mi telefono") || lower.includes("estado del dispositivo") || lower.includes("estado del teléfono")) {
      intent = { domain: "context", action: "device_status" };
    }
    // 5. CONECTIVIDAD
    else if (lower.includes("wifi") || lower.includes("wi-fi")) {
      intent = { domain: "connectivity", action: "get_wifi_state" };
    } else if (lower.includes("bluetooth")) {
      intent = { domain: "connectivity", action: "get_bluetooth_state" };
    } else if (lower.includes("internet") || lower.includes("conexión")) {
      intent = { domain: "connectivity", action: "get_internet_state" };
    }
    // 6. UBICACIÓN
    else if (lower.includes("dónde estoy") || lower.includes("donde estoy") || lower.includes("ubicación") || lower.includes("gps")) {
      intent = { domain: "location", action: "get_location" };
    }
    // 7. APPS / CÁMARA / NAVEGADOR
    else if (lower.includes("cámara") || lower.includes("camara") || lower.includes("foto")) {
      intent = { domain: "device", action: "open_app", target: "camera" };
    } else if (lower.includes("calculadora")) {
      intent = { domain: "device", action: "open_app", target: "calculator" };
    } else if (lower.includes("navegador") || lower.includes("buscá") || lower.includes("busca")) {
      const searchMatch = lower.match(/(?:buscá|busca|buscar)\s+(.+?)(?:\s+en internet|\s+en google)?$/i);
      if (searchMatch && searchMatch[1]) {
        intent = { domain: "device", action: "search_browser", query: searchMatch[1].trim() };
      } else {
        intent = { domain: "device", action: "open_app", target: "browser" };
      }
    } else if (lower.includes("ajuste") || lower.includes("configuraci")) {
      intent = { domain: "device", action: "open_app", target: "settings" };
    }
    // 8. AUDIO & SONIDO
    else if (lower.includes("silencio") || lower.includes("silenciá") || lower.includes("silencia")) {
      intent = { domain: "audio", action: "set_mode", mode: "silent" };
    } else if (lower.includes("vibrar") || lower.includes("vibrador")) {
      intent = { domain: "audio", action: "set_mode", mode: "vibrate" };
    } else if (lower.includes("bajá") || lower.includes("baja") || lower.includes("bajalo")) {
      intent = { domain: "audio", action: "volume_down", amount: 20 };
    } else if (lower.includes("subí") || lower.includes("subi") || lower.includes("subilo")) {
      intent = { domain: "audio", action: "volume_up", amount: 20 };
    }
    // 9. MEDIA / MÚSICA
    else if (lower.includes("pausá") || lower.includes("pausa") || lower.includes("pará la música")) {
      intent = { domain: "media", action: "pause" };
    } else if (lower.includes("música") || lower.includes("musica") || lower.includes("play") || lower.includes("reproduc")) {
      intent = { domain: "media", action: "play", output: context.headphones ? "headphones" : "speaker" };
    } else if (lower.includes("siguiente") || lower.includes("pasá")) {
      intent = { domain: "media", action: "next" };
    } else if (lower.includes("anterior")) {
      intent = { domain: "media", action: "previous" };
    }
    // 10. CONSULTAS INDIVIDUALES DE CONTEXTO
    else if (lower.includes("auricular") || lower.includes("auriculares")) {
      intent = { domain: "context", action: "headphones_status", value: context.headphones };
    } else if (lower.includes("cargando") || lower.includes("cargador")) {
      intent = { domain: "context", action: "charging_status", value: context.charging };
    } else if (lower.includes("batería") || lower.includes("bateria")) {
      intent = { domain: "context", action: "battery_status", value: context.battery };
    } else if (lower.includes("hora")) {
      intent = { domain: "context", action: "time_status", value: context.time };
    }
    // 11. ESTADO DE JARBEES
    else if (lower.includes("despierto") || lower.includes("estas ahi") || lower.includes("estás ahí")) {
      intent = { domain: "jarbees", action: "status" };
    } else if (lower.includes("dormir") || lower.includes("apagate") || lower.includes("chau")) {
      intent = { domain: "jarbees", action: "sleep" };
    }
    // 12. HANDOFF A CORE
    else {
      intent = {
        domain: "handoff",
        action: "query",
        query: command,
        reason: "complex_query",
      };
    }

    await new Promise((r) => setTimeout(r, 60));
    const latencyMs = Date.now() - startTime;

    return {
      intent,
      rawText: JSON.stringify(intent, null, 2),
      latencyMs,
      provider: this.name,
    };
  }
}

