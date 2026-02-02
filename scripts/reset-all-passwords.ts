/**
 * Reseta a senha de TODOS os usuários para um valor fixo e gera um novo JWT_SECRET.
 * Útil após perda do JWT secret ou recuperação de acesso.
 * Uso: npx tsx scripts/reset-all-passwords.ts
 */

import "dotenv/config";
import { randomBytes } from "crypto";
import { Pool } from "pg";
import { hashPassword } from "../server/services/passwordService";

const NEW_PASSWORD = "11031998Ra@";

function generateNewJwtSecret(): string {
  return randomBytes(32).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const LOG = (msg: string, ...args: unknown[]) => console.log("[Reset]", msg, ...args);

async function main() {
  LOG("═══════════════════════════════════════════════════════════");
  LOG("Início: reset de senhas + novo JWT_SECRET");
  LOG("═══════════════════════════════════════════════════════════");

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[Reset] ❌ Defina DATABASE_URL ou DIRECT_URL no .env");
    process.exit(1);
  }
  LOG("DATABASE_URL/DIRECT_URL definido, conectando...");

  const pool = new Pool({ connectionString });
  const newJwtSecret = generateNewJwtSecret();
  LOG("Novo JWT_SECRET gerado (será exibido ao final)");

  try {
    LOG("Gerando hash da nova senha (bcrypt, 12 rounds)...");
    const newHash = await hashPassword(NEW_PASSWORD);
    LOG("Hash gerado, primeiros 20 chars:", newHash.slice(0, 20) + "...");

    LOG("Listando usuários...");
    const listRes = await pool.query(
      `SELECT id, email FROM users`
    );
    const all = listRes.rows as { id: number; email: string | null }[];
    LOG("Usuários encontrados:", all.length);

    if (all.length === 0) {
      LOG("Nenhum usuário no banco.");
    } else {
      // Tentar camelCase primeiro (coluna "passwordHash"), depois snake_case ("password_hash")
      let useCamelCase = true;
      for (const u of all) {
        try {
          if (useCamelCase) {
            await pool.query(
              `UPDATE users SET "passwordHash" = $1, "updatedAt" = $2 WHERE id = $3`,
              [newHash, new Date(), u.id]
            );
          } else {
            await pool.query(
              `UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3`,
              [newHash, new Date(), u.id]
            );
          }
        } catch (e) {
          if (useCamelCase) {
            useCamelCase = false;
            await pool.query(
              `UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3`,
              [newHash, new Date(), u.id]
            );
          } else {
            throw e;
          }
        }
        LOG("  ✓ senha atualizada:", u.email ?? "(sem email)", "id=" + u.id);
      }
      LOG("Total:", all.length, "usuário(s) com nova senha definida");
    }

    LOG("═══════════════════════════════════════════════════════════");
    LOG("NOVO JWT_SECRET (copie para backend/.env e frontend/.env):");
    LOG("═══════════════════════════════════════════════════════════");
    console.log(`JWT_SECRET=${newJwtSecret}`);
    LOG("═══════════════════════════════════════════════════════════");
    LOG("Próximos passos: atualizar .env, reiniciar backend/frontend.");
    LOG("Fim do fluxo de reset.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Erro:", msg);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
