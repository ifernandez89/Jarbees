// scripts/verify-jarbees-core.js
const { evaluateMathExpression, dispatchCommand } = require("../src/lib/jarbees-mobile/commandDispatcher");
const { getInterpreterProvider } = require("../src/lib/jarbees-mobile/providers");
const { sanitizeAndNormalizeIntent, extractJsonBlock } = require("../src/lib/jarbees-mobile/qwenInterpreter");

async function runTestSuite() {
  console.log("==================================================");
  console.log("🧪 INICIANDO BATERÍA DE TESTS: JARBEES MOBILE V1");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function assert(title, condition, details = "") {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${title}`);
    } else {
      console.error(`❌ [FAIL] ${title} - ${details}`);
    }
  }

  // 1. TEST: EVALUADOR MATEMÁTICO DETERMINISTA
  console.log("--- 1. Pruebas de Cálculos Matemáticos ---");
  const math1 = evaluateMathExpression("1837 * 47");
  assert("Multiplicación directa: 1837 * 47 = 86339", math1.result === 86339, `got: ${math1.result}`);

  const math2 = evaluateMathExpression("1837 - 21%");
  assert("Descuento de porcentaje: 1837 - 21% = 1451.23", math2.result === 1451.23, `got: ${math2.result}`);

  const math3 = evaluateMathExpression("500 - 137");
  assert("Resta: 500 - 137 = 363", math3.result === 363, `got: ${math3.result}`);

  const math4 = evaluateMathExpression("100 + 15%");
  assert("Recargo de porcentaje: 100 + 15% = 115", math4.result === 115, `got: ${math4.result}`);

  // 2. TEST: PARSER RESILIENTE Y NORMALIZADOR
  console.log("\n--- 2. Pruebas de Parser y Sanitización de JSON ---");
  const rawMarkdown = "```json\n{\"domain\": \"device\", \"action\": \"open_app\", \"target\": \"camera\"}\n```";
  const parsedBlock = extractJsonBlock(rawMarkdown);
  assert("Extracción de JSON con markdown code blocks", parsedBlock && parsedBlock.target === "camera");

  const normalized = sanitizeAndNormalizeIntent({ domain: "app_control", action: "toggle_light" }, "prendé la luz");
  assert("Normalización de dominio app_control -> device y toggle_light -> flashlight", 
    normalized.domain === "device" && normalized.action === "flashlight");

  // 3. TEST: RULE FALLBACK PROVIDER (OFFLINE ENGINE)
  console.log("\n--- 3. Pruebas del Motor de Reglas Offline ---");
  const fallbackProvider = getInterpreterProvider("fallback");
  const mockCtx = {
    battery: 72,
    charging: false,
    volume: 65,
    screen: "on",
    network: "WiFi",
    bluetooth: true,
    headphones: true,
    music: "playing",
    time: "13:42"
  };

  const r1 = await fallbackProvider.interpret("JarBees, abrí la cámara", mockCtx);
  assert("Intent: Abrir cámara", r1.intent.domain === "device" && r1.intent.target === "camera");

  const r2 = await fallbackProvider.interpret("Bajá un poco el volumen", mockCtx);
  assert("Intent: Bajar volumen", r2.intent.domain === "audio" && r2.intent.action === "volume_down");

  const r3 = await fallbackProvider.interpret("Calculá cuánto me queda si descuento 21% de 1837", mockCtx);
  assert("Intent: Cálculo de porcentaje", r3.intent.domain === "calculator" && r3.intent.action === "calculate");

  const r4 = await fallbackProvider.interpret("¿Cuánta batería tengo?", mockCtx);
  assert("Intent: Consulta de batería", r4.intent.domain === "context" && r4.intent.action === "battery_status");

  const r5 = await fallbackProvider.interpret("JarBees, ¿cómo está mi teléfono?", mockCtx);
  assert("Intent: Resumen de estado del teléfono", r5.intent.domain === "context" && r5.intent.action === "device_status");

  const r6 = await fallbackProvider.interpret("Poneme un temporizador de 18 minutos", mockCtx);
  assert("Intent: Crear temporizador 18m", r6.intent.domain === "timer" && r6.intent.duration_minutes === 18);

  const r7 = await fallbackProvider.interpret("¿Qué podés hacer?", mockCtx);
  assert("Intent: Descubrimiento de capacidades", r7.intent.domain === "capabilities");

  // 4. TEST: COMMAND DISPATCHER & CARD GENERATION
  console.log("\n--- 4. Pruebas de Despacho de Comandos ---");
  const { updateDeviceContext } = require("../src/lib/jarbees-mobile/deviceContext");
  updateDeviceContext(mockCtx);
  const d1 = await dispatchCommand(r5.intent, "JarBees, ¿cómo está mi teléfono?");
  assert("Dispatcher genera tarjeta de status_report", d1.cardType === "status_report" && d1.cardData.battery === 72);

  const d2 = await dispatchCommand(r3.intent, "Calculá cuánto me queda si descuento 21% de 1837");
  assert("Dispatcher genera resultado determinista = 1451.23", d2.cardType === "calculation" && d2.cardData.result === 1451.23);

  const d3 = await dispatchCommand(r6.intent, "Poneme un temporizador de 18 minutos");
  assert("Dispatcher crea temporizador en memoria", d3.cardType === "timer" && d3.cardData.timer.durationSeconds === 1080);

  const d4 = await dispatchCommand(r7.intent, "¿Qué podés hacer?");
  assert("Dispatcher lista capacidades en el teléfono", d4.cardType === "capabilities" && d4.cardData.capabilities.length > 0);

  // RESUMEN
  console.log("\n==================================================");
  console.log(`📊 RESULTADO FINAL: ${passed} / ${total} TESTS SUPERADOS (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================");

  if (passed === total) {
    console.log("🎉 ¡Todos los tests pasaron exitosamente! Listo para push.");
  } else {
    process.exit(1);
  }
}

runTestSuite();
