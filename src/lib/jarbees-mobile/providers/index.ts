// src/lib/jarbees-mobile/providers/index.ts
import { IInterpreterProvider } from "../jarbeesMobile.types";
import { ServerApiProvider } from "./serverProvider";
import { RuleFallbackProvider } from "./fallbackProvider";
import { WebGpuLocalProvider } from "./webgpuProvider";
import { CoreHandoffProvider } from "./coreHandoffProvider";

export * from "./serverProvider";
export * from "./fallbackProvider";
export * from "./webgpuProvider";
export * from "./coreHandoffProvider";

// Singletons para mantener estado en memoria del cliente
let webGpuSingleton: WebGpuLocalProvider | null = null;
let coreHandoffSingleton: CoreHandoffProvider | null = null;

export function getInterpreterProvider(type: "server" | "webgpu" | "fallback" | "core"): IInterpreterProvider {
  switch (type) {
    case "server":
      return new ServerApiProvider();
    case "webgpu":
      if (!webGpuSingleton) {
        webGpuSingleton = new WebGpuLocalProvider();
      }
      return webGpuSingleton;
    case "core":
      if (!coreHandoffSingleton) {
        coreHandoffSingleton = new CoreHandoffProvider();
      }
      return coreHandoffSingleton;
    case "fallback":
    default:
      return new RuleFallbackProvider();
  }
}
