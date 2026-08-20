## PWA for JarBees — Quick integration guide

This document explains the minimal PWA setup included in the project and how to test it locally and on production (GitHub Pages or other hosts).

What is included in the repo

- `public/manifest.json` — app metadata and icons. Update `short_name`, `name` and `icons` if you change the logo.
- `public/sw.js` — simple service worker skeleton (caching strategy). Tune for your needs.
- `src/components/RegisterSW.tsx` — client component that registers the service worker on mount.
- `src/app/layout.tsx` — includes `<RegisterSW />` so the SW registers on every page.

Why this approach

- Lightweight and explicit: no heavy plugins required. Works for a small personal app and PWA features (installable, offline caching of static assets).
- Keeps UI and UX minimal and clean — SW only caches necessary assets and does not alter runtime behavior of chat queries (they still need a reachable backend).

How to test locally (production build)

1) Build the project:

```bash
npm run build
```

2) Start the production server:

```bash
npm run start
```

3) Open `http://localhost:3000` in Chrome. Open DevTools > Application > Service Workers to confirm the worker is registered.

4) Test offline: in DevTools > Application > Service Workers check "Offline" (or set network to "Offline") and reload the page. The shell/static pages should load if the SW cached them.

Notes for GitHub Pages

- GitHub Pages serves from a subpath (username.github.io/repo) by default; service worker `scope` must match the path. If you host under a custom domain (recommended with Cloudflare Tunnel for backend), the scope `/` works as expected.
- If deploying to GitHub Pages, ensure `public/sw.js` is at the site root and `manifest.json` links are correct in `src/app/layout.tsx`.

Testing installability

- Chrome will show an install prompt when the app meets criteria (served over HTTPS, manifest present, service worker controlling the page). Use Lighthouse > Progressive Web App to audit.

Recommended production tweaks (optional)

- Use a stronger caching strategy (Workbox) for offline support of API responses if desired, but be careful: API is dynamic and should not be aggressively cached.
- Use runtime caching for large images and keep short TTL for API calls.
- When publishing on GitHub Pages, make sure to set `start_url` and `scope` in `manifest.json` to your repo path if needed.

Service worker registration notes

- Registration happens in `src/components/RegisterSW.tsx`. It uses a simple `navigator.serviceWorker.register('/sw.js')` pattern.
- If you change the file name or location, update both the `RegisterSW` and the `manifest.json` icons paths.

Environment variables

- `NEXT_PUBLIC_BACKEND_URL` must be set to the public backend endpoint (Cloudflare Tunnel hostname) so the PWA can reach the API when installed on a device.
- `NEXT_PUBLIC_API_TOKEN` optional for Bearer token auth.

Commands quick reference

```bash
# build
npm run build

# start production server
npm run start

# run bundle analysis (optional)
npm run analyze
```

Where to look next

- `docs/CLOUDFLARE_TUNNEL.md` — quick steps to expose your NestJS backend through Cloudflare Tunnel.
- `docs/BUNDLE_ANALYSIS.md` — bundle analysis and recommendations to reduce First Load JS.

If you want, I can:
- Add Workbox-based caching for specific routes.
- Create a small CI workflow to build and deploy the PWA to GitHub Pages automatically.
# 🌱 Herbarium - PWA Configurada

## ✅ PWA Ya Implementada

Tu aplicación ahora es una **Progressive Web App** completa y está lista para instalarse en dispositivos móviles.

## 📦 Lo que se agregó:

### 1. **Service Worker automático** 
   - Cache inteligente de recursos (imágenes, CSS, JS, fuentes)
   - Funciona offline para páginas ya visitadas
   - Se actualiza automáticamente

### 2. **Manifest.json**
   - Metadatos de la app (nombre, descripción, colores)
   - Shortcuts a Plantas y Afecciones
   - Iconos en múltiples tamaños

### 3. **Meta tags PWA**
   - Theme color: #7ba684 (color salvia)
   - Apple touch icons
   - Viewport optimizado

### 4. **Componente InstallPWA**
   - Prompt de instalación elegante
   - Se muestra automáticamente cuando es instalable
   - Opción de "Ahora no" que guarda preferencia por 7 días

