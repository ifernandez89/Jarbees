export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const BASE_URL = BACKEND_URL ?? "http://localhost:4000";
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

const buildHeaders = (hasJson = false, targetUrl?: string) => {
  const headers: Record<string, string> = {};
  const isNgrok = targetUrl ? targetUrl.includes("ngrok") : (BASE_URL && BASE_URL.includes("ngrok"));
  if (isNgrok) {
    headers["ngrok-skip-browser-warning"] = "69420";
  }
  if (hasJson) headers["Content-Type"] = "application/json";
  if (API_TOKEN) headers["Authorization"] = `Bearer ${API_TOKEN}`;
  return headers;
};

// ─── Vision: analizar imagen en el chat ──────────────────────────────────────
export type VisionMode = "general" | "ocr" | "error" | "diagram" | "document";

export type VisionResponse = {
  answer: string;
  model: string;
  latencyMs: number;
  detectedLanguage?: string;
};

export async function analyzeImage(
  file: Blob,
  options?: { question?: string; mode?: VisionMode; sessionId?: string }
): Promise<VisionResponse> {
  const form = new FormData();
  form.append("file", file);
  if (options?.question) form.append("question", options.question);
  form.append("mode", options?.mode ?? "general");
  if (options?.sessionId) form.append("sessionId", options.sessionId);

  const headers = buildHeaders(false, BASE_URL);
  const res = await fetch(`${BASE_URL}/api/jarbees/vision/analyze`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vision analyze fallido: ${text}`);
  }

  return (await res.json()) as VisionResponse;
}

// ─── Library: ingestar PDF + responder pregunta ───────────────────────────────
export type PdfIngestResponse = {
  success: true;
  documentId: number;
  title: string;
  chunks: number;
  category?: string;
  answer?: string;
};

export async function ingestPdf(
  file: Blob,
  options?: { title?: string; category?: string; question?: string; sessionId?: string }
): Promise<PdfIngestResponse> {
  const form = new FormData();
  form.append("file", file);
  if (options?.title) form.append("title", options.title);
  if (options?.category) form.append("category", options.category);
  if (options?.question) form.append("question", options.question);
  if (options?.sessionId) form.append("sessionId", options.sessionId);

  const headers = buildHeaders(false, BASE_URL);
  const res = await fetch(`${BASE_URL}/api/jarbees/library/document/pdf`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ingestión PDF fallida: ${text}`);
  }

  return (await res.json()) as PdfIngestResponse;
}

export type IngestResponse = {
  success: true;
  documentId: number;
  title: string;
  chunks: number;
  category?: string;
};

