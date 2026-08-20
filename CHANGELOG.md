# CHANGELOG - JarBees Mobile

## [v1.1.0-experimental] - 2026-08-20

### 🌐 Mobile → Core Protocol (`MobileGateway V1`)
- **Protocolo de Comunicación Mobile <-> Core**:
  - Implementación del servicio `src/lib/jarbees-mobile/services/mobileGateway.api.ts` para enviar intenciones estructuradas al backend NestJS (`POST /api/mobile/v1/command` y `GET /api/mobile/v1/capabilities`).
  - Respeto estricto de las reglas de workspace (`AGENTS.md`): Resolución de base URL mediante `NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000"` y política de header `"ngrok-skip-browser-warning": "69420"` solo en URLs que contienen `ngrok`.
  - Conexión directa abierta sin tokens para paridad con el frontend existente.
- **Detección de Estado de la PC en Tiempo Real (`CoreHealthStatus`)**:
  - Health check periódico (cada 20s) y manual hacia `GET /api/mobile/v1/health`.
  - Badge interactivo en la cabecera móvil: `🟢 Core 42ms` / `🔴 Core Offline` con reintento instantáneo.
- **CoreHandoffProvider**:
  - Nuevo proveedor de inferencia que delega comandos al backend Core cuando el usuario lo selecciona o cuando un comando requiere herramientas de la PC (`OPEN_APP`, `CALCULATE`, `GET_SYSTEM_STATUS`).
  - Fallback automático y transparente al motor local si la PC en casa está apagada.
- **Arquitectura de Referencia para NestJS Core**:
  - Módulo completo disponible en `docs/core-mobile-gateway/` (`mobile-gateway.controller.ts`, `mobile-gateway.service.ts`, `mobile-gateway.module.ts`, `README_CORE_SETUP.md`) listo para incorporar al Core de casa al encender la PC.
- **Corrección de GitHub Pages Deploy**:
  - Eliminada inyección de variables sensibles en `deploy.yml` que provocaba falsos positivos en el escáner de seguridad de GitHub.

---

## [v1.0.0-experimental] - 2026-08-20

### 🐝 Naturaleza y Origen del Proyecto
- **Tipo de Proyecto**: **JarBees Mobile** — Asistente inteligente y controlador de dispositivo en el borde (*Edge AI Command Interpreter*), diseñado para ejecutarse localmente en dispositivos móviles (e.g. Android / Moto G5 Plus / APK con `llama.cpp` + GGUF).
- **Origen**: Este proyecto fue separado y derivado del repositorio original (`jarbees front / products crud frd`) para evolucionar como una aplicación móvil experimental independiente centrada en el procesamiento local de lenguaje natural y ejecución determinista de acciones.
- **Preservación de Vistas Legadas**: Todas las vistas y módulos originales de productos y preguntas (`/products`, `/preguntas/new`, `/reader`) se mantienen intactos en la base de código y permanecen accesibles por URL para futuras integraciones más amplias.

---

### 🚀 Nuevas Capacidades Implementadas (V1 de JarBees Mobile)

#### 1. 🧠 Intent & Command Engine (`Qwen2.5-0.5B-Instruct` & Transformers.js WebGPU)
- Integración con el modelo local ultraligero (`zarigata/Qwen2.5-0.5B-Instruct:CRAZYMODE` / GGUF) y `@huggingface/transformers` con `onnx-community/Qwen2.5-0.5B-Instruct` (Q4 ONNX) en el navegador.
- Salida estricta en formato JSON con validación, extracción por Regex y sanitización de dominios (`device`, `audio`, `media`, `context`, `calculator`, `timer`, `connectivity`, `location`, `capabilities`, `jarbees`, `handoff`, `core`).
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
- Creación, listado y cancelación de temporizadores:
  - *"Poneme un temporizador de 18 minutos"* → Crea temporizador activo con widget y cuenta regresiva en segundos.
  - *"Cancelá los temporizadores"* → Limpieza de temporizadores activos.

#### 10. 📋 Capability Discovery
- Comando *"¿Qué podés hacer?"* o *"¿Qué puedo hacer sin Internet?"* genera tarjetas interactivas clasificando capacidades locales vs. remotas.

#### 11. 📶 Conectividad y Red
- Consultas sobre estado de WiFi, Bluetooth e Internet.

#### 12. 📍 Ubicación y GPS
- Consulta *"¿Dónde estoy?"* lee coordenadas reales del dispositivo.

#### 13. 📷 Integración con Cámara
- Lanzamiento de visor de cámara con acceso a `getUserMedia`.

#### 14. 🌐 Búsqueda Web Asistida
- *"Buscá perros en Internet"* abre el navegador con la consulta construida.

#### 15. 🔐 Sistema de Confirmaciones y Seguridad
- Diferenciación entre acciones inmediatas seguras y acciones con confirmación requerida.

#### 16. 🛠️ Developer Mode & Live Context Simulator
- Drawer lateral completo con:
  - Selector de motores (`Server`, `WebGPU`, `Core Gateway`, `Rule Fallback`).
  - Telemetría en vivo (latencia en `ms`, confianza del modelo).
  - Simulador de estado de hardware (sliders de batería, volumen, toggles de auriculares y música).
  - Inspector y copiado rápido de JSON estructurado generado por el LLM.
