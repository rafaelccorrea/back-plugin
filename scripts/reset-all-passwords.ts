/**
 * Reseta a senha de TODOS os usuários para um valor fixo.
 * Útil após perda do JWT secret ou recuperação de acesso.
 * Uso: npx tsx scripts/reset-all-passwords.ts
 */

import "dotenv/config";
import { Pool } from "pg";
import { hashPassword } from "../server/services/passwordService";

const NEW_PASSWORD = "11031998Ra@";

async function main() {
  console.log("🔐 Resetando senha de todos os usuários...\n");

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ Defina DATABASE_URL ou DIRECT_URL no .env");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    const newHash = await hashPassword(NEW_PASSWORD);
    console.log("✅ Senha hasheada. Atualizando usuários...\n");

    const listRes = await pool.query(
      `SELECT id, email FROM users`
    );
    const all = listRes.rows as { id: number; email: string | null }[];
    if (all.length === 0) {
      console.log("⚠️ Nenhum usuário encontrado no banco.\n");
      return;
    }

    let useSnakeCase = true;
    for (const u of all) {
      try {
        if (useSnakeCase) {
          await pool.query(
            `UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3`,
            [newHash, new Date(), u.id]
          );
        } else {
          await pool.query(
            `UPDATE users SET "passwordHash" = $1, "updatedAt" = $2 WHERE id = $3`,
            [newHash, new Date(), u.id]
          );
        }
      } catch (e) {
        if (useSnakeCase) {
          useSnakeCase = false;
          await pool.query(
            `UPDATE users SET "passwordHash" = $1, "updatedAt" = $2 WHERE id = $3`,
            [newHash, new Date(), u.id]
          );
        } else {
          throw e;
        }
      }
      console.log(`   ✓ ${u.email ?? "(sem email)"} (id=${u.id})`);
    }

    console.log(`\n✅ Senha de ${all.length} usuário(s) alterada para: ${NEW_PASSWORD}\n`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Erro:", msg);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
