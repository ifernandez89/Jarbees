# Plan de Implementación: JarBees Mobile - Edge Command Interpreter (V1 Actualizado)

Transformación de la interfaz de JarBees hacia una aplicación asistente **Mobile-First**, impulsada por un intérprete de comandos ligero en el borde (**Qwen2.5-0.5B-Instruct**) con despacho estructurado de intenciones (Intents JSON), inyección de contexto del dispositivo, arquitectura desacoplada de proveedores (`InterpreterProvider`), robustez en parsing y panel de diagnóstico en tiempo real.

---

## 1. Arquitectura y Nuevas Consideraciones Técnicas

```mermaid
flowchart TD
    User([Usuario]) -->|Voz: Push-to-Talk / Tap con VAD| STT[Audio & Web Speech Engine]
    User -->|Texto rápido ⌨️| Input[Input Bar]
    
    STT --> AudioVisualizer[Visualizador de Onda / Ripple]
    AudioVisualizer --> ContextEngine[Device Context Engine\n(Batería, Auriculares, Volumen, Música, Hora)]
    Input --> ContextEngine

    ContextEngine --> ProviderRouter{InterpreterProvider Interface}
    ProviderRouter -->|Modo Server| ServerProvider[ServerApiProvider\n(/api/jarbees/interpret -> Ollama / llama.cpp)]
    ProviderRouter -->|Modo WebGPU / On-Device| WebGpuProvider[WebGpuLocalProvider / Wasm]
    ProviderRouter -->|Modo Fallback / Offline| MockProvider[RuleFallbackProvider]

    ServerProvider --> RobustParser[Extractor Regex + Normalizador Seguro + Fallback a Handoff]
    WebGpuProvider --> RobustParser
    MockProvider --> RobustParser

    RobustParser --> Dispatcher[Command Dispatcher]

    Dispatcher -->|domain: 'device' / 'audio' / 'media'| NativeActions[Control de Dispositivo / Simulación Android]
    Dispatcher -->|domain: 'context'| ContextQuery[Lectura y Respuesta de Estado]
    Dispatcher -->|domain: 'jarbees'| JarbeesState[Estado Asistente: Wake/Sleep/Status]
    Dispatcher -->|domain: 'handoff'| JarbeesCore[JarBees Core Backend / RAG]

    Dispatcher --> UIState[UI State: Acciones Recientes + Feedback Visual/Sonoro]
    Dispatcher --> DevMode[Developer Mode / Diagnostics Panel]
```

---

## 2. Pilares de Robustez e Innovación

### A. Parser Resiliente y Manejo de Errores JSON
- **Aislamiento por Regex:** Extracción segura de objetos `{ ... }` ignorando backticks markdown, preámbulos o texto residual.
- **Normalización de Dominios:** Sanitización de esquemas variantes (e.g. mapeo de `toggle_light` a `flashlight`, fusión inteligente de `media`/`audio`).
- **Safe Fallback:** Si la respuesta no es un JSON procesable o está corrupta, el `commandDispatcher` la encapsula como `{ domain: "handoff", query: userInput, reason: "parser_fallback" }` sin romper el ciclo de vida de la UI ni la experiencia de usuario.

### B. Capa de Abstracción `InterpreterProvider`
Diseño bajo el patrón Estrategia para admitir múltiples motores de ejecución:
1. **`ServerApiProvider`**: Consume `/api/jarbees/interpret` conectado al backend local (Ollama / llama-server / Qwen GGUF).
2. **`WebGpuLocalProvider`**: Preparado para ejecución on-device 100% en el navegador/celular vía WebGPU (Transformers.js / WebLLM).
3. **`RuleFallbackProvider`**: Motor offline inmediato basado en reglas para desarrollo, testing y escenarios sin conexión.
- *Permite seleccionar el proveedor activo al instante desde el Drawer de Configuración / Modo Desarrollador.*

### C. Voice Input con Detección de Silencio (VAD)
- **Push-to-Talk (Mantener pulsado):** Graba mientras el usuario mantiene el dedo presionado sobre el micrófono central.
- **Tap-to-Talk (Tocar una vez):** Activa el micrófono y aplica un temporizador de silencio (VAD simple ~1.5s de inactividad de voz) para disparar la inferencia automáticamente sin forzar un segundo toque.
- **Fallback a Texto:** Si los permisos de audio son denegados o no soportados, la barra de texto se activa fluidamente.

---

## 3. Contrato de Intenciones (Intent Schema)

| Dominio (`domain`) | Acciones representativas (`action`) | Ejemplo de salida JSON |
| :--- | :--- | :--- |
| **`device`** | `open_app`, `flashlight`, `toggle_wifi`, `toggle_bluetooth` | `{"domain": "device", "action": "open_app", "target": "camera"}` |
| **`audio`** | `volume_up`, `volume_down`, `set_volume`, `set_mode`, `mute` | `{"domain": "audio", "action": "volume_down", "amount": 20}` |
| **`media`** | `play`, `pause`, `next`, `previous`, `stop` | `{"domain": "media", "action": "play", "output": "headphones"}` |
| **`context`** | `headphones_status`, `battery_status`, `time_status`, `screen_status` | `{"domain": "context", "action": "battery_status"}` |
| **`jarbees`** | `wake`, `sleep`, `status` | `{"domain": "jarbees", "action": "status"}` |
| **`handoff`** | `query`, `complex_reasoning`, `knowledge_base` | `{"domain": "handoff", "query": "¿Qué expedientes tengo pendientes?", "reason": "rag_query"}` |

