// src/app/api/jarbees/interpret/route.ts
import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT, extractJsonBlock } from "@/lib/jarbees-mobile/qwenInterpreter";

export const dynamic = "force-dynamic";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL_NAME = process.env.LOCAL_MODEL_NAME || "zarigata/Qwen2.5-0.5B-Instruct:CRAZYMODE";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { command, context } = body;

    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'command' string" }, { status: 400 });
    }

    const userPrompt = context && Object.keys(context).length > 0
      ? `Comando: "${command}"\nContexto: ${JSON.stringify(context)}`
      : `Comando: "${command}"`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL_NAME,
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

    if (!ollamaRes.ok) {
      const errorText = await ollamaRes.text().catch(() => "Unknown Ollama error");
      return NextResponse.json(
        {
          error: `Ollama error (${ollamaRes.status}): ${errorText}`,
          fallback: true,
          latencyMs: Date.now() - startTime,
        },
        { status: 502 }
      );
    }

    const data = await ollamaRes.json();
    const latencyMs = Date.now() - startTime;
    const rawText = data.message?.content || "";
    const parsedIntent = extractJsonBlock(rawText);

    return NextResponse.json({
      intent: parsedIntent,
      rawText,
      latencyMs,
      model: MODEL_NAME,
    });
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    const errorMsg = err instanceof Error ? err.message : "Failed to execute inference";
    return NextResponse.json(
      {
        error: isTimeout ? "Timeout connecting to local Ollama" : errorMsg,
        latencyMs,
        fallback: true,
      },
      { status: 500 }
    );
  }
}
