# 🌐 Guía de Conexión Frontend <-> Backend de Casa mediante Ngrok y GitHub Pages

Esta guía documenta la arquitectura de conexión del frontend con el backend alojado localmente ("en casa"), el uso de **ngrok**, las variables de entorno requeridas y las **reglas críticas de código** para evitar que futuras actualizaciones rompan la conexión del Chatbot, el Lector de Audiolibros o cualquier otro servicio.

---

## 🏗️ 1. Arquitectura de Conexión

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                             │
│  - GitHub Pages / Vercel / Local Host                   │
│  - Consume API desde: NEXT_PUBLIC_BACKEND_URL           │
└───────────────────────────┬─────────────────────────────┘
                            │ (HTTPS / ngrok tunnel)
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    NGROK TUNNEL                         │
│  - URL pública tipo: https://xxxx-xxxx.ngrok-free.app   │
│  - Header requerido: ngrok-skip-browser-warning: 69420  │
└───────────────────────────┬─────────────────────────────┘
                            │ (Puerto local 4000)
                            ▼
┌─────────────────────────────────────────────────────────┐
│                BACKEND EN CASA (NestJS)                 │
│  - Corriendo en local: http://localhost:4000            │
│  - Modelos Ollama / TTS / PostgreSQL / SQLite          │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ 2. Variables de Entorno Requeridas

En el entorno de build/despliegue del frontend (archivo `.env.local` en local, o en **GitHub Repository Secrets / Vercel Environment Variables**):

```env
# URL del túnel público de ngrok hacia tu backend en casa
NEXT_PUBLIC_BACKEND_URL=https://tu-tunnel-actual.ngrok-free.app

# Token de autenticación de tu API (opcional/según configuración)
NEXT_PUBLIC_API_TOKEN=tu_token_secreto_aqui
```

> ⚠️ **IMPORTANTE CON NGROK GRATUITO**:
> Si reiniciás ngrok en casa y cambia la URL (ej. de `abc.ngrok-free.app` a `xyz.ngrok-free.app`), debés actualizar `NEXT_PUBLIC_BACKEND_URL` en tu despliegue de GitHub/Vercel **o** cambiar la URL directamente desde la interfaz del Lector (`/reader`), la cual guarda la nueva URL en `localStorage` (`jarbees_backend_url`).

---

## 🔒 3. Reglas de Código Obligatorias (¡NO MODIFICAR NI ROMPER!)

La resolución central de la URL del backend se administra en [`src/app/services/jarbees.api.ts`](file:///c:/next/productos_crud_frd/src/app/services/jarbees.api.ts) mediante la función `getBaseUrl()`.

### 🚨 Regla de Oro para Desarrolladores / IAs:
**NUNCA** sustituir `NEXT_PUBLIC_BACKEND_URL` concatenando el puerto `:4000` a `window.location.hostname`.

```typescript
// ❌ ERROR FATAL QUE NUNCA DEBE REPETIRSE:
// Si el frontend se abre desde tu-app.ngrok-free.app, esto intentaba conectar a
// http://tu-app.ngrok-free.app:4000, ignorando la variable de entorno del backend.
const hostname = window.location.hostname;
if (hostname !== "localhost") {
  return `http://${hostname}:4000`; // ❌ ¡ROMPERÍA LA CONEXIÓN!
}
```

```typescript
// ✅ LÓGICA CORRECTA (ESTABLECIDA Y RESPETADA):
export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    // 1. Prioridad: URL personalizada guardada manualmente desde la UI (localStorage)
    const custom = window.localStorage.getItem("jarbees_backend_url");
    if (custom && custom.trim().length > 0) {
      return custom.trim().replace(/\/$/, "");
    }
  }

  // 2. Prioridad: Variable de entorno del backend ngrok o producción
  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, "");
  }

  // 3. Fallback solo si se accede por dirección IP numérica en red local LAN
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname && /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return `http://${hostname}:4000`;
    }
  }

  // 4. Fallback por defecto desarrollo local
  return "http://localhost:4000";
}
```

---

## 🔑 4. Encabezados Obligatorios para Ngrok

Ngrok en su plan gratuito muestra una página intermedia de aviso HTML (*"You are about to visit..."*) si una solicitud `fetch` de la API no incluye una cabecera especial.

Todas las llamadas HTTP (`fetch`) al backend deben incluir en sus cabeceras:

```typescript
"ngrok-skip-browser-warning": "69420"
```

Todos los servicios del proyecto (`jarbees.api.ts`, `preguntas.api.ts`, `products.api.ts`, `balance.api.ts` y `/api/reader/[documentId]/route.ts`) usan funciones `buildHeaders()` que incluyen automáticamente este encabezado.

---

## 🛠️ 5. Pasos de Diagnóstico y Resolución Rápida si se Desconecta

Si el Chatbot o el Lector indican *"No pude conectarme al servidor"*:

1. **Verificar que Backend y Ngrok estén activos en casa**:
   - Abrí una terminal en tu PC de casa y comprobá que NestJS esté corriendo en el puerto 4000.
   - Verificá la URL activa ejecutando `ngrok http 4000`.

2. **Probar la URL en el navegador**:
   - Abrí en el navegador de tu celular/PC: `https://tu-url.ngrok-free.app/api/jarbees/library/index`.
   - Debería responder un JSON válido. Si muestra error de ngrok, el túnel o el backend cayeron.

3. **Actualizar la URL si cambió ngrok**:
   - Si no querés hacer un redeploy en GitHub Pages, abrí la sección **🎧 Lector** en la Web.
   - Tocá el botón de configuración de URL de backend e ingresá tu nueva URL de ngrok. Se guardará localmente y restaurará el servicio de inmediato.
