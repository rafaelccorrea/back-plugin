#!/usr/bin/env node

/**
 * Script para inserir usuário admin no banco de dados
 * Usa Drizzle ORM para inserir diretamente
 * 
 * Uso: node scripts/insert-admin-user.mjs
 */

import { drizzle } from 'drizzle-orm/mysql2/driver';
import { createPool } from 'mysql2/promise';
import { users } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';

// Configurar conexão
const pool = createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'webdev_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const db = drizzle(pool);

async function insertAdminUser() {
  try {
    console.log('🔄 Inserindo usuário admin...\n');

    // Hash bcrypt da senha '11031998Ra@'
    const passwordHash = '$2b$10$AQtjtK4pBU9EtbcMhncFfeG3VJUpItXDDrBjS/tOi4/gT5BLvREle';
    const apiKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    // Verificar se usuário já existe
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'rafael@chatleadpro.com.br'))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('⚠️  Usuário já existe. Atualizando...\n');
      
      // Atualizar usuário existente
      await db
        .update(users)
        .set({
          role: 'admin',
          name: 'Rafael Gustavo Correa',
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.email, 'rafael@chatleadpro.com.br'));
    } else {
      console.log('✅ Criando novo usuário admin...\n');
      
      // Inserir novo usuário
      await db.insert(users).values({
        email: 'rafael@chatleadpro.com.br',
        name: 'Rafael Gustavo Correa',
        role: 'admin',
        passwordHash,
        loginMethod: 'email',
        apiKey,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      });
    }

    // Verificar resultado
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, 'rafael@chatleadpro.com.br'))
      .limit(1);

    if (result.length > 0) {
      const user = result[0];
      console.log('✅ ========================================');
      console.log('✅ USUÁRIO ADMIN CRIADO COM SUCESSO!');
      console.log('✅ ========================================\n');
      console.log('📧 Email:', user.email);
      console.log('👤 Nome:', user.name);
      console.log('🛡️  Role:', user.role);
      console.log('🆔 ID:', user.id);
      console.log('✅ Email Verificado:', user.emailVerified);
      console.log('\n🔑 Credenciais de Login:');
      console.log('   Email: rafael@chatleadpro.com.br');
      console.log('   Senha: 11031998Ra@');
      console.log('\nVocê pode fazer login em /login com estas credenciais.\n');
    } else {
      console.error('❌ Erro: Usuário não foi criado');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erro ao inserir usuário:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar
insertAdminUser();