---

## 4. Estructura de Componentes y Archivos

### Modelos y Tipos
- #### [NEW] [jarbeesMobile.types.ts](file:///c:/next/Jarbees/src/lib/jarbees-mobile/jarbeesMobile.types.ts)
  - Tipos para `Intent`, `DeviceContext`, `AssistantState`, `RecentAction`, `DiagnosticsInfo`, `InterpreterProvider`.

### Intérprete y Proveedores
- #### [NEW] [providers/index.ts](file:///c:/next/Jarbees/src/lib/jarbees-mobile/providers/index.ts)
  - Interfaz `InterpreterProvider` y Factory.
- #### [NEW] [providers/serverProvider.ts](file:///c:/next/Jarbees/src/lib/jarbees-mobile/providers/serverProvider.ts)
  - Proveedor que consulta `/api/jarbees/interpret` (Ollama / Qwen2.5-0.5B local).
- #### [NEW] [providers/fallbackProvider.ts](file:///c:/next/Jarbees/src/lib/jarbees-mobile/providers/fallbackProvider.ts)
  - Proveedor offline por reglas y simulación de WebGPU.
- #### [NEW] [qwenInterpreter.ts](file:///c:/next/Jarbees/src/lib/jarbees-mobile/qwenInterpreter.ts)
  - Parser resiliente con extracción Regex, normalizador de JSON e integración de fallback seguro a Handoff.

### Contexto y Despacho de Comandos
- #### [NEW] [deviceContext.ts](file:///c:/next/Jarbees/src/lib/jarbees-mobile/deviceContext.ts)
  - Captura y simulación en tiempo real de batería, auriculares, audio, pantalla y hora.
- #### [NEW] [commandDispatcher.ts](file:///c:/next/Jarbees/src/lib/jarbees-mobile/commandDispatcher.ts)
  - Ejecutor de acciones (cámara, audio, linterna, vibración háptica, TTS) y enrutador de Handoff a JarBees Core.

### Interfaz Mobile-First (Voz + Texto + Diagnóstico)
- #### [NEW] [JarBeesMobileApp.tsx](file:///c:/next/Jarbees/src/components/jarbees-mobile/JarBeesMobileApp.tsx)
  - App principal con los 4 estados: Disponible, Escuchando, Pensando, Ejecutando.
- #### [NEW] [AudioOrbVisualizer.tsx](file:///c:/next/Jarbees/src/components/jarbees-mobile/AudioOrbVisualizer.tsx)
  - Orbe interactivo central con ondas reactivas de audio y efectos luminosos de pulso.
- #### [NEW] [DiagnosticsDrawer.tsx](file:///c:/next/Jarbees/src/components/jarbees-mobile/DiagnosticsDrawer.tsx)
  - Panel deslizable con telemetría en vivo, selector de Provider, visor JSON y modificador de Device Context.
- #### [NEW] [RecentActionsList.tsx](file:///c:/next/Jarbees/src/components/jarbees-mobile/RecentActionsList.tsx)
  - Tarjetas compactas de acciones ejecutadas recientemente.

### Backend Endpoint y Enrutamiento
- #### [NEW] [api/jarbees/interpret/route.ts](file:///c:/next/Jarbees/src/app/api/jarbees/interpret/route.ts)
  - API Route de Next.js que conecta de forma transparente con Ollama (`zarigata/Qwen2.5-0.5B-Instruct:CRAZYMODE`).
- #### [MODIFY] [page.tsx](file:///c:/next/Jarbees/src/app/page.tsx)
  - Renderiza `JarBeesMobileApp` como página de inicio principal.

*(Todos los archivos existentes de products y preguntas se mantienen intactos).*

---

## 5. Plan de Verificación

1. **Prueba End-to-End en Navegador / Mobile Viewport:**
   - Probar comando por voz con push-to-talk y tap-to-talk con VAD.
   - Probar comando por texto vía micro-barra retráctil.
2. **Verificación de Inferencia y Dispatcher:**
   - Validar ejecución de acciones locales (volumen, silencio, linterna simulada, consulta de batería).
   - Validar enrutamiento a Handoff para preguntas complejas.
3. **Verificación de Diagnóstico:**
   - Comprobar cambio de proveedor en tiempo real en el Drawer.
   - Modificar contexto de dispositivo en vivo y verificar respuesta adaptada (e.g. *"Bajalo un poco"*).
4. **Verificación de Build:**
   - `npm run build` o `next build` para garantizar ausencia de errores de compilación o tipado.
