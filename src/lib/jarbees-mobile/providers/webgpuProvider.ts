// src/lib/jarbees-mobile/providers/webgpuProvider.ts
import { IInterpreterProvider, InterpreterResult, DeviceContext } from "../jarbeesMobile.types";
import { SYSTEM_PROMPT, extractJsonBlock, sanitizeAndNormalizeIntent } from "../qwenInterpreter";
import { RuleFallbackProvider } from "./fallbackProvider";

interface ModelProgressEvent {
  status?: string;
  progress?: number;
  file?: string;
}

export class WebGpuLocalProvider implements IInterpreterProvider {
  id = "webgpu";
  name = "Qwen2.5-0.5B ONNX (WebGPU/Wasm In-Browser)";

  private generator: ((messages: unknown[], options: Record<string, unknown>) => Promise<Array<{ generated_text?: unknown }>>) | null = null;
  private isLoading = false;
  private loadProgress = 0;
  private statusText = "No cargado";
  private fallback = new RuleFallbackProvider();

  getStatus(): { isLoaded: boolean; isLoading: boolean; progress: number; statusText: string } {
    return {
      isLoaded: Boolean(this.generator),
      isLoading: this.isLoading,
      progress: this.loadProgress,
      statusText: this.statusText,
    };
  }

  async loadModel(onProgress?: (progress: number, text: string) => void): Promise<void> {
    if (this.generator || this.isLoading) return;

    this.isLoading = true;
    this.statusText = "Inicializando Transformers.js...";
    if (onProgress) onProgress(5, this.statusText);

    try {
      // Importación dinámica para evitar problemas en SSR / Next.js server build
      const { pipeline, env } = await import("@huggingface/transformers");

      // Configuración para el navegador
      if (env) {
        env.allowLocalModels = false;
      }

      this.statusText = "Descargando Qwen2.5-0.5B-Instruct (q4 ONNX)...";
      if (onProgress) onProgress(15, this.statusText);

      // Intentar WebGPU primero, con fallback automático a wasm
      let deviceType: "webgpu" | "wasm" = "webgpu";
      if (typeof navigator !== "undefined" && !("gpu" in navigator)) {
        deviceType = "wasm";
        this.statusText = "WebGPU no disponible, usando WebAssembly CPU...";
      }

      const pipe = await pipeline(
        "text-generation",
        "onnx-community/Qwen2.5-0.5B-Instruct",
        {
          dtype: "q4",
          device: deviceType,
          progress_callback: (p: ModelProgressEvent) => {
            if (p.status === "progress" && typeof p.progress === "number") {
              const pct = Math.round(p.progress);
              this.loadProgress = pct;
              this.statusText = `Descargando modelo: ${pct}%`;
              if (onProgress) onProgress(pct, this.statusText);
            } else if (p.status === "done") {
              this.statusText = "Modelo cargado en memoria.";
              if (onProgress) onProgress(100, this.statusText);
            }
          },
        }
      );

      this.generator = pipe as unknown as ((messages: unknown[], options: Record<string, unknown>) => Promise<Array<{ generated_text?: unknown }>>);
      this.isLoading = false;
      this.statusText = "Modelo listo para inferencia";
      if (onProgress) onProgress(100, this.statusText);
    } catch (err: unknown) {
      this.isLoading = false;
      const errorMsg = err instanceof Error ? err.message : "Error al cargar modelo WebGPU";
      this.statusText = `Fallo de carga (${errorMsg}). Usando fallback.`;
      console.warn("Fallo al inicializar WebGPU pipeline:", errorMsg);
      if (onProgress) onProgress(0, this.statusText);
    }
  }

  async interpret(command: string, context: DeviceContext): Promise<InterpreterResult> {
    const startTime = Date.now();

    // Si aún no está cargado el pipeline ONNX en memoria, lo inicializamos o usamos el motor offline
    if (!this.generator) {
      try {
        await this.loadModel();
      } catch {
        // Fallback inmediato
      }
    }

    if (!this.generator) {
      const fallbackRes = await this.fallback.interpret(command, context);
      return {
        ...fallbackRes,
        provider: `${this.name} (Fallback Engine)`,
      };
    }

    try {
      const userPrompt = context && Object.keys(context).length > 0
        ? `Comando: "${command}"\nContexto: ${JSON.stringify(context)}`
        : `Comando: "${command}"`;

      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ];

      const output = await this.generator(messages, {
        max_new_tokens: 120,
        temperature: 0.01,
        do_sample: false,
      });

      const latencyMs = Date.now() - startTime;
      const generatedText = output?.[0]?.generated_text || "";
      const lastMsg = Array.isArray(generatedText)
        ? (generatedText[generatedText.length - 1] as { content?: string })?.content || ""
        : typeof generatedText === "string"
        ? generatedText
        : JSON.stringify(generatedText);

      const parsedBlock = extractJsonBlock(lastMsg);
      const intent = sanitizeAndNormalizeIntent(parsedBlock, command);

      return {
        intent,
        rawText: lastMsg,
        latencyMs,
        provider: this.name,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : "Inference error";
      console.warn("WebGPU inference error, using fallback intent:", errorMsg);

      const fallbackRes = await this.fallback.interpret(command, context);
      return {
        ...fallbackRes,
        latencyMs,
        provider: `${this.name} (Inference Error Fallback)`,
      };
    }
  }
}
