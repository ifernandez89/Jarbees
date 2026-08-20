// src/lib/jarbees-mobile/deviceContext.ts
import { DeviceContext } from "./jarbeesMobile.types";

interface BatteryManagerPolyfill {
  level?: number;
  charging?: boolean;
  addEventListener(type: string, listener: () => void): void;
}

const DEFAULT_CONTEXT: DeviceContext = {
  battery: 84,
  charging: false,
  headphones: false,
  music: "stopped",
  volume: 70,
  screen: "on",
  network: "WiFi",
  bluetooth: true,
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

let currentContext: DeviceContext = { ...DEFAULT_CONTEXT };
const listeners = new Set<(ctx: DeviceContext) => void>();

export function getDeviceContext(): DeviceContext {
  return {
    ...currentContext,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

export function updateDeviceContext(updates: Partial<DeviceContext>): DeviceContext {
  currentContext = {
    ...currentContext,
    ...updates,
    time: updates.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  listeners.forEach((cb) => cb(currentContext));
  return currentContext;
}

export function subscribeDeviceContext(cb: (ctx: DeviceContext) => void): () => void {
  listeners.add(cb);
  cb(getDeviceContext());
  return () => listeners.delete(cb);
}

// Inicializar telemetría nativa del navegador si está disponible
export async function initBrowserTelemetry() {
  if (typeof window === "undefined") return;

  // 1. Red
  const updateNet = () => {
    updateDeviceContext({ network: navigator.onLine ? "WiFi" : "Offline" });
  };
  window.addEventListener("online", updateNet);
  window.addEventListener("offline", updateNet);
  updateNet();

  // 2. Battery API si está soportada
  if ("getBattery" in navigator) {
    try {
      const getBatteryFn = (navigator as unknown as { getBattery: () => Promise<BatteryManagerPolyfill> }).getBattery;
      const batteryManager = await getBatteryFn();
      const syncBattery = () => {
        updateDeviceContext({
          battery: Math.round((batteryManager.level ?? 0.8) * 100),
          charging: Boolean(batteryManager.charging),
        });
      };
      syncBattery();
      batteryManager.addEventListener("levelchange", syncBattery);
      batteryManager.addEventListener("chargingchange", syncBattery);
    } catch {
      // API de batería no soportada o bloqueada
    }
  }
}
