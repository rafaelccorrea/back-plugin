# Onde está o quê – Front vs Back

Guia rápido para saber o que é frontend, backend e compartilhado neste monorepo.

---

## Resumo visual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (navegador / extensão)                                             │
│  client/          → app React (dashboard, login, leads, etc.)                 │
│  extension/       → extensão Chrome (WhatsApp Web)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  BACKEND (Node/Express na Vercel ou servidor)                                │
│  server/         → API Express + tRPC, OAuth, webhooks                       │
│  api/            → ponto de entrada serverless na Vercel (chama server/)    │
├─────────────────────────────────────────────────────────────────────────────┤
│  COMPARTILHADO (usado por front e back)                                      │
│  shared/         → tipos, constantes, validadores                            │
│  drizzle/        → schema do banco e migrations                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## FRONTEND

| O quê | Onde | Descrição |
|------|------|-----------|
| **App web (SPA)** | `client/` | React + Vite. Telas: login, leads, agendamentos, integrações, billing, etc. |
| **Entry** | `client/index.html`, `client/src/main.tsx` | HTML de entrada e bootstrap do React. |
| **Páginas** | `client/src/pages/` | Uma pasta por tela (Login, Leads, Settings, etc.). |
| **Componentes** | `client/src/components/` | UI reutilizável. |
| **Estado / API** | `client/src/lib/trpc.ts`, `client/src/lib/apiBase.ts` | Cliente tRPC e base URL da API. |
| **Extensão Chrome** | `extension/` | Popup, content script, background. Conecta no backend via API. |

**Build do front:** `vite build` → gera `dist/public/` (HTML, JS, CSS).

**Variáveis de ambiente do front:** `VITE_*` (ex.: `VITE_API_URL`, `VITE_APP_ID`). Só o que começa com `VITE_` é exposto no bundle do cliente.

---

## BACKEND

| O quê | Onde | Descrição |
|------|------|-----------|
| **API Express** | `server/app.ts` | Cria o app Express: rotas REST, tRPC, OAuth, webhooks. |
| **Servidor Node** | `server/_core/index.ts` | Sobe o servidor em dev/prod (serve estático + API). |
| **Rotas tRPC** | `server/routers/` | Procedimentos da API (leads, auth, billing, notificações, etc.). |
| **Serviços** | `server/services/` | Lógica de negócio (auth, email, Stripe, IA, etc.). |
| **Webhooks** | `server/webhooks/` | Handlers (ex.: Stripe). |
| **OAuth / infra** | `server/_core/` | Contexto tRPC, OAuth, cookies, env, WebSocket. |
| **Entrada Vercel** | `api/[[...path]].js` | Serverless: importa `dist/api-handler.js` e repassa todas as requisições `/api/*`. |

**Build do back:**  
- `esbuild server/app.ts` → `dist/api-handler.js` (usado pela Vercel).  
- `esbuild server/_core/index.ts` → `dist/index.js` (servidor Node completo).

**Variáveis de ambiente do back:** todas as que **não** são `VITE_*` (ex.: `DATABASE_URL`, `JWT_SECRET`, `STRIPE_*`).

---

## COMPARTILHADO

| O quê | Onde | Descrição |
|------|------|-----------|
| **Tipos / validadores** | `shared/` | Tipos e validadores usados no client e no server. |
| **Schema do banco** | `drizzle/` | Schema Drizzle e migrations. Usado só pelo backend. |

---

## Fluxo de uma requisição

1. **Navegador** acessa a URL do app (ex.: Vercel).
2. **Front:** HTML/JS vêm de `dist/public/` (ou do servidor Node em dev).
3. **Front** chama a API: `GET/POST .../api/trpc/...` ou `.../api/auth/...`, etc.
4. **Vercel:** requisições para `/api/*` vão para `api/[[...path]].js` → Express em `dist/api-handler.js`.
5. **Back:** `server/app.ts` monta as rotas (`/api/trpc`, `/api/auth/refresh`, etc.) e os routers em `server/routers/` respondem.

---

## Scripts úteis (package.json)

| Script | O que faz |
|--------|-----------|
| `pnpm dev` | Sobe **backend** em modo watch (serve front + API). |
| `pnpm build` | Build do **front** (Vite) + build do **back** (esbuild). |
| `pnpm start` | Roda o **backend** em produção (`dist/index.js`). |
| `pnpm run build:extension` | Build da **extensão** Chrome. |

---

## Resumo de pastas na raiz

| Pasta / arquivo | Lado |
|-----------------|------|
| `client/` | **Front** |
| `extension/` | **Front** (extensão) |
| `server/` | **Back** |
| `api/` | **Back** (entrada Vercel) |
| `shared/` | **Compartilhado** |
| `drizzle/` | Schema/migrations (uso **back**) |
| `vite.config.ts` | Config do **front** (Vite) |
| `vercel.json` | Deploy (front estático + roteamento para `/api/*`) |

Com isso dá para saber de imediato: **client/ e extension/ = front; server/ e api/ = back.**
