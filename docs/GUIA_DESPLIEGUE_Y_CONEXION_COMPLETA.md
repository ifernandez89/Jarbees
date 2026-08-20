# 📘 GUÍA DEFINITIVA: CONEXIÓN BACKEND, NEXT.JS Y DESPLIEGUE EN GITHUB PAGES (JARBEES)

Este documento detalla **absolutamente todas las reglas, configuraciones y soluciones** implementadas para garantizar que la comunicación Frontend-Backend, la síntesis de audiolibros, la renderización de estilos CSS y el despliegue automático en GitHub Pages funcionen de forma impecable sin romperse jamás.

---

## 1. 🌐 RESOLUCIÓN DE BACKEND Y POLÍTICA DE CABECERAS (CORS & NGROK)

### A. Estándar de URL Base (`BASE_URL`)
Todos los servicios de API (`preguntas.api.ts`, `jarbees.api.ts`, `balance.api.ts`, `products.api.ts`) resuelven el backend mediante:

```typescript
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const BASE_URL = BACKEND_URL ?? "http://localhost:4000";
```

> ⚠️ **REGLA DE ORO:** No utilizar anulaciones dinámicas en `localStorage` para la URL base. Guardar URLs expiradas de Ngrok en `localStorage` destruye las peticiones locales y provoca fallos de conexión.

### B. Política Estricta de Cabecera `ngrok-skip-browser-warning`
- La cabecera `"ngrok-skip-browser-warning": "69420"` **SOLO SE DEBE ADJUNTAR** cuando la URL destino contiene explícitamente la palabra `"ngrok"`.
- **NUNCA** enviar esta cabecera en peticiones locales a `localhost` o `127.0.0.1`. Los navegadores envían un chequeo `OPTIONS` (Preflight) previo; si la cabecera personalizada no está en la lista blanca de CORS del servidor NestJS, el navegador bloquea la petición con `TypeError: Failed to fetch`.

```typescript
const buildHeaders = (hasJson = false, targetUrl?: string) => {
  const headers: Record<string, string> = {};
  const isNgrok = targetUrl ? targetUrl.includes("ngrok") : (BASE_URL && BASE_URL.includes("ngrok"));
  if (isNgrok) {
    headers["ngrok-skip-browser-warning"] = "69420";
  }
  if (hasJson) headers["Content-Type"] = "application/json";
  return headers;
};
```

---

## 2. 📚 LECTURA Y RECUPERACIÓN DE AUDIOLIBROS

- **Listado de Biblioteca**: Consumir `GET ${BASE_URL}/api/reader` (Endpoint público `@Public()`).
- **Detalle y Bloques de Texto**: Consumir `GET ${BASE_URL}/api/reader/:documentId`.
- **Resiliencia Multi-URL**: Si una llamada a `BASE_URL` falla en entornos locales o de red cambiante, iterar automáticamente probando `http://localhost:4000` y `http://127.0.0.1:4000` antes de fallar.

---

## 3. ⚙️ CONFIGURACIÓN DE NEXT.JS PARA EXPORTACIÓN ESTÁTICA (`next.config.ts`)

Para desplegar en GitHub Pages se requiere exportación estática (`output: 'export'`).

```typescript
import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: 'export',
  // Especificar basePath únicamente en producción (subcarpeta del repositorio)
  basePath: isProduction ? '/productos_crud_frd' : '',
  env: {
    NEXT_PUBLIC_BASE_PATH: isProduction ? '/productos_crud_frd' : '',
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

> ⚠️ **REGLA CRÍTICA:** **NUNCA** configurar `assetPrefix: '/productos_crud_frd'` al mismo tiempo que `basePath`. Hacerlo provoca que Next.js duplique el prefijo (`/productos_crud_frd/productos_crud_frd/_next/static/...`), lo que causa errores 404 al cargar archivos CSS/JS y rompe completamente el diseño visual.

---

## 4. 🎨 PREVENCION DE ESTILOS ROTOS EN GITHUB PAGES (`.nojekyll`)

Por defecto, GitHub Pages pasa los archivos exportados por la herramienta **Jekyll**. Jekyll **elimina e ignora todas las carpetas que comienzan con guion bajo** (como `_next/static/css`).

### Solución Obligatoria:
1. En cada compilación estática (`npm run build`), se DEBE crear un archivo vacío denominado `.nojekyll` dentro de la carpeta `out/`.
2. Al ejecutar despliegues manuales mediante CLI (`npx gh-pages -d out`), **SIEMPRE incluir la bandera `-t` (`--dotfiles`)** para que se transfieran los archivos ocultos:
   ```bash
   npx gh-pages -d out -t
   ```

---

## 5. 🔀 PREVENCIÓN DE ERRORES 404 EN RUTAS DINO-SPA (`404.html`)

GitHub Pages es un servidor de archivos estáticos. Si un usuario recarga directamente `https://ifernandez89.github.io/productos_crud_frd/preguntas/new` o `/reader`, GitHub Pages devuelve error `404 File Not Found`.

