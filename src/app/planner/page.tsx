"use client";
import { useState } from "react";
import jarbees from "@/app/services/jarbees.api";
import { Button } from "@/components/ui/button";

type PlannerStep = {
  stepNumber: number;
  description: string;
  status: string;
};

type Planner = {
  id: number;
  objective: string;
  status: string;
  steps: PlannerStep[];
};

export default function PlannerPage() {
  const [objective, setObjective] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Planner | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!objective.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await jarbees.createPlanner(objective);
      setPlan(res.plan as Planner);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message || "Error al crear plan");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = () => {
    jarbees.connectGoogle();
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Planner — JarBees</h1>
      <p className="text-sm text-slate-400 mb-4">Escribe un objetivo y JarBees lo descompone en pasos accionables.</p>

      <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Conectar Google</h2>
            <p className="text-sm text-slate-400">
              Habilita Calendar, Gmail y Drive para que JarBees pueda trabajar con tus datos de Google.
            </p>
          </div>
          <Button variant="outline" onClick={handleConnectGoogle}>
            Conectar Google
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Si cambiaste tu dominio, revisa que el redirect URI configurado en Google Cloud apunte al sitio real.
        </p>
      </div>

      <textarea
        value={objective}
        onChange={(e) => setObjective(e.target.value)}
        className="w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-white"
        rows={4}
        placeholder="Planear un viaje a la Patagonia de 7 días"
      />
      <div className="mt-3 flex gap-2">
        <Button onClick={handleCreate} disabled={loading}>
          {loading ? "Generando..." : "Generar plan"}
        </Button>
      </div>

      {error && <div className="mt-4 text-sm text-red-400">{error}</div>}

      {plan && (
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-medium">Plan: {plan.objective}</h2>
          <ul className="space-y-2">
            {plan.steps.map((s: PlannerStep) => (
              <li key={s.stepNumber} className="flex items-center justify-between rounded-md border border-slate-800 p-3">
                <div>
                  <div className="text-sm font-semibold">{s.description}</div>
                  <div className="text-xs text-slate-400">Estado: {s.status}</div>
                </div>
                <input type="checkbox" aria-label={`Marcar paso ${s.stepNumber}`} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
