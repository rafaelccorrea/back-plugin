/**
 * Debug: verifica se DB conecta e o que getUserByEmail retorna.
 * Uso: npx tsx scripts/debug-get-user.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import * as db from "../server/db";

const EMAIL = "rafael@chatleadpro.com.br";

async function main() {
  const conn = process.env.DIRECT_URL || process.env.DATABASE_URL;
  console.log("DATABASE_URL definido?", !!process.env.DATABASE_URL);
  console.log("DIRECT_URL definido?", !!process.env.DIRECT_URL);

  const pool = new Pool({ connectionString: conn });
  const raw = await pool.query('SELECT id, email, "passwordHash" IS NOT NULL as has_ph FROM users WHERE email = $1', [EMAIL]);
  console.log("Raw query users by email:", raw.rows);
  await pool.end();

  const user = await db.getUserByEmail(EMAIL);
  console.log("getUserByEmail result:", user ? { id: user.id, email: user.email, hasPasswordHash: !!user.passwordHash } : null);
}

main().catch(console.error);
