# 🛡️ Inserir Usuário Admin no Banco de Dados

## Credenciais do Admin

- **Email:** rafael@chatleadpro.com.br
- **Senha:** 11031998Ra@
- **Nome:** Rafael Gustavo Correa
- **Role:** admin
- **Hash Bcrypt:** $2b$10$AQtjtK4pBU9EtbcMhncFfeG3VJUpItXDDrBjS/tOi4/gT5BLvREle

---

## Opção 1: Via Script SQL (Recomendado)

### Passo 1: Executar o script SQL

```bash
# Se você tem acesso local ao MySQL
mysql -h localhost -u root -p webdev_db < scripts/seed-admin.sql

# Ou via cliente MySQL remoto
mysql -h seu-host.com -u seu-usuario -p sua-senha seu-banco < scripts/seed-admin.sql
```

### Passo 2: Verificar se foi criado

```sql
SELECT id, email, name, role, emailVerified, apiKey FROM users WHERE email = 'rafael@chatleadpro.com.br';
```

---

## Opção 2: Via Node.js Script

```bash
# Certifique-se de que o banco está rodando
npm run db:migrate

# Execute o script de seed
npx tsx scripts/seed-admin.ts
```

---

## Opção 3: Executar SQL Manualmente

Conecte ao seu banco de dados e execute:

```sql
INSERT INTO users (
    email,
    name,
    role,
    passwordHash,
    loginMethod,
    apiKey,
    emailVerified,
    createdAt,
    updatedAt,
    lastSignedIn
) VALUES (
    'rafael@chatleadpro.com.br',
    'Rafael Gustavo Correa',
    'admin',
    '$2b$10$AQtjtK4pBU9EtbcMhncFfeG3VJUpItXDDrBjS/tOi4/gT5BLvREle',
    'email',
    'admin_key_' || SUBSTRING(MD5(RAND()), 1, 20),
    true,
    NOW(),
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    role = 'admin',
    name = 'Rafael Gustavo Correa',
    emailVerified = true,
    updatedAt = NOW();
```

---

## ✅ Após Inserir o Admin

1. **Faça login** com as credenciais:
   - Email: rafael@chatleadpro.com.br
   - Senha: 11031998Ra@

2. **Acesse o painel admin** em `/admin`

3. **Recupere seu API Key** em:
   - Clique no seu perfil
   - Vá para "Configurações"
   - Copie o "API Key"

4. **Regenerar API Key** (se necessário):
   - Clique no botão "Regenerar API Key"
   - Uma nova chave será gerada

---

## 🔧 Troubleshooting

### Erro: "Usuário já existe"
- O usuário já foi criado anteriormente
- Use a opção "ON DUPLICATE KEY UPDATE" para atualizar o role para admin

### Erro: "Conexão recusada"
- Verifique se o banco de dados está rodando
- Verifique as credenciais de conexão
- Verifique o host/porta do banco

### Erro: "Tabela não existe"
- Execute as migrações primeiro: `npm run db:migrate`
- Depois execute o script de seed

---

## 📝 Notas

- O hash bcrypt fornecido é para a senha: `11031998Ra@`
- Se você quiser usar uma senha diferente, gere um novo hash:
  ```bash
  node -e "const bcrypt = require('bcrypt'); bcrypt.hash('sua-senha', 10).then(h => console.log(h))"
  ```
- O `apiKey` é gerado automaticamente no script SQL
- O usuário será criado com `emailVerified: true` para poder fazer login imediatamente

---

## 🚀 Próximos Passos

1. Inserir o admin no banco
2. Fazer login com as credenciais
3. Acessar o painel admin em `/admin`
4. Recuperar o API Key para usar na extensão Chrome
5. Testar a integração com o plugin
