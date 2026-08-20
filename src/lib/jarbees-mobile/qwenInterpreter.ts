// src/lib/jarbees-mobile/qwenInterpreter.ts
import { Intent, AssistantDomain } from "./jarbeesMobile.types";

export const SYSTEM_PROMPT = `Sos JarBees Edge Command Interpreter.
Tu única tarea es clasificar la entrada del usuario y su contexto en un JSON de intención válido.
SOLO responde el objeto JSON.

LISTA DE DOMINIOS Y ACCIONES PERMITIDOS:
1. "device":
   - "open_app": target ("camera", "calculator", "browser", "settings")
   - "search_browser": query ("texto de búsqueda")
2. "audio":
   - "volume_down" / "volume_up": amount (por defecto 20)
   - "set_volume": level (0-100)
   - "set_mode": mode ("silent", "vibrate", "normal")
   - "mute"
3. "media":
   - "play", "pause", "next", "previous"
4. "context":
   - "device_status" (resumen completo del estado del teléfono)
   - "battery_status" / "charging_status"
   - "headphones_status"
   - "music_status"
   - "time_status"
5. "calculator":
   - "calculate": expression (fórmula matemática limpia, e.g. "1837 * 47", "1837 - 21%", "500 - 137")
6. "timer":
   - "create_timer": duration_minutes (número de minutos) o duration_seconds, label (opcional)
   - "cancel_timer": label (opcional) o "all"
   - "list_timers"
7. "capabilities":
   - "discover_capabilities": mode ("all" o "offline")
8. "connectivity":
   - "get_wifi_state", "get_bluetooth_state", "get_internet_state"
9. "location":
   - "get_location"
10. "jarbees":
    - "wake", "sleep", "status"
11. "handoff":
    - Para consultas complejas de conocimiento, RAG o razonamiento que excedan el control del teléfono: query, reason.

EJEMPLOS OBLIGATORIOS:
Usuario: "Abrí la cámara"
JSON: {"domain": "device", "action": "open_app", "target": "camera"}

Usuario: "Necesito sacar una foto"
JSON: {"domain": "device", "action": "open_app", "target": "camera"}

Usuario: "Poneme la calculadora"
JSON: {"domain": "device", "action": "open_app", "target": "calculator"}

Usuario: "Buscá perros en Internet"
JSON: {"domain": "device", "action": "search_browser", "query": "perros"}

Usuario: "Subí el volumen"
JSON: {"domain": "audio", "action": "volume_up", "amount": 20}

Usuario: "Bajalo un poco"
JSON: {"domain": "audio", "action": "volume_down", "amount": 20}

Usuario: "Ponelo al 30%"
JSON: {"domain": "audio", "action": "set_volume", "amount": 30}

Usuario: "Silenciá el teléfono"
JSON: {"domain": "audio", "action": "set_mode", "mode": "silent"}

Usuario: "Pausá la música"
JSON: {"domain": "media", "action": "pause"}

Usuario: "JarBees, ¿cómo está mi teléfono?"
JSON: {"domain": "context", "action": "device_status"}

Usuario: "¿Cuánta batería tengo?"
JSON: {"domain": "context", "action": "battery_status"}

Usuario: "¿Estoy cargando?"
JSON: {"domain": "context", "action": "charging_status"}

Usuario: "¿Tengo auriculares conectados?"
JSON: {"domain": "context", "action": "headphones_status"}

Usuario: "¿Cuánto es 1837 por 47?"
JSON: {"domain": "calculator", "action": "calculate", "expression": "1837 * 47"}

Usuario: "Calculá cuánto me queda si descuento 21% de 1837"
JSON: {"domain": "calculator", "action": "calculate", "expression": "1837 - 21%"}

Usuario: "Si tengo 500 y gasto 137, ¿cuánto me queda?"
JSON: {"domain": "calculator", "action": "calculate", "expression": "500 - 137"}

Usuario: "Poneme un temporizador de 18 minutos"
JSON: {"domain": "timer", "action": "create_timer", "duration_minutes": 18}

Usuario: "Poneme una alarma dentro de 10 minutos"
JSON: {"domain": "timer", "action": "create_timer", "duration_minutes": 10}

Usuario: "¿Qué temporizadores tengo?"
JSON: {"domain": "timer", "action": "list_timers"}

Usuario: "Cancelá el temporizador del arroz"
JSON: {"domain": "timer", "action": "cancel_timer", "label": "arroz"}

Usuario: "¿Qué podés hacer?"
JSON: {"domain": "capabilities", "action": "discover_capabilities", "mode": "all"}

Usuario: "¿Qué puedo hacer sin Internet?"
JSON: {"domain": "capabilities", "action": "discover_capabilities", "mode": "offline"}

Usuario: "¿Estoy conectado a WiFi?"
JSON: {"domain": "connectivity", "action": "get_wifi_state"}

Usuario: "¿Está activado Bluetooth?"
JSON: {"domain": "connectivity", "action": "get_bluetooth_state"}

Usuario: "¿Dónde estoy?"
JSON: {"domain": "location", "action": "get_location"}

Usuario: "¿Qué expedientes tengo pendientes en el juzgado?"
JSON: {"domain": "handoff", "query": "¿Qué expedientes tengo pendientes en el juzgado?", "reason": "rag_query"}
`;

