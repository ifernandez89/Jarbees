import { BACKEND_URL } from "./preguntas.api";

const BASE_URL = BACKEND_URL ?? "http://localhost:4000";

export interface BalanceQuestion {
  id: number;
  question: string;
}

export interface BalanceSessionResponse {
  sessionId: number;
  type: string;
  createdAt: string;
  questions: BalanceQuestion[];
}

export interface SubmitAnswerResponse {
  success: boolean;
  message: string;
  questionId: number;
  nextQuestion?: BalanceQuestion;
}

export interface BalanceReport {
  sessionId: number;
  completedAt: string;
  nextRecommendedAt?: string;
  type: string;
  scoreGeneral: number;
  summary: string;
  astrologicalContext?: unknown;
  energyDistribution: Record<string, number>;
  analysis: {
    fortalezas: string[];
    enCrecimiento: string[];
    necesitanAtencion: string[];
    loQueObservo: string;
    puntoCiego: string;
    fortalezaDetalle: string;
    astrologyConnection: string;
  };
  recommendations: {
    accionFocalizada: string;
    preguntaReflexion: string;
    semilla: string;
  };
  answers: Array<{
    id: number;
    question: string;
    answer: string;
    dimension: string;
  }>;
}

export async function startBalanceSession(type = "manual"): Promise<BalanceSessionResponse> {
  const res = await fetch(`${BASE_URL}/api/balance/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type }),
  });
  if (!res.ok) {
    throw new Error(`Error al iniciar balance: ${await res.text()}`);
  }
  return res.json();
}

export async function submitBalanceAnswer(
  sessionId: number,
  questionId: number,
  answer: string
): Promise<SubmitAnswerResponse> {
  const res = await fetch(`${BASE_URL}/api/balance/${sessionId}/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ questionId, answer }),
  });
  if (!res.ok) {
    throw new Error(`Error al enviar respuesta: ${await res.text()}`);
  }
  return res.json();
}

export async function finishBalanceSession(sessionId: number): Promise<BalanceReport> {
  const res = await fetch(`${BASE_URL}/api/balance/${sessionId}/finish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Error al finalizar balance: ${await res.text()}`);
  }
  return res.json();
}

export async function getLatestBalance(): Promise<BalanceReport | { message: string }> {
  const res = await fetch(`${BASE_URL}/api/balance/latest`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Error al obtener el último balance: ${await res.text()}`);
  }
  return res.json();
}

export async function getBalanceHistory(): Promise<unknown[]> {
  const res = await fetch(`${BASE_URL}/api/balance/history`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Error al obtener historial de balances: ${await res.text()}`);
  }
  return res.json();
}
