/**
 * Script para criar o usuário Master (Administrador)
 * 
 * Uso: node scripts/create-master-user.mjs
 * 
 * Este script cria o usuário administrador principal do sistema ChatLead Pro
 */

import pg from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const { Pool } = pg;

// Configuração do usuário Master
const MASTER_USER = {
  email: 'rafael@chatleadpro.com.br',
  password: '11031998Ra@',
  name: 'Rafael Gustavo Correa',
  role: 'admin',
};

function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

async function createMasterUser() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não está definida');
    console.log('Por favor, defina a variável de ambiente DATABASE_URL');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    // Verificar se usuário já existe
    const existingUser = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [MASTER_USER.email]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.log(`⚠️  Usuário já existe: ${user.email}`);
      
      // Atualizar para admin se não for
      if (user.role !== 'admin') {
        await pool.query(
          'UPDATE users SET role = $1 WHERE id = $2',
          ['admin', user.id]
        );
        console.log('✅ Usuário atualizado para role: admin');
      } else {
        console.log('✅ Usuário já é administrador');
      }
      
      // Atualizar senha
      const passwordHash = await bcrypt.hash(MASTER_USER.password, 10);
      await pool.query(
        'UPDATE users SET "passwordHash" = $1, "emailVerified" = true WHERE id = $2',
        [passwordHash, user.id]
      );
      console.log('✅ Senha atualizada');
      
      return;
    }

    // Criar novo usuário
    console.log('🔄 Criando usuário Master...');
    
    const passwordHash = await bcrypt.hash(MASTER_USER.password, 10);
    const apiKey = generateApiKey();
    
    const result = await pool.query(
      `INSERT INTO users (
        email, 
        name, 
        role, 
        "passwordHash", 
        "loginMethod", 
        "apiKey", 
        "emailVerified",
        "createdAt",
        "updatedAt",
        "lastSignedIn"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
      RETURNING id, email, name, role`,
      [
        MASTER_USER.email,
        MASTER_USER.name,
        MASTER_USER.role,
        passwordHash,
        'email',
        apiKey,
        true // Email já verificado para o admin
      ]
    );

    const newUser = result.rows[0];
    
    console.log('');
    console.log('✅ ========================================');
    console.log('✅ USUÁRIO MASTER CRIADO COM SUCESSO!');
    console.log('✅ ========================================');
    console.log('');
    console.log('📧 Email:', MASTER_USER.email);
    console.log('🔑 Senha:', MASTER_USER.password);
    console.log('👤 Nome:', newUser.name);
    console.log('🛡️  Role:', newUser.role);
    console.log('🆔 ID:', newUser.id);
    console.log('');
    console.log('Você pode fazer login em /login com estas credenciais.');
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar
createMasterUser()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
