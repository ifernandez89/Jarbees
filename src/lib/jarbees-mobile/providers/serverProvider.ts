// src/lib/jarbees-mobile/providers/serverProvider.ts
import { IInterpreterProvider, InterpreterResult, DeviceContext, Intent } from "../jarbeesMobile.types";
import { sanitizeAndNormalizeIntent, extractJsonBlock } from "../qwenInterpreter";

export class ServerApiProvider implements IInterpreterProvider {
  id = "server";
  name = "Qwen2.5-0.5B (Local Server / Ollama)";

  async interpret(command: string, context: DeviceContext): Promise<InterpreterResult> {
    const startTime = Date.now();
    try {
      const res = await fetch("/api/jarbees/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, context }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      const latencyMs = data.latencyMs || (Date.now() - startTime);
      const rawText = data.rawText || JSON.stringify(data.intent || {});
      
      const intent = data.intent 
        ? sanitizeAndNormalizeIntent(data.intent, command)
        : sanitizeAndNormalizeIntent(extractJsonBlock(rawText), command);

      return {
        intent,
        rawText,
        latencyMs,
        provider: this.name,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : "Failed to reach inference server";
      console.warn("ServerApiProvider failed, fallbacking to safe intent:", errorMsg);
      
      // Fallback seguro sin romper la UI
      const fallbackIntent: Intent = {
        domain: "handoff",
        action: "query",
        query: command,
        reason: `server_error: ${errorMsg}`,
      };

      return {
        intent: fallbackIntent,
        rawText: JSON.stringify({ error: errorMsg, fallback: fallbackIntent }),
        latencyMs,
        provider: `${this.name} (Error Fallback)`,
      };
    }
  }
}
