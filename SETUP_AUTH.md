# Guia de Configuração - Sistema de Autenticação Melhorado

## 🎉 Melhorias Implementadas

Este documento descreve as melhorias implementadas no sistema de autenticação do WA-SDR e como configurá-las.

### ✨ Novas Funcionalidades

1. **Login com Google OAuth** - Autenticação rápida e segura via Google
2. **Registro com Email/Senha** - Criação de conta tradicional com validação forte de senha
3. **Verificação de Email** - Sistema de verificação por email com tokens seguros
4. **Recuperação de Senha** - Fluxo completo de "Esqueci minha senha"
5. **Validação de Senha Forte** - Requisitos de segurança para senhas
6. **Múltiplos Métodos de Login** - Suporte para Manus OAuth, Google OAuth e Email/Senha

## 📋 Pré-requisitos

Antes de começar, você precisará configurar:

1. **Banco de Dados PostgreSQL** (Supabase ou outro)
2. **Google Cloud Console** (para OAuth)
3. **Resend** (para envio de emails)
4. **Manus OAuth** (já existente)

## 🔧 Configuração Passo a Passo

### 1. Configurar Google OAuth

#### 1.1. Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá para **APIs & Services** > **Credentials**
4. Clique em **Create Credentials** > **OAuth client ID**
5. Escolha **Web application**
6. Configure:
   - **Name**: WA-SDR
   - **Authorized JavaScript origins**: 
     - `http://localhost:5000` (desenvolvimento)
     - `https://seu-dominio.com` (produção)
   - **Authorized redirect URIs**:
     - `http://localhost:5000/api/oauth/google/callback` (desenvolvimento)
     - `https://seu-dominio.com/api/oauth/google/callback` (produção)
7. Copie o **Client ID** e **Client Secret**

#### 1.2. Atualizar .env

```env
GOOGLE_CLIENT_ID=seu_google_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_google_client_secret_aqui
GOOGLE_CALLBACK_URL=http://localhost:5000/api/oauth/google/callback
```

### 2. Configurar Resend (Serviço de Email)

#### 2.1. Criar Conta no Resend