export async function ingestUrl(url: string, category?: string): Promise<IngestResponse> {
  const res = await fetch(`${BASE_URL}/api/jarbees/library/document/url`, {
    method: "POST",
    headers: buildHeaders(true, BASE_URL),
    body: JSON.stringify({ url, category }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ingestión fallida: ${text}`);
  }

  return (await res.json()) as IngestResponse;
}

export type FeedbackBody = {
  sessionId?: string;
  question: string;
  answer: string;
  score: number;
  comment?: string;
};

export async function sendFeedback(body: FeedbackBody): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/api/jarbees/feedback`, {
    method: "POST",
    headers: buildHeaders(true, BASE_URL),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Feedback fallido: ${text}`);
  }

  return (await res.json()) as { success: boolean };
}

export type PlannerResponse = {
  success: true;
  plan: {
    id: number;
    objective: string;
    status: string;
    steps: Array<{ stepNumber: number; description: string; status: string }>;
  };
};

export async function createPlanner(objective: string, sessionId?: string): Promise<PlannerResponse> {
  const res = await fetch(`${BASE_URL}/api/jarbees/planner`, {
    method: "POST",
    headers: buildHeaders(true, BASE_URL),
    body: JSON.stringify({ objective, sessionId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Planner fallido: ${text}`);
  }

  return (await res.json()) as PlannerResponse;
}

export type LibraryIndexItem = {
  id?: string | number;
  titulo: string;
  autor?: string;
  formato: string;
  archivo?: string;
  categorias?: string[];
  embeddings?: string;
  paginas?: number;
  cantidadChunks?: number;
};

export async function getLibraryIndex(): Promise<LibraryIndexItem[]> {
  const customUrl = typeof window !== "undefined" ? window.localStorage.getItem("jarbees_backend_url") : null;
  const lanHost = typeof window !== "undefined" && window.location.hostname !== "localhost" && !window.location.hostname.includes("ngrok") ? `http://${window.location.hostname}:4000` : null;

  const urlsToTry = [
    customUrl,
    BASE_URL,
    lanHost,
    "http://localhost:4000",
    "http://127.0.0.1:4000",
  ].filter((u): u is string => Boolean(u && u.trim().length > 0));

  for (const url of urlsToTry) {
    if (!url) continue;
    const cleanUrl = url.replace(/\/$/, "");
    try {
      const headers: Record<string, string> = { "Accept": "application/json" };
      if (cleanUrl.includes("ngrok")) {
        headers["ngrok-skip-browser-warning"] = "69420";
      }

      const res = await fetch(`${cleanUrl}/api/reader`, {
        method: "GET",
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        const list = data?.documentos || data?.documents || (Array.isArray(data) ? data : []);
        if (Array.isArray(list) && list.length > 0) {
          return list as LibraryIndexItem[];
        }
      }
    } catch (err) {
      console.warn(`[getLibraryIndex] Intentando ${cleanUrl} falló:`, err);
    }
  }

  // Intentar endpoint alternativo /api/jarbees/library/index
  for (const url of urlsToTry) {
    if (!url) continue;
    const cleanUrl = url.replace(/\/$/, "");
    try {
      const headers: Record<string, string> = { "Accept": "application/json" };
      if (cleanUrl.includes("ngrok")) {
        headers["ngrok-skip-browser-warning"] = "69420";
      }

      const res = await fetch(`${cleanUrl}/api/jarbees/library/index`, {
        method: "GET",
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        const list = data?.documentos || data?.documents || (Array.isArray(data) ? data : []);
        if (Array.isArray(list) && list.length > 0) {
          return list as LibraryIndexItem[];
        }
      }
    } catch {
      // Ignorar e intentar siguiente
    }
  }

  return [];
}

export type ReaderDocumentResponse = {
  documentId: string | number;
  title: string;
  author: string;
  paginas: number;
  cantidadChunks?: number;
  blocks: string[];
};

export async function getReaderDocument(documentId: string | number): Promise<ReaderDocumentResponse> {
  const customUrl = typeof window !== "undefined" ? window.localStorage.getItem("jarbees_backend_url") : null;
  const lanHost = typeof window !== "undefined" && window.location.hostname !== "localhost" && !window.location.hostname.includes("ngrok") ? `http://${window.location.hostname}:4000` : null;

  const urlsToTry = [
    customUrl,
    BASE_URL,
    lanHost,
    "http://localhost:4000",
    "http://127.0.0.1:4000",
  ].filter((u): u is string => Boolean(u && u.trim().length > 0));

  for (const url of urlsToTry) {
    if (!url) continue;
    const cleanUrl = url.replace(/\/$/, "");
    try {
      const headers: Record<string, string> = { "Accept": "application/json" };
      if (cleanUrl.includes("ngrok")) {
        headers["ngrok-skip-browser-warning"] = "69420";
      }

      const res = await fetch(`${cleanUrl}/api/reader/${encodeURIComponent(documentId)}`, {
        method: "GET",
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.blocks && Array.isArray(data.blocks) && data.blocks.length > 0) {
          return data as ReaderDocumentResponse;
        }
      }
    } catch {
      // Probar siguiente
    }
  }

  throw new Error(`No se pudo obtener el documento ${documentId}`);
}

export function connectGoogle(): void {
  if (typeof window === "undefined") return;
  window.location.assign(`${BASE_URL}/api/jarbees/google/login`);
}

const jarbeesApi = { ingestUrl, sendFeedback, createPlanner, connectGoogle, getLibraryIndex, getReaderDocument };

export default jarbeesApi;