/**
 * Extrae de forma robusta un bloque JSON de cualquier texto con o sin markdown
 */
export function extractJsonBlock(text: string): Record<string, unknown> | null {
  if (!text || typeof text !== "string") return null;
  const clean = text.trim();

  try {
    return JSON.parse(clean);
  } catch {
    // ignorar error y continuar
  }

  const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // ignorar error y continuar
    }
  }

  const jsonRegex = /\{[\s\S]*\}/;
  const match = clean.match(jsonRegex);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // ignorar error y continuar
    }
  }

  return null;
}

/**
 * Sanitiza y normaliza un intent para evitar que fallas del LLM rompan la UI
 */
export function sanitizeAndNormalizeIntent(
  raw: Record<string, unknown> | null,
  userCommand: string
): Intent {
  if (!raw || typeof raw !== "object") {
    return {
      domain: "handoff",
      action: "query",
      query: userCommand,
      reason: "unparseable_output",
    };
  }

  let domain: AssistantDomain = "handoff";
  const rawDomain = String(raw.domain || "").toLowerCase().trim();

  const VALID_DOMAINS: AssistantDomain[] = [
    "device",
    "audio",
    "media",
    "context",
    "calculator",
    "timer",
    "connectivity",
    "location",
    "capabilities",
    "jarbees",
    "handoff",
  ];

  if (VALID_DOMAINS.includes(rawDomain as AssistantDomain)) {
    domain = rawDomain as AssistantDomain;
  } else {
    // Normalizaciones heurísticas
    if (rawDomain.includes("calc") || rawDomain.includes("math")) {
      domain = "calculator";
    } else if (rawDomain.includes("time") && (raw.duration_minutes || raw.action?.toString().includes("timer"))) {
      domain = "timer";
    } else if (rawDomain.includes("app") || rawDomain.includes("phone")) {
      domain = "device";
    } else if (rawDomain.includes("sound") || rawDomain.includes("vol")) {
      domain = "audio";
    } else if (rawDomain.includes("music") || rawDomain.includes("player")) {
      domain = "media";
    } else if (rawDomain.includes("status") || rawDomain.includes("battery")) {
      domain = "context";
    } else if (rawDomain.includes("wifi") || rawDomain.includes("net") || rawDomain.includes("bluetooth")) {
      domain = "connectivity";
    } else if (rawDomain.includes("gps") || rawDomain.includes("where")) {
      domain = "location";
    } else if (rawDomain.includes("help") || rawDomain.includes("capab")) {
      domain = "capabilities";
    } else {
      domain = "handoff";
    }
  }

  const normalized: Intent = {
    ...raw,
    domain,
    action: raw.action ? String(raw.action).toLowerCase().trim() : undefined,
  };

  // Normalizaciones específicas
  if (domain === "device") {
    if (normalized.action === "toggle_light" || normalized.action === "light") {
      normalized.action = "flashlight";
    }
  }

  if (domain === "calculator" && !normalized.expression) {
    normalized.expression = String(raw.query || raw.math || userCommand);
  }

  if (domain === "timer") {
    if (!normalized.action) {
      normalized.action = "create_timer";
    }
    if (!normalized.duration_minutes && raw.minutes) {
      normalized.duration_minutes = Number(raw.minutes);
    }
  }

  if (domain === "handoff" && !normalized.query) {
    normalized.query = userCommand;
  }

  return normalized;
}
