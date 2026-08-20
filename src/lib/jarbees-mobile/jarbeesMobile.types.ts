// src/lib/jarbees-mobile/jarbeesMobile.types.ts

export type AssistantDomain =
  | "device"
  | "audio"
  | "media"
  | "context"
  | "calculator"
  | "timer"
  | "connectivity"
  | "location"
  | "capabilities"
  | "jarbees"
  | "handoff"
  | "core";

export type AssistantState =
  | "idle"        // Dormido / Disponible
  | "listening"   // Escuchando voz (Web Speech / Mic)
  | "processing"  // Inferencia con Qwen 0.5B
  | "executing"   // Ejecutando acción / Feedback
  | "error";

export interface DeviceContext {
  battery: number;           // 0 - 100
  charging: boolean;
  headphones: boolean;
  music: "playing" | "paused" | "stopped";
  volume: number;            // 0 - 100
  screen: "on" | "off" | "locked";
  network: "WiFi" | "Cellular" | "Offline";
  bluetooth: boolean;
  time: string;              // "13:42"
  location?: { lat: number; lon: number; city?: string };
}

export interface ActiveTimer {
  id: string;
  label: string;
  durationSeconds: number;
  remainingSeconds: number;
  createdAt: number;
  isRunning: boolean;
}

export interface Intent {
  domain: AssistantDomain;
  action?: string;
  target?: string;
  amount?: number;
  mode?: string;
  state?: string | boolean;
  value?: string | number | boolean;
  expression?: string;
  duration_minutes?: number;
  duration_seconds?: number;
  timer_id?: string;
  label?: string;
  query?: string;
  reason?: string;
  [key: string]: unknown;
}

export interface RecentAction {
  id: string;
  timestamp: number;
  userCommand: string;
  intent: Intent;
  resultMessage: string;
  success: boolean;
  iconName?: string;
  cardType?: "status_report" | "calculation" | "timer" | "capabilities" | "location" | "camera" | "core_response";
  cardData?: Record<string, unknown>;
}

export interface DiagnosticsInfo {
  providerId: "server" | "webgpu" | "fallback" | "core";
  modelName: string;
  status: "idle" | "inferring" | "ready" | "error";
  latencyMs: number;
  lastRawResponse?: string;
  lastIntent?: Intent | null;
  confidence?: number;
  contextSnapshot?: DeviceContext;
  error?: string;
}

export interface InterpreterResult {
  intent: Intent;
  rawText: string;
  latencyMs: number;
  provider: string;
}

export interface IInterpreterProvider {
  id: string;
  name: string;
  interpret(command: string, context: DeviceContext): Promise<InterpreterResult>;
}

// ----------------------------------------------------
// MOBILE GATEWAY PROTOCOL (Mobile <-> Core)
// ----------------------------------------------------
export interface MobileCommandRequest {
  requestId: string;
  deviceId: string;
  timestamp: string;
  intent: string;
  parameters: Record<string, unknown>;
  context: {
    source: "mobile" | "pwa" | "apk";
    network?: string;
    battery?: number;
    userCommand?: string;
    [key: string]: unknown;
  };
}

export interface MobileCommandResponse {
  requestId: string;
  success: boolean;
  intent: string;
  result: Record<string, unknown>;
  message: string;
  latencyMs?: number;
  timestamp?: string;
}

export interface CoreCapabilityItem {
  intent: string;
  description: string;
  category?: "system" | "media" | "tools" | "ai";
}

export interface CoreCapabilitiesResponse {
  success: boolean;
  version: string;
  environment: string;
  capabilities: CoreCapabilityItem[];
}

export interface CoreHealthStatus {
  online: boolean;
  latencyMs: number;
  url: string;
  timestamp?: number;
  version?: string;
  error?: string;
}