1. Acesse [Resend](https://resend.com/)
2. Crie uma conta gratuita
3. Verifique seu domínio (ou use o domínio de teste)
4. Gere uma API Key em **Settings** > **API Keys**

#### 2.2. Atualizar .env

```env
RESEND_API_KEY=re_sua_api_key_aqui
FROM_EMAIL=WA-SDR <noreply@seu-dominio.com>
```

**Nota**: No plano gratuito do Resend, você pode usar o domínio de teste `onboarding@resend.dev` para desenvolvimento.

### 3. Configurar Banco de Dados

#### 3.1. Aplicar Migrations

```bash
cd /home/ubuntu/whatsapp-lead-plugin
pnpm drizzle-kit push
```

Isso criará todas as tabelas necessárias no seu banco PostgreSQL.

#### 3.2. Verificar Tabelas Criadas

As seguintes tabelas serão criadas:
- `users` - Com novos campos para autenticação
- `organizations`
- `plans`
- `subscriptions`
- `usage_tracking`
- `leads`
- `lead_activities`
- `rate_limit_log`
- `push_subscriptions`
- `notifications`

### 4. Configurar URLs da Aplicação

```env
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5000
```

Para produção, altere para seu domínio real:

```env
APP_URL=https://seu-dominio.com
FRONTEND_URL=https://seu-dominio.com
```

## 🚀 Executar a Aplicação

### Desenvolvimento

```bash
cd /home/ubuntu/whatsapp-lead-plugin
pnpm install
pnpm dev
```

A aplicação estará disponível em `http://localhost:5000`

### Produção

```bash
pnpm build
pnpm start
```

## 📱 Testando as Funcionalidades

### 1. Registro com Email/Senha

1. Acesse `http://localhost:5000/register`
2. Preencha o formulário com:
   - Nome (opcional)
   - Email
   - Senha (deve atender aos requisitos)
   - Confirmação de senha
3. Clique em "Criar conta"
4. Verifique seu email para o link de verificação
5. Clique no link de verificação
6. Faça login em `http://localhost:5000/login`

### 2. Login com Google

1. Acesse `http://localhost:5000/login`
2. Clique em "Continuar com Google"
3. Selecione sua conta Google
4. Autorize a aplicação
5. Você será redirecionado para o dashboard

### 3. Recuperação de Senha

1. Acesse `http://localhost:5000/forgot-password`
2. Digite seu email
3. Clique em "Enviar instruções"
4. Verifique seu email
5. Clique no link de recuperação
6. Digite sua nova senha
7. Faça login com a nova senha

## 🔐 Requisitos de Senha

Para garantir a segurança, as senhas devem ter:

- ✅ Mínimo 8 caracteres
- ✅ Pelo menos 1 letra maiúscula
- ✅ Pelo menos 1 letra minúscula
- ✅ Pelo menos 1 número
- ✅ Pelo menos 1 caractere especial (!@#$%^&*...)

## 🎨 Novas Páginas

As seguintes páginas foram criadas:

- `/login` - Página de login unificada
- `/register` - Página de registro
- `/forgot-password` - Solicitar recuperação de senha
- `/reset-password` - Redefinir senha com token
- `/verify-email` - Verificar email com token

## 🔄 Fluxos de Autenticação

### Fluxo de Registro

```
1. Usuário preenche formulário de registro
2. Sistema valida dados e cria conta
3. Email de verificação é enviado
4. Usuário clica no link de verificação
5. Email é verificado
6. Usuário pode fazer login
```

### Fluxo de Login

```
1. Usuário escolhe método de login:
   a) Email/Senha
   b) Google OAuth
   c) Manus OAuth (existente)
2. Sistema valida credenciais
3. Sessão é criada
4. Usuário é redirecionado para dashboard
```

### Fluxo de Recuperação de Senha

```
1. Usuário solicita recuperação
2. Sistema gera token único
3. Email com link é enviado
4. Usuário clica no link (válido por 1 hora)
5. Token é validado
6. Usuário define nova senha
7. Senha é atualizada
8. Usuário pode fazer login
```

## 🔒 Segurança

### Medidas Implementadas

1. **Bcrypt** - Hashing de senhas com cost factor 12
2. **Tokens Seguros** - Gerados com `crypto.randomBytes()`
3. **Expiração de Tokens**:
   - Verificação de email: 24 horas
   - Reset de senha: 1 hora
4. **Validação de Senha Forte** - Requisitos obrigatórios
5. **Proteção de Dados** - Emails não revelados em erros
6. **HTTPS** - Obrigatório em produção

### Boas Práticas

- ✅ Nunca armazene senhas em texto plano
- ✅ Use HTTPS em produção
- ✅ Mantenha as chaves secretas seguras
- ✅ Rotacione tokens regularmente
- ✅ Monitore tentativas de login suspeitas

## 📊 Estrutura do Banco de Dados

### Campos Adicionados à Tabela `users`

```sql
-- Autenticação com senha
password_hash VARCHAR(255)
email_verified BOOLEAN DEFAULT false
email_verification_token VARCHAR(255)
email_verification_expires TIMESTAMP
password_reset_token VARCHAR(255)
password_reset_expires TIMESTAMP

-- Google OAuth
google_id VARCHAR(255) UNIQUE

-- Campos modificados
open_id VARCHAR(64) UNIQUE  -- Agora nullable
api_key VARCHAR(128) UNIQUE  -- Agora nullable
```

## 🐛 Troubleshooting

### Email não está sendo enviado

1. Verifique se `RESEND_API_KEY` está configurada
2. Verifique se o domínio está verificado no Resend
3. Verifique os logs do servidor para erros

### Google OAuth não funciona

1. Verifique se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão corretos
2. Verifique se a URL de callback está registrada no Google Cloud Console
3. Verifique se as origens autorizadas estão corretas

### Erro de conexão com banco de dados

1. Verifique se `DATABASE_URL` está correta
2. Verifique se o banco PostgreSQL está acessível
3. Execute as migrations: `pnpm drizzle-kit push`

### Token expirado

- Tokens de verificação de email expiram em 24 horas
- Tokens de reset de senha expiram em 1 hora
- Solicite um novo token se necessário

## 📝 Variáveis de Ambiente Completas

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:port/database"

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/oauth/google/callback

# Email Service (Resend)
RESEND_API_KEY=re_your_api_key
FROM_EMAIL=WA-SDR <noreply@wa-sdr.com>

# App URLs
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5000

# JWT Secret
JWT_SECRET=your_secure_random_string_here

# Manus OAuth (existing)
VITE_APP_ID=your_manus_app_id
OAUTH_SERVER_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
VITE_OAUTH_PORTAL_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev
BUILT_IN_FORGE_API_KEY=your_forge_api_key
BUILT_IN_FORGE_API_URL=https://nonmetallic-belinda-thankless.ngrok-free.dev

# Stripe (existing)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

## 🎯 Próximos Passos

1. Configure as credenciais do Google OAuth
2. Configure a API key do Resend
3. Execute as migrations do banco
4. Teste todos os fluxos de autenticação
5. Configure domínio e SSL para produção
6. Customize os templates de email

## 📞 Suporte

Para dúvidas ou problemas:
- Verifique este guia
- Consulte a documentação do projeto
- Abra uma issue no repositório

---

**Desenvolvido com ❤️ para o WA-SDR**
