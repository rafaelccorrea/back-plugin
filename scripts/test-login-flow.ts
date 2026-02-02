/**
 * Testa o fluxo completo: reset de senha → login (chamando o procedure diretamente).
 * Uso: npx tsx scripts/test-login-flow.ts
 */

import "dotenv/config";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

const EMAIL = "rafael@chatleadpro.com.br";
const PASSWORD = "11031998Ra@";

function createMockContext(): TrpcContext {
  const cookieCalls: { name: string; value: string; options: Record<string, unknown> }[] = [];
  return {
    user: null,
    req: {
      protocol: "http",
      headers: {},
      get: () => undefined,
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options?: Record<string, unknown>) => {
        cookieCalls.push({ name, value, options: options ?? {} });
      },
    } as TrpcContext["res"],
  };
}

async function main() {
  console.log("[Test:Login] ═══════════════════════════════════════");
  console.log("[Test:Login] Testando fluxo de login (procedure direto)");
  console.log("[Test:Login] Email:", EMAIL);
  console.log("[Test:Login] ═══════════════════════════════════════\n");

  const ctx = createMockContext();
  const caller = appRouter.createCaller(ctx);

  try {
    const result = await caller.auth.login({ email: EMAIL, password: PASSWORD });
    console.log("[Test:Login] ✅ Login OK");
    console.log("[Test:Login] success:", result.success);
    console.log("[Test:Login] message:", result.message);
    console.log("[Test:Login] user:", result.user?.email, "id=" + result.user?.id);
    console.log("[Test:Login] accessToken length:", result.accessToken?.length ?? 0);
    console.log("[Test:Login] refreshToken length:", result.refreshToken?.length ?? 0);
    console.log("\n[Test:Login] ═══════════════════════════════════════");
    console.log("[Test:Login] Fluxo de login concluído com sucesso.");
    console.log("[Test:Login] ═══════════════════════════════════════");
  } catch (err) {
    console.error("[Test:Login] ❌ Erro no login:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

main();
