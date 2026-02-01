/**
 * Script para inserir ou promover usuário admin no banco de dados (PostgreSQL/Supabase)
 * Uso: npx tsx scripts/seed-admin.ts
 */

import "dotenv/config";
import { getDb, createUser, updateUser, getUserByEmail } from "../server/db";
import { hashPassword } from "../server/services/authService";

const ADMIN_EMAIL = "rafael@chatleadpro.com.br";
const ADMIN_PASSWORD = "11031998Ra@";
const ADMIN_NAME = "Rafael Gustavo Correa";

async function seedAdmin() {
  try {
    console.log("🔄 Iniciando seed de usuário admin...\n");

    const db = await getDb();
    if (!db) {
      console.error("❌ Banco de dados indisponível. Verifique DATABASE_URL no .env");
      process.exit(1);
    }

    const existingUser = await getUserByEmail(ADMIN_EMAIL);

    if (existingUser) {
      console.log("⚠️  Usuário já existe. Atualizando role para admin...\n");
      await updateUser(existingUser.id, {
        role: "admin",
        name: ADMIN_NAME,
        emailVerified: true,
      });
      console.log("✅ Usuário atualizado para admin!\n");
    } else {
      console.log("✅ Criando novo usuário admin...\n");
      const passwordHash = await hashPassword(ADMIN_PASSWORD);
      await createUser({
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        role: "admin",
        emailVerified: true,
        loginMethod: "email",
      });
      console.log("✅ Usuário admin criado com sucesso!\n");
    }

    const user = await getUserByEmail(ADMIN_EMAIL);
    if (user) {
      console.log("========================================");
      console.log("✅ USUÁRIO ADMIN CRIADO/ATUALIZADO COM SUCESSO!");
      console.log("========================================\n");
      console.log("📧 Email:", user.email);
      console.log("👤 Nome:", user.name);
      console.log("🛡️  Role:", user.role);
      console.log("🆔 ID:", user.id);
      console.log("✅ Email Verificado:", user.emailVerified);
      console.log("\n🔐 Credenciais de Login:");
      console.log("   Email:", ADMIN_EMAIL);
      console.log("   Senha:", ADMIN_PASSWORD);
      console.log("\n✨ Você pode fazer login agora!\n");
    } else {
      console.error("❌ Erro: Usuário não foi encontrado após seed");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Erro ao inserir usuário admin:", error);
    process.exit(1);
  }
}

seedAdmin();
