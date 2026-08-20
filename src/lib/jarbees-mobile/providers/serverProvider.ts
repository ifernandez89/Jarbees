// src/lib/jarbees-mobile/providers/serverProvider.ts
import { IInterpreterProvider, InterpreterResult, DeviceContext, Intent } from "../jarbeesMobile.types";
import { SYSTEM_PROMPT, sanitizeAndNormalizeIntent, extractJsonBlock } from "../qwenInterpreter";

const LOCAL_OLLAMA_URL = process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434";
const LOCAL_MODEL_NAME = process.env.NEXT_PUBLIC_LOCAL_MODEL || "zarigata/Qwen2.5-0.5B-Instruct:CRAZYMODE";

export class ServerApiProvider implements IInterpreterProvider {
  id = "server";
  name = "Qwen2.5-0.5B (Local Ollama / llama.cpp)";

  async interpret(command: string, context: DeviceContext): Promise<InterpreterResult> {
    const startTime = Date.now();
    try {
      const userPrompt = context && Object.keys(context).length > 0
        ? `Comando: "${command}"\nContexto: ${JSON.stringify(context)}`
        : `Comando: "${command}"`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${LOCAL_OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: LOCAL_MODEL_NAME,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          format: "json",
          stream: false,
          options: {
            temperature: 0.0,
            num_predict: 100,
          },
        }),
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Ollama server responded with ${res.status}`);
      }

      const data = await res.json();
      const latencyMs = Date.now() - startTime;
      const rawText = data.message?.content || "";
      const parsedBlock = extractJsonBlock(rawText);
      const intent = sanitizeAndNormalizeIntent(parsedBlock, command);

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
