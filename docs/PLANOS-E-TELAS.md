# Organização: Telas por Plano do Usuário

Este documento organiza **quais telas/recursos** cada plano deve ver e **onde** implementar as checagens. Use como guia na hora de codar.

---

## 1. Planos disponíveis (hierarquia)

| Plano        | ID            | Ordem | Fonte de verdade |
|-------------|----------------|-------|------------------|
| Gratis      | `free`         | 0     | `shared/stripe-plans.ts` |
| Starter     | `starter`      | 1     | idem             |
| Professional| `professional` | 2     | idem             |
| Enterprise  | `enterprise`   | 3     | idem             |

- O usuário autenticado tem `user.plan` e `user.subscriptionStatus` (vindos de `auth.me`).
- Para “plano ativo” considerar: `subscriptionStatus === 'active'` **e** `plan` em `['starter','professional','enterprise']` (ou só `plan !== 'free'` se quiser).
- **Importante:** Hoje em alguns lugares o plano é “chutado” (ex.: `usePlanLimits` usa `professional` se `subscriptionStatus === 'active'`). O correto é usar **sempre `user.plan`** como fonte do plano atual.

---

## 2. Rotas e telas – plano mínimo

### 2.1 Rotas públicas (sem login)

- Sem restrição de plano (qualquer um pode acessar):
  - `/` (Landing)
  - `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`
  - `/pricing`
  - `/documentation`, `/docs`
  - `/blog`, `/blog/:id`
  - `/onboarding`

### 2.2 Rotas autenticadas – todas as telas do app (dashboard)

Todas abaixo exigem **usuário logado**. O plano define se a **tela inteira** ou **parte dela** é exibida ou bloqueada.

| Rota / Tela           | Plano mínimo | Observação |
|-----------------------|--------------|------------|
| `/command-center`     | **free**     | Todos     |
| `/leads`, `/leads/:id`, `/leads/:id/edit` | **free** | Todos; limites (quantidade) por plano |
| `/conversations`      | **free**     | Todos     |
| `/appointments`      | **free**     | Todos     |
| `/analytics`         | **starter**  | Ou free com analytics “básico”; avançado = professional+ |
| `/automations`, `/automations/new` | **starter** | Já existe limite por plano em `usePlanLimits` (maxAutomations) |
| `/automations/docs` (WebhookDocs) | **professional** | Documentação de webhook/API |
| `/settings`          | **free**     | Todos; aba “Integrações (Webhook)” só Professional+ (já existe lógica) |
| `/usage`             | **free**     | Todos     |
| `/support`           | **free**     | Todos     |
| `/help`              | **free**     | Só autenticado (já removido dos headers públicos) |
| `/pricing`           | **free**     | Acesso para ver/alterar plano |
| `/checkout/:planId`, `/checkout-success` | **free** | Para fazer upgrade |

Resumo por plano:

- **free:** command-center, leads, conversations, appointments, settings (exceto Integrações), usage, support, help, pricing, checkout.
- **starter:** free + analytics (completo ou básico, conforme definição) + automações (respeitando limite).
- **professional:** starter + analytics avançado (se separar) + **Integrações/Webhook** (Settings e `/automations/docs`).
- **enterprise:** mesmo que professional (por enquanto; pode ter features exclusivas depois).

---

## 3. Menu lateral (DashboardLayout)

Arquivo: `client/src/components/DashboardLayout.tsx`.

- **userMenuItems** hoje: Comando, Leads, Conversas, Agendamentos, Analytics, Automações, Suporte.
- Regra sugerida:
  - **free:** Comando, Leads, Conversas, Agendamentos, Suporte. **Ocultar:** Analytics (ou mostrar com badge “Upgrade”), Automações (ou mostrar com badge “Upgrade”).
  - **starter:** free + Analytics + Automações (visíveis).
  - **professional+:** igual starter + nada extra no menu (Integrações fica dentro de Settings).

Ou seja: itens de menu devem ser filtrados por `user.plan` (ou por um hook `useCurrentPlan()` / `usePlanFeatures()`).

---

## 4. Onde implementar (checklist para o código)

### 4.1 Fonte do plano no front

