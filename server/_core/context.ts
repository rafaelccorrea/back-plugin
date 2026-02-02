import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyJWT } from "../services/authService";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null | undefined = undefined;

  try {
    const authHeaderFromReq = (opts as { authHeaderFromReq?: string }).authHeaderFromReq;
    let authValue: string | undefined = authHeaderFromReq;
    if (authValue == null && opts.req?.headers) {
      const reqHeaders = opts.req.headers as Headers | Record<string, string | string[] | undefined>;
      const authHeader =
        typeof (reqHeaders as Headers).get === "function"
          ? (reqHeaders as Headers).get("authorization")
          : (reqHeaders.authorization ?? reqHeaders["authorization"]);
      authValue = typeof authHeader === "string" ? authHeader : Array.isArray(authHeader) ? authHeader[0] : undefined;
    }
    console.log("[Auth:Context] Requisição recebida, Authorization:", authValue ? "Bearer presente" : "ausente");

    if (authValue && authValue.startsWith("Bearer ")) {
      const token = authValue.slice(7).trim();
      const looksLikeJwt = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
      console.log("[Auth:Context] Bearer token, formato JWT:", looksLikeJwt);

      if (looksLikeJwt) {
        const payload = verifyJWT(token);
        if (payload) {
          console.log("[Auth:Context] JWT válido, userId=" + payload.userId + " email=" + payload.email);
          const userId = parseInt(payload.userId, 10);
          if (!isNaN(userId)) {
            user = await db.getUserById(userId);
          }
          console.log("[Auth:Context] Usuário carregado:", user ? user.email : "não encontrado");
        } else {
          console.log("[Auth:Context] JWT inválido ou expirado – faça login novamente");
        }
      } else {
        console.log("[Auth:Context] Token não é JWT, tentando como API Key...");
        user = await db.getUserByApiKey(token);
        if (user) console.log("[Auth:Context] Autenticado via API Key:", user.email);
        else console.log("[Auth:Context] API Key inválida");
      }
    } else {
      console.log("[Auth:Context] Nenhum Bearer token");
    }

    const hadBearer = authValue?.startsWith("Bearer ");
    if (!user && !hadBearer) {
      console.log("[Auth:Context] Tentando session cookie (Manus)...");
      try {
        user = await sdk.authenticateRequest(opts.req);
        if (user) console.log("[Auth:Context] Autenticado via session cookie:", user.email);
      } catch {
        user = null;
      }
    }
  } catch (error) {
    console.log("[Auth:Context] Erro na autenticação:", error instanceof Error ? error.message : String(error));
    user = null;
  }

  console.log("[Auth:Context] Usuário final:", user ? user.email : "Não autenticado");

  return {
    req: opts.req,
    res: opts.res,
    user: user || null,
  };
}
