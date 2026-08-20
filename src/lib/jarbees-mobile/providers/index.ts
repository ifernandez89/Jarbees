// src/lib/jarbees-mobile/providers/index.ts
import { IInterpreterProvider } from "../jarbeesMobile.types";
import { ServerApiProvider } from "./serverProvider";
import { RuleFallbackProvider } from "./fallbackProvider";
import { WebGpuLocalProvider } from "./webgpuProvider";

export * from "./serverProvider";
export * from "./fallbackProvider";
export * from "./webgpuProvider";

// Singleton para mantener el modelo en memoria del navegador
let webGpuSingleton: WebGpuLocalProvider | null = null;

export function getInterpreterProvider(type: "server" | "webgpu" | "fallback"): IInterpreterProvider {
  switch (type) {
    case "server":
      return new ServerApiProvider();
    case "webgpu":
      if (!webGpuSingleton) {
        webGpuSingleton = new WebGpuLocalProvider();
      }
      return webGpuSingleton;
    case "fallback":
    default:
      return new RuleFallbackProvider();
  }
}
