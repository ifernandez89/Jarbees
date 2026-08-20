// src/lib/jarbees-mobile/services/mobileGateway.api.ts
import {
  MobileCommandRequest,
  MobileCommandResponse,
  CoreCapabilitiesResponse,
  CoreHealthStatus,
  DeviceContext,
} from "../jarbeesMobile.types";

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const BASE_URL = BACKEND_URL ?? "http://localhost:4000";

/**
 * Genera headers seguros cumpliendo con la regla de Workspace (AGENTS.md):
 * Solo se adjunta 'ngrok-skip-browser-warning' cuando la URL contiene 'ngrok'.
 */
function getGatewayHeaders(targetUrl: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (targetUrl.toLowerCase().includes("ngrok")) {
    headers["ngrok-skip-browser-warning"] = "69420";
  }

  return headers;
}

export function getEffectiveCoreUrl(): string {
  return BASE_URL;
}

/**
 * Health check liviano hacia JarBees Core
 */
export async function checkCoreHealth(customUrl?: string): Promise<CoreHealthStatus> {
  const url = (customUrl || BASE_URL).replace(/\/+$/, "");
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${url}/api/mobile/v1/health`, {
      method: "GET",
      headers: getGatewayHeaders(url),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      // Intentar fallback al root health si el endpoint v1 aún no está montado
      const fallbackRes = await fetch(`${url}/api/health`, {
        method: "GET",
        headers: getGatewayHeaders(url),
      }).catch(() => null);

      if (!fallbackRes || !fallbackRes.ok) {
        throw new Error(`Core responded with status ${res.status}`);
      }
    }

    const latencyMs = Date.now() - startTime;
    return {
      online: true,
      latencyMs,
      url,
      timestamp: Date.now(),
      version: "1.0.0",
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : "No se pudo contactar al Core";
    return {
      online: false,
      latencyMs,
      url,
      timestamp: Date.now(),
      error: errorMsg,
    };
  }
}

/**
 * Envía un comando estructurado al MobileGateway de JarBees Core
 */
export async function sendMobileCommand(
  intent: string,
  parameters: Record<string, unknown> = {},
  deviceContext?: DeviceContext,
  userCommandText?: string
): Promise<MobileCommandResponse> {
  const url = BASE_URL.replace(/\/+$/, "");
  const startTime = Date.now();
  const requestId = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const payload: MobileCommandRequest = {
    requestId,
    deviceId: "jarbees-mobile-pwa",
    timestamp: new Date().toISOString(),
    intent: intent.toUpperCase().trim(),
    parameters,
    context: {
      source: "mobile",
      network: deviceContext?.network || "WiFi",
      battery: deviceContext?.battery,
      userCommand: userCommandText,
      headphones: deviceContext?.headphones,
      music: deviceContext?.music,
    },
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${url}/api/mobile/v1/command`, {
      method: "POST",
      headers: getGatewayHeaders(url),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Core MobileGateway error (${res.status}): ${errorText || res.statusText}`);
    }

    const data: MobileCommandResponse = await res.json();
    return {
      ...data,
      latencyMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : "Error al conectar con JarBees Core";

    return {
      requestId,
      success: false,
      intent,
      result: { error: errorMsg, fallback: true },
      message: `No se pudo comunicar con el Core de casa (${errorMsg}).`,
      latencyMs,
    };
  }
}

/**
 * Consulta las capacidades disponibles en JarBees Core
 */
export async function getCoreCapabilities(): Promise<CoreCapabilitiesResponse> {
  const url = BASE_URL.replace(/\/+$/, "");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${url}/api/mobile/v1/capabilities`, {
      method: "GET",
      headers: getGatewayHeaders(url),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Failed to fetch capabilities: ${res.status}`);
    }

    return await res.json();
  } catch {
    return {
      success: false,
      version: "1.0.0-offline",
      environment: "JarBees Core (Inaccesible)",
      capabilities: [
        { intent: "GET_TIME", description: "Hora del sistema (Offline)" },
        { intent: "GET_SYSTEM_STATUS", description: "Estado de la PC (Offline)" },
        { intent: "CALCULATE", description: "Evaluador matemático" },
        { intent: "OPEN_APP", description: "Apertura de aplicaciones" },
        { intent: "OPEN_BROWSER", description: "Navegador web" },
      ],
    };
  }
}