### Solución Obligatoria:
En la carpeta de salida (`out/`), duplicar `index.html` como `404.html`:
```bash
cp out/index.html out/404.html
```
De esta forma, cuando GitHub Pages no encuentra una subruta física, entrega `404.html`, permitiendo que el enrutador cliente de Next.js procese la ruta y renderice la página correspondiente.

---

## 6. 🔄 REDIRECCIONES INTERNAS Y CLAVES DE REACT

1. **Redirección desde Raíz (`src/app/page.tsx`)**: Usar `router.replace("/preguntas/new")` en un componente de cliente para respetar automáticamente el `basePath` de Next.js.
2. **Alias de Ruta `/lector` (`src/app/lector/page.tsx`)**: Redirige nativamente a `/reader` mediante `redirect("/reader")`.
3. **Claves Únicas en Bucles `.map()`**:
   ```tsx
   key={`book-${item.id || item.titulo || index}-${index}`}
   ```
   Evita advertencias de consola cuando dos elementos comparten slugs similares.

---

## 7. 🤖 WORKFLOW AUTOMÁTICO DE GITHUB ACTIONS (`.github/workflows/deploy.yml`)

El archivo `.github/workflows/deploy.yml` debe contener el siguiente estándar robusto:

```yaml
name: Build & Deploy to gh-pages

on:
  push:
    branches: [ main, develop ]
  workflow_dispatch: {}

# Cancela ejecuciones obsoletas si se pushea un nuevo commit
concurrency:
  group: gh-pages-deploy
  cancel-in-progress: true

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    env:
      NEXT_PUBLIC_BACKEND_URL: ${{ secrets.NEXT_PUBLIC_BACKEND_URL }}
      NEXT_PUBLIC_MASTER_PASSWORD: ${{ secrets.NEXT_PUBLIC_MASTER_PASSWORD }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install --legacy-peer-deps --no-audit --no-fund

      - name: Generate Workbox SW
        run: npm run generate-workbox-sw || true

      - name: Build (static export)
        run: |
          npm run build
          cp out/index.html out/404.html || true
          touch out/.nojekyll

      - name: Deploy to gh-pages branch
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out

      - name: Upload GitHub Pages Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy-to-pages:
    needs: build-and-deploy
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 8. 🛠️ AJUSTES EN EL REPOSOSITORIO DE GITHUB

En **GitHub Repositorio → Settings → Pages → Build and deployment**:

- **Source**: Seleccionar **`Deploy from a branch`**.
- **Branch**: Seleccionar **`gh-pages`** y la carpeta **`/ (root)`**.
- Hacé clic en **Save**.

*(Alternativamente se puede seleccionar `GitHub Actions` como Source).*

---

## 📌 RESUMEN DE CHECKLIST DE DESPLIEGUE MANUAL (RÁPIDO)

Si deseás compilar y publicar manualmente desde tu máquina local sin esperar a GitHub Actions:

```bash
# 1. Compilar el proyecto Next.js
npm run build

# 2. Generar fallback SPA 404 y deshabilitar filtro Jekyll
cp out/index.html out/404.html
touch out/.nojekyll

# 3. Publicar a la rama gh-pages incluyendo archivos ocultos (-t)
npx gh-pages -d out -t
```

---
*Documento guardado para mantenimiento y desarrollo permanente de JarBees Frontend.*
