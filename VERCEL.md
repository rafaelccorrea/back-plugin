# Deploy na Vercel

O projeto está preparado para deploy na Vercel. O frontend (Vite/React) é servido como estático e a API (Express/tRPC, OAuth, webhooks) roda como **Serverless Function**.

## Deploy full stack (recomendado)

Use a **raiz do repositório** como Root Directory na Vercel. O `vercel.json` e a pasta `api/` na raiz fazem o build do backend e do frontend e expõem a API. Veja `VERCEL_DEPLOY.md` na raiz.

## Deploy apenas do backend

Se quiser só a API na Vercel, use **Root Directory = `backend`**. Neste diretório:

- **Build:** `pnpm build` (gera `dist/api-handler.js`)
- **Output:** não usado (a API é servida pela função)
- **API:** `api/[[...path]].js` importa o app Express do bundle `dist/api-handler.js`

## Variáveis de ambiente

Configure no dashboard da Vercel (Settings → Environment Variables) as mesmas variáveis do `.env`:

- `DATABASE_URL` (PostgreSQL, ex.: Supabase com connection pooling)
- `DIRECT_URL` (para migrations)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `RESEND_API_KEY`, `FROM_EMAIL`
- `APP_URL`, `FRONTEND_URL` (use a URL do deploy, ex. `https://seu-app.vercel.app`)
- Demais variáveis usadas pelo app (Stripe, JWT, etc.)

**Importante:** em produção, use `APP_URL` e `FRONTEND_URL` com a URL final do app (ex. `https://seu-dominio.vercel.app`) e ajuste `GOOGLE_CALLBACK_URL` para `https://seu-dominio.vercel.app/api/oauth/google/callback`.

## WebSocket na Vercel

O **WebSocket** (`/api/ws`) **não é suportado** no modelo serverless da Vercel. No deploy na Vercel:

- O servidor **não** inicia o WebSocket (detecta `VERCEL` e pula `setupWebSocket`).
- Notificações em tempo real que dependem do WS não funcionarão na Vercel.

Para ter WebSocket em produção, use um servidor Node (VPS, Railway, Render, etc.) com `pnpm build` e `pnpm start`, onde o WebSocket é ativado normalmente.

## Deploy

1. Conecte o repositório ao projeto na Vercel.
2. Defina as variáveis de ambiente.
3. O build e o output já estão configurados em `vercel.json`.
4. Faça o deploy (push ou deploy manual).

Para testar localmente com o mesmo comportamento da Vercel:

```bash
vercel dev
```

## Estrutura no deploy

- **Rotas estáticas** (/, /login, etc.): servidas por `dist/public` com fallback SPA para `index.html`.
- **Rotas /api/\***: tratadas pela Serverless Function que usa o app Express (tRPC, OAuth, webhooks Stripe, etc.).