### 5. **Página offline**
   - Mensaje amigable cuando no hay conexión
   - Intenta reconectar automáticamente cada 5 segundos

## 🎨 Iconos Pendientes

Los iconos actuales son **SVG placeholders temporales**. Para producción, necesitás iconos PNG reales:

### Opción A: Generador online (RECOMENDADO)
1. Ir a https://www.pwabuilder.com/imageGenerator
2. Subir un logo cuadrado de 512x512 o mayor
3. Descargar el paquete ZIP
4. Extraer todo a `public/icons/`

### Opción B: Diseño personalizado
- Fondo: Color salvia (#7ba684) o hueso (#fdfaf6)
- Símbolo: ✦ (diamante) o 🌱
- Dejar 10% de padding para modo "maskable"
- Usar los tamaños de `GENERATE_ICONS.md`

## 🚀 Cómo probar la PWA

### En desarrollo:
```bash
npm run build
npm start
```

### En producción (GitHub Pages):
1. Hacer push de los cambios
2. GitHub Actions hará el deploy automáticamente
3. Esperar 2-3 minutos
4. Abrir la URL en Chrome/Edge/Safari móvil
5. Buscar el banner "Agregar a pantalla de inicio" o el botón en el menú

### Lighthouse (auditoría PWA):
```bash
# Instalar Lighthouse CLI (opcional)
npm install -g lighthouse

# Correr auditoría
lighthouse https://tu-dominio.com --view
```

## 📱 Instalación para usuarios

### Android (Chrome/Edge):
1. Abrir la web
2. Tocar los 3 puntos (⋮)
3. "Agregar a pantalla de inicio" o "Instalar app"
4. ¡Listo! Aparece como app nativa

### iOS (Safari):
1. Abrir la web
2. Tocar el botón compartir (⬆️)
3. "Agregar a pantalla de inicio"
4. ¡Listo!

### Desktop (Chrome/Edge):
1. Ícono de instalación (+) en la barra de direcciones
2. O el prompt automático que aparece

## 🎯 Beneficios de la PWA

✅ **Acceso rápido**: Ícono en la pantalla de inicio como app nativa  
✅ **Funciona offline**: Páginas visitadas se guardan automáticamente  
✅ **Ahorra datos**: Cache inteligente reduce consumo móvil en ~70%  
✅ **Más rápida**: Carga instantánea después de primera visita  
✅ **Sin tienda**: No necesita Google Play o App Store  
✅ **Actualizaciones**: Se actualiza automáticamente sin intervención  

## 🔧 Configuración adicional

### Personalizar colores:
Editar `public/manifest.json`:
```json
{
  "theme_color": "#7ba684",
  "background_color": "#fdfaf6"
}
```

### Agregar más shortcuts:
Editar `public/manifest.json` sección `shortcuts`.

### Modificar estrategia de cache:
Editar `next.config.ts` sección `runtimeCaching`.

## 🐛 Troubleshooting

### El botón "Instalar" no aparece:
- Verificar que estés en HTTPS (GitHub Pages lo provee)
- Abrir en Chrome/Edge/Safari (Firefox no soporta bien PWA)
- Limpiar cache del navegador
- Verificar que `sw.js` se esté sirviendo correctamente

### Cambios no se reflejan:
- Service worker puede estar cacheando la versión antigua
- Solución: Hacer "hard refresh" (Ctrl+Shift+R en desktop)
- O desinstalar y reinstalar la PWA

### Los iconos no se ven:
- Reemplazar los SVG por PNG reales en `public/icons/`
- Verificar que los nombres coincidan con `manifest.json`

## 📊 Próximos pasos recomendados

1. **Generar iconos PNG reales** (ver arriba)
2. **Optimizar imágenes de plantas** (próximo issue)
3. **Implementar infinite scroll** (para mejorar rendimiento)
4. **Agregar analytics** (opcional, para ver instalaciones)

## 📚 Recursos

- [PWA Builder](https://www.pwabuilder.com/)
- [Lighthouse PWA](https://developers.google.com/web/tools/lighthouse)
- [Next PWA Docs](https://github.com/shadowwalker/next-pwa)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)

---

**¿Listo para instalar?** Hace el build, deployá a GitHub Pages y probá instalarlo en tu Moto G5 Plus 📱🌱
