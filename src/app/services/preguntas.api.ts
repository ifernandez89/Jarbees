// app/services/preguntas.api.ts

import { MAX_MESSAGE_LENGTH } from "@/lib/utils";

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const BASE_URL = BACKEND_URL ?? "http://localhost:4000";

// ─── Keys localStorage ────────────────────────────────────────────────────────
const JARBEES_SESSION_KEY        = "jarbees_session_id";
const LAST_ASSISTANT_MESSAGE_KEY = "jarbees_last_assistant_message";
const GEO_CACHE_KEY              = "jarbees_geo_coords";
const GEO_CACHE_TTL_MS           = 24 * 60 * 60 * 1000;

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type JarBeesResponse = {
  answer: string;
  sessionId: string | null;
  lastMessage?: string;
};

export type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

type GeoCoords = { latitude: number; longitude: number };
type GeoCache  = GeoCoords & { timestamp: number };

// ─── Mensajes de error ────────────────────────────────────────────────────────
export const SERVICE_ERRORS = {
  backend_unreachable: "⚠️ No pude conectarme al servidor. Verificá que el backend esté corriendo.",
  ollama_down:         "⚠️ El modelo de IA (Ollama) no está disponible en este momento. Intentá más tarde.",
  timeout:             "⚠️ La respuesta tardó demasiado. El servidor puede estar bajo carga, intentá de nuevo.",
  server_error:        "⚠️ Error interno del servidor. Si el problema persiste, reiniciá el backend.",
  network_error:       "⚠️ Sin conexión a internet. Verificá tu red e intentá de nuevo.",
  unknown:             "⚠️ Ocurrió un error inesperado. Intentá de nuevo.",
} as const;

export function classifyError(error: unknown): string {
  if (!(error instanceof Error)) return SERVICE_ERRORS.unknown;
  const msg = error.message.toLowerCase();

  if (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("econnrefused")
  ) {
    return typeof navigator !== "undefined" && !navigator.onLine
      ? SERVICE_ERRORS.network_error
      : SERVICE_ERRORS.backend_unreachable;
  }
  if (msg.includes("timeout") || msg.includes("aborted") || msg.includes("timed out"))
    return SERVICE_ERRORS.timeout;
  if (
    msg.includes("ollama") ||
    msg.includes("11434") ||
    msg.includes("503") ||
    msg.includes("service unavailable")
  )
    return SERVICE_ERRORS.ollama_down;
  if (
    msg.includes("500") || msg.includes("502") ||
    msg.includes("504") || msg.includes("error en la api")
  )
    return SERVICE_ERRORS.server_error;

  return `⚠️ ${error.message}`;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const getStoredSessionId = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(JARBEES_SESSION_KEY);
};

const storeSessionId = (sessionId: string | null) => {
  if (typeof window === "undefined" || !sessionId) return;
  window.localStorage.setItem(JARBEES_SESSION_KEY, sessionId);
};

const storeLastAssistantMessage = (message: string | null) => {
  if (typeof window === "undefined" || message === null) return;
  window.localStorage.setItem(LAST_ASSISTANT_MESSAGE_KEY, message);
};

export const getLastAssistantMessage = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_ASSISTANT_MESSAGE_KEY);
};

// ─── Geolocalización ─────────────────────────────────────────────────────────
const getCachedGeoCoords = (): GeoCoords | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as GeoCache;
    if (Date.now() - cache.timestamp > GEO_CACHE_TTL_MS) {
      window.localStorage.removeItem(GEO_CACHE_KEY);
      return null;
    }
    return { latitude: cache.latitude, longitude: cache.longitude };
  } catch { return null; }
};

const storeGeoCoords = (coords: GeoCoords) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      GEO_CACHE_KEY,
      JSON.stringify({ ...coords, timestamp: Date.now() })
    );
  } catch { /* ignore */ }
};

const getCurrentPosition = (): Promise<GeoCoords> =>
  new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocalización no soportada")); return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
    );
  });

const isWeatherQuery = (message: string) =>
  /\b(clima|tiempo|temperatura|lluvia|pron[oó]stico|meteorolog[ií]a|nublado|soleado|viento|tormenta|nevado|helada|humedad)\b/
    .test(message.toLowerCase());

const resolveGeoCoords = async (message: string): Promise<GeoCoords | null> => {
  if (!isWeatherQuery(message)) return null;
  const cached = getCachedGeoCoords();
  if (cached) return cached;
  try {
    const coords = await getCurrentPosition();
    storeGeoCoords(coords);
    return coords;
  } catch { return null; }
};

// ─── Headers helper ───────────────────────────────────────────────────────────
const buildHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
});

// ─── NIVEL 1: Obtener / crear sesión ─────────────────────────────────────────
/**
 * Llama a GET /api/jarbees/session?sessionId=xxx una sola vez al inicio.
 * Si el backend no tiene esa sesión, crea una nueva y la devuelve.
 * Guarda el sessionId resultante en localStorage.
 */
export async function initSession(): Promise<string | null> {
  try {
    const stored = getStoredSessionId();
    const url = stored
      ? `${BASE_URL}/api/jarbees/session?sessionId=${stored}`
      : `${BASE_URL}/api/jarbees/session`;

    const res = await fetch(url, { method: "GET", headers: buildHeaders() });
    if (!res.ok) return stored;

    const data = (await res.json()) as { sessionId: string };
    storeSessionId(data.sessionId);
    return data.sessionId;
  } catch {
    return getStoredSessionId();
  }
}

// ─── NIVEL 1: Recuperar historial al recargar ─────────────────────────────────
/**
 * Llama a GET /api/jarbees/history?sessionId=xxx para reconstruir el chat.
 */
export async function fetchHistory(sessionId: string): Promise<HistoryMessage[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/jarbees/history?sessionId=${sessionId}`,
      { method: "GET", headers: buildHeaders() }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { messages: HistoryMessage[] };
    return Array.isArray(data.messages) ? data.messages : [];
  } catch {
    return [];
  }
}

// ─── NIVEL 1/2/3: Enviar pregunta ─────────────────────────────────────────────
export async function hacerPregunta(
  message: string,
  provider: "ollama" | "openrouter" = "ollama",
  options?: { latitude?: number; longitude?: number; autoGeolocation?: boolean }
): Promise<JarBeesResponse> {
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Mensaje demasiado largo. Máximo ${MAX_MESSAGE_LENGTH} caracteres.`);
  }

  try {
    const sessionId = getStoredSessionId();

    let latitude: number | undefined;
    let longitude: number | undefined;

    if (options?.latitude !== undefined && options?.longitude !== undefined) {
      latitude = options.latitude;
      longitude = options.longitude;
    } else if (options?.autoGeolocation) {
      const coords = await resolveGeoCoords(message);
      if (coords) { latitude = coords.latitude; longitude = coords.longitude; }
    }

    const body: Record<string, unknown> = { message, sessionId, provider };
    if (latitude !== undefined && longitude !== undefined) {
      body.latitude = latitude;
      body.longitude = longitude;
    }

    const res = await fetch(`${BASE_URL}/api/jarbees/query`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Error en la API: ${errorBody}`);
    }

    const data = (await res.json()) as JarBeesResponse;
    if (data.sessionId) storeSessionId(data.sessionId);

    const lastMessage = data.lastMessage ?? data.answer;
    storeLastAssistantMessage(lastMessage);

    return { ...data, lastMessage };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Ocurrió un error desconocido.");
  }
}
