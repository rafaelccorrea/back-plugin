import { createConnection } from 'mysql2/promise';

async function createAdminUser() {
  const connection = await createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'webdev_db'
  });

  try {
    const passwordHash = '$2b$10$AQtjtK4pBU9EtbcMhncFfeG3VJUpItXDDrBjS/tOi4/gT5BLvREle';
    
    const [result] = await connection.execute(
      `INSERT INTO users (
        email, name, role, passwordHash, loginMethod, apiKey, emailVerified, createdAt, updatedAt, lastSignedIn
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        role = 'admin',
        name = 'Rafael Gustavo Correa',
        emailVerified = true,
        updatedAt = NOW()`,
      [
        'rafael@chatleadpro.com.br',
        'Rafael Gustavo Correa',
        'admin',
        passwordHash,
        'email',
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        true
      ]
    );
    
    console.log('✅ Usuário admin criado/atualizado com sucesso!');
    console.log('📧 Email: rafael@chatleadpro.com.br');
    console.log('🔑 Senha: 11031998Ra@');
    console.log('🛡️ Role: admin');
    
    const [rows] = await connection.execute(
      'SELECT id, email, name, role, emailVerified FROM users WHERE email = ?',
      ['rafael@chatleadpro.com.br']
    );
    
    if (rows.length > 0) {
      console.log('\n✅ Verificação bem-sucedida:');
      console.log(rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connection.end();
  }
}

createAdminUser();
