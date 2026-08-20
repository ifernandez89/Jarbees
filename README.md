# 🐝 JarBees Mobile — Edge AI Command Interpreter

**JarBees Mobile** es una aplicación asistente mobile-first y controlador inteligente del dispositivo en el borde (*Edge Computing*), impulsada por un modelo de lenguaje ultraligero local (**Qwen2.5-0.5B-Instruct** en formato GGUF mediante `llama.cpp`).

Su objetivo fundamental no es ser un chatbot genérico, sino actuar como un **intérprete determinista de intenciones y controlador del teléfono**: traduce comandos de voz y texto en lenguaje natural + contexto del dispositivo en acciones estructuradas y seguras.

---

## 📌 Origen y Alcance del Proyecto

- **Repositorio Independiente**: Este proyecto se separó y derivó del frontend original (`products crud frd`) para albergar funcionalidades experimentales de asistente móvil y procesamiento en el borde.
- **Preservación de Vistas Legadas**: Todas las interfaces y módulos originales (`/products`, `/preguntas/new`, `/reader`) se mantienen intactos en la base de código y continúan disponibles para futuras integraciones.

---

## 🏗️ Arquitectura Híbrida en 2 Etapas

```mermaid
flowchart LR
    subgraph Etapa 1: GitHub Pages / Web
        A[Desarrollo Rápido UI] --> B[Test de Intenciones Qwen]
        B --> C[Voz + Texto + VAD]
        C --> D[Cálculos + Timers + Mock Device]
    end

    subgraph Etapa 2: Android APK (Moto G5 Plus)
        D --> E[Empaquetar llama.cpp + GGUF]
        E --> F[Conectar Android Native Bridge]
        F --> G[Control Real de Hardware Android]
    end
```

1. **Etapa 1 — Web / PWA (GitHub Pages como Laboratorio de Lógica & UX)**:
   - Permite iterar velozmente la interfaz, flujo conversacional, reconocimiento de voz (STT), micro-barra de texto, temporizadores en pantalla y cálculos deterministas sin requerir empaquetar APKs en cada cambio.
2. **Etapa 2 — Android APK (Laboratorio de Integración de Hardware)**:
   - Empaqueta `llama.cpp` + `qwen2.5-0.5b.gguf` para inferencia 100% offline en el chip del teléfono, controlando volumen nativo (`AudioManager`), música global (`MediaSessionManager`), cámara nativa y alarmas del reloj del sistema.

---

## 🎯 16 Capacidades de la Versión 1 (V1)

1. **🧠 Intent Engine**: Qwen 0.5B recibe lenguaje natural y genera JSON estructurado (`domain`, `action`, `parameters`).
2. **🎤 Entrada por Voz (STT)**: Botón `[ HABLAR ]` con detección de actividad de voz (VAD de silencio ~1.4s).
3. **⌨️ Entrada por Texto**: Barra retráctil `[ ESCRIBIR UN COMANDO ]` para depuración sin micrófono.
4. **📱 Apertura de Aplicaciones**: `OPEN_CAMERA`, `OPEN_CALCULATOR`, `OPEN_BROWSER`, `OPEN_SETTINGS`.
5. **🔊 Control de Audio & Multimedia**: `VOLUME_UP`, `VOLUME_DOWN`, `SET_VOLUME`, `MUTE`, `MEDIA_PLAY`, `MEDIA_PAUSE`, `MEDIA_NEXT`, `MEDIA_PREVIOUS`.
6. **🔋 Consultas de Contexto del Teléfono**: Batería, estado de carga, auriculares conectados, música activa y hora.
7. **📊 Resumen de Estado del Dispositivo**: *"JarBees, ¿cómo está mi teléfono?"* genera una tarjeta visual completa de estado.
8. **🧮 Cálculos Matemáticos Deterministas**: Resuelve operaciones aritméticas y descuentos porcentuales (e.g. *"Calculá cuánto me queda si descuento 21% de 1837"* → `1451.23`).
9. **⏱️ Temporizadores en Tiempo Real**: Creación, cuenta regresiva activa en widget y cancelación de temporizadores.
10. **📋 Capability Discovery**: *"¿Qué podés hacer?"* y *"¿Qué puedo hacer sin Internet?"* detallan funciones locales vs Core.
11. **📶 Consulta de Conectividad**: WiFi, Bluetooth y estado de conexión a Internet.
12. **📍 Ubicación GPS**: Coordenadas de latitud y longitud actuales.
13. **📷 Cámara**: Lanzador y visor interactivo de cámara.
14. **🌐 Búsqueda en Navegador**: *"Buscá perros en Internet"* abre el navegador con la búsqueda construida.
15. **🔐 Sistema de Confirmaciones**: Distinción entre acciones automáticas seguras y acciones que requieren confirmación.
16. **🛠️ Developer Mode & Diagnostics**: Selector de proveedores (`ServerApiProvider`, `WebGpuLocalProvider`, `RuleFallbackProvider`), telemetría de latencia `ms`, visor de JSON formateado y simulador de contexto en vivo.

---

## 🚀 Puesta en Marcha Local

### Prerrequisitos
- [Bun](https://bun.sh/) o [Node.js](https://nodejs.org/) (v18+)
- [Ollama](https://ollama.com/) con el modelo `zarigata/Qwen2.5-0.5B-Instruct:CRAZYMODE` (opcional si se usa el motor Fallback/Offline).

### Instalación y Ejecución
```bash
# 1. Instalar dependencias
bun install

# 2. Iniciar servidor de desarrollo
bun run dev

# 3. Ejecutar suite de pruebas
bun scripts/verify-jarbees-core.js

# 4. Compilar producción
bun run build
```

---

## 📄 Licencia y Créditos
Desarrollado para el ecosistema **JarBees**. Consulta el archivo [CHANGELOG.md](./CHANGELOG.md) para el historial completo de cambios y especificaciones técnicas.