- [ ] **useAuth / user:** Garantir que `user.plan` e `user.subscriptionStatus` vêm de `auth.me` (já vem).
- [ ] **usePlanLimits** (`client/src/hooks/usePlanLimits.ts`): Trocar lógica de “plano atual” para usar `user.plan` (e, se quiser, `subscriptionStatus === 'active'` para plano pago). Não usar mais “se active então professional”.
- [ ] **Pricing.tsx:** Plano atual deve ser `user.plan` (e não `currentPlanId` nem “professional” fixo). Ajustar para refletir free/starter/professional/enterprise corretamente.

### 4.2 Hook de “features por plano”

- [ ] Criar hook (ex.: `usePlanFeatures` ou `useCurrentPlan`) que:
  - Lê `user` de `useAuth()`.
  - Retorna: `plan`, `isPaid`, e flags como `canAccessAnalytics`, `canAccessAutomations`, `canAccessIntegrations`, etc., baseadas em `user.plan`.
- [ ] Usar esse hook em:
  - **DashboardLayout:** para montar `userMenuItems` (mostrar/ocultar Analytics, Automações).
  - **Settings:** aba Integrações já está condicionada a Professional+ no backend; pode usar o mesmo hook para esconder a aba ou mostrar bloqueio.

### 4.3 Proteção de rotas por plano

- [ ] Criar um wrapper de rota (ex.: `PlanRoute` ou HOC) que:
  - Recebe `minimumPlan` (ex.: `'starter'`, `'professional'`).
  - Se `user.plan` for “menor” que `minimumPlan`, redireciona para `/pricing` (ou para uma página “Upgrade necessário”) em vez de renderizar a tela.
- [ ] Aplicar nas rotas:
  - `/analytics` → mínimo **starter** (ou free, se analytics básico for free).
  - `/automations` e `/automations/new` → mínimo **starter**.
  - `/automations/docs` → mínimo **professional**.

### 4.4 Bloqueio dentro da página (fallback)

- [ ] Em páginas que podem ser acessadas por mais de um plano (ex.: Settings), manter bloqueio por seção:
  - Ex.: Integrações (Webhook) só para Professional+ (já existe; garantir que usa `user.plan` ou o novo hook).

### 4.5 Backend

- [ ] Manter `auth.me` retornando `plan` e `subscriptionStatus` (já retorna).
- [ ] Rotas que dependem de plano (ex.: integrações) já usam `getUserQuotaInfo` ou equivalente; garantir que o `plan` no banco está sempre sincronizado com o Stripe (fluxo de checkout/webhook).

---

## 5. Matriz rápida: recurso x plano mínimo

| Recurso / Tela              | free | starter | professional | enterprise |
|----------------------------|------|--------|--------------|------------|
| Comando (command-center)   | sim  | sim    | sim          | sim        |
| Leads                      | sim  | sim    | sim          | sim        |
| Conversas                  | sim  | sim    | sim          | sim        |
| Agendamentos               | sim  | sim    | sim          | sim        |
| Analytics                  | não* | sim    | sim          | sim        |
| Automações                 | não* | sim    | sim          | sim        |
| Docs Webhook / API         | não  | não    | sim          | sim        |
| Integrações (Settings)     | não  | não    | sim          | sim        |
| Suporte / Ajuda            | sim  | sim    | sim          | sim        |
| Uso / Usage                | sim  | sim    | sim          | sim        |
| Planos / Checkout          | sim  | sim    | sim          | sim        |

\* Ou “sim” com versão limitada / CTA de upgrade; definir no código.

---

## 6. Próximos passos (ordem sugerida)

1. Ajustar **usePlanLimits** e **Pricing** para usar `user.plan` como fonte do plano atual.
2. Criar **usePlanFeatures** (ou equivalente) com as flags por plano.
3. No **DashboardLayout**, filtrar itens do menu com base nesse hook.
4. Criar **PlanRoute** (ou HOC) e aplicar em analytics, automations, automations/docs.
5. Revisar mensagens de “Upgrade necessário” (página ou componente reutilizável) e links para `/pricing`.

Quando for implementar no código, use este doc como checklist e ajuste os “não*” conforme a regra de negócio (ex.: analytics/automações free limitados ou totalmente bloqueados).
