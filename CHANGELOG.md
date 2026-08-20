# CHANGELOG - JarBees Mobile

## [v1.0.0-experimental] - 2026-08-20

### 🐝 Naturaleza y Origen del Proyecto
- **Tipo de Proyecto**: **JarBees Mobile** — Asistente inteligente y controlador de dispositivo en el borde (*Edge AI Command Interpreter*), diseñado para ejecutarse localmente en dispositivos móviles (e.g. Android / Moto G5 Plus / APK con `llama.cpp` + GGUF).
- **Origen**: Este proyecto fue separado y derivado del repositorio original (`jarbees front / products crud frd`) para evolucionar como una aplicación móvil experimental independiente centrada en el procesamiento local de lenguaje natural y ejecución determinista de acciones.
- **Preservación de Vistas Legadas**: Todas las vistas y módulos originales de productos y preguntas (`/products`, `/preguntas/new`, `/reader`) se mantienen intactos en la base de código y permanecen accesibles por URL para futuras integraciones más amplias.

---

### 🚀 Nuevas Capacidades Implementadas (V1 de JarBees Mobile)

#### 1. 🧠 Intent & Command Engine (`Qwen2.5-0.5B-Instruct`)
- Integración con el modelo local ultraligero (`zarigata/Qwen2.5-0.5B-Instruct:CRAZYMODE` / GGUF).
- Salida estricta en formato JSON con validación, extracción por Regex y sanitización de dominios (`device`, `audio`, `media`, `context`, `calculator`, `timer`, `connectivity`, `location`, `capabilities`, `jarbees`, `handoff`).
- Arquitectura desacoplada: El LLM propone la intención estructurada y el `Command Dispatcher` valida y ejecuta de forma determinista y segura en el dispositivo.

#### 2. 🎤 Entrada por Voz (Push-to-Talk y Tap-to-Talk)
- Botón central `[ HABLAR ]` con captura vía Web Speech API / micrófono.
- Detección de actividad de voz (*VAD de silencio ~1.4s*) para procesar automáticamente al terminar de hablar sin necesidad de un segundo toque.

#### 3. ⌨️ Entrada por Texto Directa
- Botón y barra de entrada rápida `[ ESCRIBIR UN COMANDO ]` siempre disponible para pruebas y depuración del intérprete sin depender del micrófono.

#### 4. 📱 Apertura de Aplicaciones
- Ejecución de intenciones de aplicaciones nativas y web:
  - `OPEN_CAMERA`: Abre la cámara del dispositivo con visor interactivo.
  - `OPEN_CALCULATOR`: Inicia la interfaz de calculadora.
  - `OPEN_BROWSER`: Abre el navegador web.
  - `OPEN_SETTINGS`: Abre el panel de ajustes y configuración.

#### 5. 🔊 Control de Audio y Reproducción de Medios
- Acciones de volumen relativas y absolutas: `VOLUME_UP`, `VOLUME_DOWN`, `SET_VOLUME`, `MUTE`, `SILENT`, `VIBRATE`.
- Control de música: `MEDIA_PLAY`, `MEDIA_PAUSE`, `MEDIA_NEXT`, `MEDIA_PREVIOUS`.
- Interpretación contextual: Comandos ambiguos como *"Bajalo un poco"* infieren automáticamente control de volumen musical según el estado activo de reproducción.

#### 6. 🔋 Consultas de Contexto del Teléfono (`DeviceContext`)
- Respuestas precisas a consultas individuales sobre el estado del hardware:
  - *"¿Cuánta batería tengo?"* → Nivel % y estado de carga.
  - *"¿Estoy cargando?"* → Estado de conexión eléctrica.
  - *"¿Tengo auriculares conectados?"* → Detección de salida de audio.
  - *"¿Qué hora es?"* → Hora local del dispositivo.

#### 7. 📊 Resumen Integral de "Estado del Dispositivo"
- Comando *"JarBees, ¿cómo está mi teléfono?"* genera una tarjeta visual estructurada con:
  - 🔋 Batería y estado de carga
  - 🔊 Nivel de volumen
  - 🎧 Conexión de auriculares
  - 🎵 Estado de reproducción musical
  - 📶 Estado de red (WiFi / Móvil / Offline)
  - 📱 Estado de pantalla
  - 🕐 Hora local

#### 8. 🧮 Cálculos Matemáticos Deterministas
- Interpretación de lenguaje natural hacia expresiones matemáticas estructuradas.
- Evaluador seguro determinista para operaciones aritméticas y porcentajes:
  - *"¿Cuánto es 1837 por 47?"* → `1837 * 47 = 86339`
  - *"Calculá cuánto me queda si descuento 21% de 1837"* → `1837 - 21% = 1451.23`
  - *"Si tengo 500 y gasto 137, ¿cuánto me queda?"* → `500 - 137 = 363`

#### 9. ⏱️ Temporizadores en Tiempo Real
- `CREATE_TIMER`, `CANCEL_TIMER`, `LIST_TIMERS`.
- Widget activo en la pantalla principal con barra de progreso, cuenta regresiva en segundos y botón de cancelación rápida.

#### 10. 📋 Descubrimiento de Capacidades (*Capability Discovery*)
- *"¿Qué podés hacer?"* → Detalla todas las capacidades locales en el teléfono y aclara la derivación a JarBees Core para tareas complejas.
- *"¿Qué puedo hacer sin Internet?"* → Enumera las funciones 100% locales y offline.

#### 11. 📶 Consulta de Conectividad (Read-Only)
- Consultas de estado: *"¿Estoy conectado a WiFi?"*, *"¿Tengo Internet?"*, *"¿Está activado Bluetooth?"*.

#### 12. 📍 Consulta de Ubicación GPS (Read-Only)
- *"¿Dónde estoy?"* → Obtiene y presenta coordenadas geográficas (Lat/Lon) mediante Geolocation API.

#### 13. 🌐 Búsqueda en Navegador
- *"Buscá perros en Internet"* → Construye la intención de búsqueda y abre el navegador con la consulta especificada.

#### 14. 🛠️ Panel de Diagnóstico y Modo Desarrollador (`Settings / Dev`)
- Telemetría en tiempo real: Latencia de inferencia en `ms`, confianza y visor del último Intent JSON.
- Simulador interactivo de variables de contexto (deslizadores de batería y volumen, interruptores de auriculares y música).
- Selector de proveedores: `ServerApiProvider` (Ollama/llama.cpp), `WebGpuLocalProvider` (On-Device WebGPU) y `RuleFallbackProvider` (Offline).

---

### 📦 Estructura de Nuevos Módulos
- `src/lib/jarbees-mobile/jarbeesMobile.types.ts`: Tipado TypeScript para intenciones, contexto y diagnósticos.
- `src/lib/jarbees-mobile/qwenInterpreter.ts`: Motor de interpretación con prompts few-shot y parser regex.
- `src/lib/jarbees-mobile/commandDispatcher.ts`: Despachador determinista, evaluador matemático y temporizadores.
- `src/lib/jarbees-mobile/deviceContext.ts`: Gestor reactivo de estado del dispositivo.
- `src/lib/jarbees-mobile/providers/`: Capa de abstracción de proveedores (`serverProvider`, `fallbackProvider`, `index`).
- `src/components/jarbees-mobile/`: Componentes UI Mobile-First (`JarBeesMobileApp`, `AudioOrbVisualizer`, `RecentActionsList`, `DiagnosticsDrawer`).
- `src/app/api/jarbees/interpret/route.ts`: API Route proxy para inferencia local con Ollama / Qwen 0.5B.
