// src/lib/jarbees-mobile/providers/coreHandoffProvider.ts
import { IInterpreterProvider, InterpreterResult, DeviceContext, Intent } from "../jarbeesMobile.types";
import { sendMobileCommand } from "../services/mobileGateway.api";
import { RuleFallbackProvider } from "./fallbackProvider";

export class CoreHandoffProvider implements IInterpreterProvider {
  id = "core";
  name = "JarBees Core Gateway (PC Desktop)";

  private fallback = new RuleFallbackProvider();

  async interpret(command: string, context: DeviceContext): Promise<InterpreterResult> {
    const startTime = Date.now();
    const localIntentRes = await this.fallback.interpret(command, context);
    const intentName = localIntentRes.intent.action || localIntentRes.intent.domain || "QUERY";

    // Enviar al MobileGateway del Core
    const gatewayRes = await sendMobileCommand(
      intentName,
      {
        query: command,
        ...localIntentRes.intent,
      },
      context,
      command
    );

    const latencyMs = Date.now() - startTime;

    if (gatewayRes.success) {
      const coreIntent: Intent = {
        domain: "core",
        action: gatewayRes.intent,
        ...gatewayRes.result,
        message: gatewayRes.message,
      };

      return {
        intent: coreIntent,
        rawText: JSON.stringify(gatewayRes, null, 2),
        latencyMs,
        provider: this.name,
      };
    }

    // Si el Core está apagado o falla, devolvemos el resultado local con notificación clara
    return {
      intent: {
        ...localIntentRes.intent,
        core_fallback: true,
        core_error: gatewayRes.message,
      },
      rawText: JSON.stringify({
        core_status: "offline",
        message: gatewayRes.message,
        local_intent: localIntentRes.intent,
      }, null, 2),
      latencyMs,
      provider: `${this.name} (Local Offline Fallback)`,
    };
  }
}
