# WA-SDR - Todo List

## Fase 1: Banco de Dados e Modelos
- [x] Schema de usuários com roles e API Keys
- [x] Schema de organizações e memberships
- [x] Schema de leads com campos imobiliários
- [x] Schema de planos e subscriptions
- [x] Schema de quotas e usage tracking
- [x] Migrations do Prisma

## Fase 2: Autenticação e API Keys
- [x] Geração de API Keys por usuário
- [x] Validação de API Keys no backend
- [x] Middleware de autenticação
- [ ] Testes de autenticação

## Fase 3: Backend - Análise de Leads
- [x] Endpoint POST /api/analyze
- [x] Integração com OpenAI
- [x] Prompt SDR para extração de dados
- [x] Validação de payload
- [x] Salvamento de leads no banco
- [ ] Testes do endpoint

## Fase 4: Billing e Quotas
- [ ] Integração com Stripe
- [x] Modelos de planos
- [x] Middleware de validação de quotas
- [x] Rate limiting
- [x] Tracking de usage
- [ ] Testes de billing

## Fase 5: Dashboard Frontend
- [x] Layout principal com sidebar
- [x] Página de listagem de leads
- [x] Página de detalhes do lead
- [x] Filtros e busca
- [x] Paginação

## Fase 6: Configurações e API Keys
- [x] Página de configurações
- [x] Gerenciamento de API Keys
- [x] Informações de conta
- [x] Visualização de plano

## Fase 7: Testes e Otimizações
- [x] Testes unitários
- [x] Testes de integração
- [x] Otimizações de performance
- [x] Validações de segurança

## Fase 8: Deploy e Documentação
- [x] Checkpoint final
- [x] Documentação de API
- [x] Guia de uso

## Fase 9: Integração com Stripe
- [ ] Configurar credenciais do Stripe
- [ ] Criar serviço de integração com Stripe
- [ ] Implementar endpoint de checkout
- [ ] Implementar endpoint de gerenciamento de subscriptions
- [ ] Configurar webhooks do Stripe
- [ ] Criar interface de upgrade de plano
- [ ] Testes de integração com Stripe

## Fase 9: Integração com Stripe - Completa
- [x] Criar planos de preço e produtos no Stripe
- [x] Implementar serviço de integração com Stripe
- [x] Criar página de vendas (Pricing)
- [x] Implementar página de checkout
- [x] Criar router tRPC para checkout
- [x] Configurar webhooks do Stripe
- [x] Criar página de sucesso de checkout
- [x] Implementar gerenciamento de billing no dashboard
- [x] Testes de integração com Stripe (17 testes passando)


## Fase 10: Sincronização Stripe e Rastreamento de Quotas
- [x] Adicionar campos stripeCustomerId e stripeSubscriptionId ao schema de usuários
- [x] Criar migrations para novos campos
- [x] Implementar sincronização de subscription com banco de dados
- [x] Criar sistema de rastreamento de quotas mensais
- [x] Implementar middleware de validação de quotas
- [x] Criar endpoint para resetar quotas no primeiro dia do mês

## Fase 11: Extensão Chrome
- [x] Criar estrutura base da extensão (manifest.json, popup, content script)
- [x] Implementar captura de conversas do WhatsApp Web
- [x] Criar interface de configuração com API Key
- [x] Implementar envio de conversas para /api/analyze
- [x] Adicionar notificações de sucesso/erro
- [x] Criar ícone e branding da extensão

## Fase 12: Dashboard de Uso
- [x] Criar componente de uso mensal (leads e API calls)
- [x] Implementar gráficos de tendência
- [x] Adicionar alertas de quota (80%, 100%)
- [x] Criar visualização de histórico de uso
- [x] Implementar previsão de uso até fim do mês

## Fase 13: Testes e Deploy
- [x] Testes unitários da sincronização Stripe
- [x] Testes da extensão Chrome
- [x] Testes de integração end-to-end
- [x] Checkpoint final e deploy


## Fase 14: Webhooks do Stripe
- [ ] Criar endpoint /api/webhooks/stripe
- [ ] Implementar validação de assinatura do webhook
- [ ] Sincronizar customer.subscription.created
- [ ] Sincronizar customer.subscription.updated
- [ ] Sincronizar customer.subscription.deleted
- [ ] Testes de webhooks

## Fase 15: Sistema de Relatórios
- [ ] Criar tabela de analytics no banco de dados
- [ ] Implementar rastreamento de eventos (lead_created, lead_contacted, etc)
- [ ] Criar router tRPC para analytics
- [ ] Implementar agregação de dados por período

## Fase 16: Página de Analytics
- [ ] Criar página de relatórios
- [ ] Implementar gráficos de leads por dia/semana/mês
- [ ] Adicionar gráfico de taxa de conversão
- [ ] Criar visualização de ROI por plano
- [ ] Adicionar filtros por período

## Fase 17: Notificações em Tempo Real
- [ ] Implementar WebSocket para notificações
- [ ] Criar notificações de novo lead capturado
- [ ] Adicionar notificações de quota atingida
- [ ] Implementar toast notifications no dashboard

## Fase 18: Testes Finais
- [ ] Testes de webhooks do Stripe
- [ ] Testes de analytics
- [ ] Testes de notificações
- [ ] Testes de integração end-to-end
- [ ] Checkpoint final


## Fase 19: Melhorias de Segurança e Layout - Completa
- [x] Criar validadores robustos com Zod
- [x] Implementar middleware de segurança
- [x] Adicionar sanitização de input contra XSS
- [x] Implementar rate limiting por IP e usuário
- [x] Adicionar validação de quotas
- [x] Implementar verificação de ownership
- [x] Criar design system moderno com Tailwind
- [x] Adicionar animações e efeitos visuais
- [x] Implementar componentes com glassmorphism
- [x] Adicionar suporte a temas claro/escuro
- [x] Implementar responsive design mobile-first


## Fase 20: P\u00e1gina de Blog e Recursos
- [ ] Criar p\u00e1gina de blog com listagem de artigos
- [ ] Implementar sistema de categorias de artigos
- [ ] Criar p\u00e1gina de detalhe do artigo com markdown
- [ ] Adicionar busca e filtros de artigos
- [ ] Integrar com banco de dados

## Fase 21: Chat de Suporte
- [ ] Integrar widget de chat (Crisp ou similar)
- [ ] Configurar rotas de atendimento
- [ ] Adicionar notifica\u00e7\u00f5es para novos chats
- [ ] Implementar hist\u00f3rico de convers\u00e1s

## Fase 22: Dashboard de Analytics Avan\u00e7ado
- [ ] Criar p\u00e1gina de analytics com gr\u00e1ficos
- [ ] Implementar gr\u00e1ficos de tend\u00eancias de leads
- [ ] Adicionar m\u00e9tricas de taxa de convers\u00e3o
- [ ] Criar relat\u00f3rio de ROI por plano
- [ ] Implementar filtros de per\u00edodo de data
