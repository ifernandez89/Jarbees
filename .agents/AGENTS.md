# Workspace Agent Rules

## Backend Connection Standard (Chatbot & Reader)

### 1. Base URL Resolution Standard
- All services (`preguntas.api.ts`, `jarbees.api.ts`, `balance.api.ts`, `products.api.ts`) MUST resolve the backend base URL using:
  ```typescript
  export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const BASE_URL = BACKEND_URL ?? "http://localhost:4000";
  ```
- Do NOT use dynamic `localStorage` overrides for base URL that can store dead ngrok URLs and break cross-origin requests.

### 2. Reader Endpoints
- **Library List**: Consume `GET ${BASE_URL}/api/reader` (Public endpoint combining Prisma DB documents and `library-index.json`).
- **Document Detail**: Consume `GET ${BASE_URL}/api/reader/:documentId` to fetch blocks for synthesized audio playback.

### 3. Ngrok Header Policy
- Header `"ngrok-skip-browser-warning": "69420"` MUST ONLY be attached when the target URL string explicitly includes `"ngrok"`.
- Do NOT attach custom headers like `"ngrok-skip-browser-warning"` on local `localhost` or `127.0.0.1` requests, as it triggers failed CORS OPTIONS preflight checks in web browsers.

### 4. Component Rendering Keys
- Always use composite unique keys for list mappings in React, e.g. `key={`book-${item.id || item.titulo || index}-${index}`}` to prevent duplicate key console warnings.
