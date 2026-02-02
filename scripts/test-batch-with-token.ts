/**
 * Obtém token via login (procedure), depois chama o batch auth.me + leads.list com Authorization.
 * Uso: npx tsx scripts/test-batch-with-token.ts
 */
import "dotenv/config";
import http from "http";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

const EMAIL = "rafael@chatleadpro.com.br";
const PASSWORD = "11031998Ra@";

function createMockContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "http", headers: {}, get: () => undefined } as TrpcContext["req"],
    res: { cookie: () => {} } as TrpcContext["res"],
  };
}

const API_PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 5000);

function httpGet(path: string, authToken: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "localhost", port: API_PORT, path, method: "GET", headers: { Authorization: `Bearer ${authToken}` } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, data }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  console.log("[Test:Batch] Login para obter token...");
  const ctx = createMockContext();
  const caller = appRouter.createCaller(ctx);
  const loginResult = await caller.auth.login({ email: EMAIL, password: PASSWORD });
  const token = loginResult.accessToken;
  if (!token) {
    console.error("[Test:Batch] Sem accessToken");
    process.exit(1);
  }
  console.log("[Test:Batch] Token obtido, length =", token.length);

  const input = {
    "0": { json: null, meta: { values: ["undefined"], v: 1 } },
    "1": { json: { limit: 100, offset: 0 } },
  };
  const path = `/api/trpc/auth.me,leads.list?batch=1&input=${encodeURIComponent(JSON.stringify(input))}`;
  console.log("[Test:Batch] GET batch com Authorization: Bearer ... (porta", API_PORT + ")");
  const res = await httpGet(path, token);
  console.log("[Test:Batch] Status:", res.status);

  let parsed: unknown;
  try {
    parsed = JSON.parse(res.data);
  } catch {
    console.log("[Test:Batch] Body (primeiros 300 chars):", res.data.slice(0, 300));
    process.exit(1);
  }
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  const me = (arr[0] as { result?: { data?: { json?: unknown } }; error?: { json?: { message?: string } } })?.result?.data?.json ?? (arr[0] as { error?: { json?: { message?: string } } })?.error?.json?.message;
  const leads = (arr[1] as { result?: { data?: { json?: unknown } }; error?: { json?: { message?: string } } })?.result?.data?.json ?? (arr[1] as { error?: { json?: { message?: string } } })?.error?.json?.message;

  if (me != null && typeof me === "object" && "email" in me) {
    console.log("[Test:Batch] auth.me OK:", (me as { email?: string }).email);
  } else {
    console.log("[Test:Batch] auth.me:", me === null ? "null (não autenticado)" : String(me));
  }
  if (Array.isArray(leads)) {
    console.log("[Test:Batch] leads.list OK:", leads.length, "leads");
  } else {
    console.log("[Test:Batch] leads.list:", typeof leads === "string" ? leads : JSON.stringify(leads)?.slice(0, 100));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
