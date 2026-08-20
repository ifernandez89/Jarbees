# JarBees — Nuevos Endpoints y comportamiento (Nivel 3/4)

Aquí está la documentación para que el equipo frontend integre las nuevas capacidades de ingestión, feedback y planner. También se describe el nuevo comportamiento transparente para consultas sobre economía argentina.

1) Ingestión de URLs (Web Scraping)

- Endpoint: `POST /api/jarbees/library/document/url`
- Body (json):

```
{
  "url": "https://ejemplo.com/articulo",
  "category": "web" // Opcional
}
```

- Respuesta exitosa (json):

```
{
  "success": true,
  "documentId": 42,
  "title": "Título extraído de la web",
  "chunks": 15,
  "category": "web"
}
```

Notas frontend:
- Usar `ingestUrl(url, category?)` en `src/app/services/jarbees.api.ts` (cliente incluido en repo).
- Mostrar estado de progreso (spinner) mientras se procesa la ingestión — puede tardar varios segundos.
- Al completar, actualizar la lista local de documentos y permitir que el usuario abra el documento en el panel de fuentes.

2) Sistema de Feedback

- Endpoint: `POST /api/jarbees/feedback`
- Body (json):

```
{
  "sessionId": "123e4567-e89b-12d3...", // Opcional
  "question": "¿Cómo instalo Docker?",
  "answer": "Para instalar Docker debes...",
  "score": 5,
  "comment": "Respuesta muy útil y rápida"
}
```

- Respuesta: `{ "success": true }` (o error HTTP)

Notas frontend:
- Llamar a `sendFeedback(body)` en `src/app/services/jarbees.api.ts`.
- Asociar el feedback a la `sessionId` si está disponible.
- UX: usar estrellas o pulgares — permitir comentario opcional. Enviar datos en background y mostrar confirmación.

3) Planner (Agente Planificador)

- Endpoint: `POST /api/jarbees/planner`
- Body (json):

```
{
  "objective": "Planear un viaje a la Patagonia de 7 días",
  "sessionId": "123e4567..." // Opcional
}
```

- Respuesta exitosa (json):

```
{
  "success": true,
  "plan": {
    "id": 1,
    "objective": "Planear un viaje a la Patagonia de 7 días",
    "status": "in_progress",
    "steps": [
      { "stepNumber": 1, "description": "Investigar vuelos a Bariloche", "status": "pending" },
      { "stepNumber": 2, "description": "Armar itinerario de excursiones", "status": "pending" },
      { "stepNumber": 3, "description": "Buscar alojamiento", "status": "pending" }
    ]
  }
}
```

Notas frontend:
- Usar `createPlanner(objective, sessionId?)` en `src/app/services/jarbees.api.ts`.
- Renderizar `plan.steps` como una lista de tareas con checkboxes y endpoints para actualizar estado (puede implementarse luego).

4) Comportamiento Transparente: economía argentina

- Ahora `POST /api/jarbees/query` responde inmediatamente con datos sobre economía argentina para preguntas comunes (ej.: cotización del dólar blue).
- No se agregó endpoint nuevo; es un comportamiento del backend.

5) Ejemplos de uso (cliente)

```ts
import jarbees from '@/app/services/jarbees.api';

// Ingestar URL
await jarbees.ingestUrl('https://es.wikipedia.org/wiki/Argentina', 'web');

// Enviar feedback
await jarbees.sendFeedback({ sessionId: 'abc', question: '...', answer: '...', score: 5 });

// Crear planner
const plan = await jarbees.createPlanner('Planear viaje a la Patagonia');
```

6) Variables de entorno
- `NEXT_PUBLIC_BACKEND_URL` — URL pública del backend (ej. `https://jarbees.midominio.com`).
- `NEXT_PUBLIC_API_TOKEN` — token simple (Bearer) para peticiones desde el frontend (opcional).

7) Seguridad y UX
- No exponer tokens en el repositorio.
- Hacer polling o toasts para notificar finalización de ingestión.

---
Archivo cliente incluido: `src/app/services/jarbees.api.ts`.
