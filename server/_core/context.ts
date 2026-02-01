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
    // Tentar autenticação com JWT token primeiro
    const authHeader = opts.req.headers.authorization;
    console.log('[Context] Authorization header:', authHeader ? 'Presente' : 'Ausente');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      console.log('[Context] Token encontrado, verificando...');
      const payload = verifyJWT(token);
      
      if (payload) {
        console.log('[Context] Token válido, buscando usuário:', payload.userId);
        // Buscar usuário no banco de dados (converter userId para number)
        const userId = parseInt(payload.userId, 10);
        if (!isNaN(userId)) {
          user = await db.getUserById(userId);
        }
        console.log('[Context] Usuário encontrado:', user?.email);
      } else {
        // Token não é JWT válido: tentar como API Key (extensão Chrome)
        user = await db.getUserByApiKey(token);
        if (user) console.log('[Context] Usuário autenticado via API Key:', user.email);
        else console.log('[Context] Token inválido (nem JWT nem API Key)');
      }
    } else {
      console.log('[Context] Nenhum token Bearer encontrado');
    }
    
    // Se não encontrou com JWT, tentar com session cookie (Manus)
    if (!user) {
      console.log('[Context] Tentando autenticação com session cookie...');
      user = await sdk.authenticateRequest(opts.req);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    console.log('[Context] Erro na autenticação:', error instanceof Error ? error.message : String(error));
    user = null;
  }

  console.log('[Context] Usuário final:', user ? user.email : 'Não autenticado');

  return {
    req: opts.req,
    res: opts.res,
    user: user || null,
  };
}
