# 📱 Plano de Testes de Responsividade - ChatLead Pro

**Data:** 30 de Janeiro de 2026  
**Objetivo:** Verificar responsividade e usabilidade em todos os dispositivos  
**Escopo:** Telas corrigidas (tema dark) + Novas telas do Comprador + Painel Admin

---

## 🎯 Breakpoints de Teste

| Dispositivo | Resolução | Viewport |
|---|---|---|
| **Mobile** | 375px | iPhone 12/13 |
| **Mobile** | 480px | Samsung Galaxy S21 |
| **Tablet** | 768px | iPad Mini |
| **Tablet** | 1024px | iPad Pro |
| **Desktop** | 1280px | Laptop 13" |
| **Desktop** | 1920px | Monitor 24" |

---

## 📋 Telas a Testar

### **Telas Corrigidas (Tema Dark)**

#### 1️⃣ NotFound (404)
- [ ] **Mobile (375px)**
  - [ ] Ícone visível e centralizado
  - [ ] Texto legível sem truncamento
  - [ ] Botões empilhados verticalmente
  - [ ] Padding adequado nas laterais
  - [ ] Sem overflow horizontal

- [ ] **Tablet (768px)**
  - [ ] Layout mantém proporção
  - [ ] Botões lado a lado
  - [ ] Espaçamento balanceado

- [ ] **Desktop (1920px)**
  - [ ] Conteúdo centralizado
  - [ ] Botões com hover effects
  - [ ] Gradiente de fundo renderiza corretamente

#### 2️⃣ Onboarding (Seleção de Planos)
- [ ] **Mobile (375px)**
  - [ ] Cards de plano empilhados verticalmente
  - [ ] Badge "Recomendado" visível
  - [ ] Preços legíveis
  - [ ] Lista de features com scroll se necessário
  - [ ] Botões "Continuar" e "Ver Planos" empilhados

- [ ] **Tablet (768px)**
  - [ ] 2 cards por linha
  - [ ] Espaçamento entre cards adequado
  - [ ] Botões lado a lado

- [ ] **Desktop (1920px)**
  - [ ] 3 cards por linha
  - [ ] Altura dos cards alinhada
  - [ ] Hover effects funcionando

#### 3️⃣ CheckoutSuccess (Sucesso de Pagamento)
- [ ] **Mobile (375px)**
  - [ ] Ícone de sucesso centralizado
  - [ ] Título e mensagem legíveis
  - [ ] Checklist de confirmação visível
  - [ ] Botões empilhados
  - [ ] Countdown visível

- [ ] **Tablet (768px)**
  - [ ] Card com largura adequada
  - [ ] Botões lado a lado

- [ ] **Desktop (1920px)**
  - [ ] Card centralizado
  - [ ] Animações suaves

#### 4️⃣ UsageDashboard (Uso de Quotas)
- [ ] **Mobile (375px)**
  - [ ] Cards de stats empilhados
  - [ ] Progress bars legíveis
  - [ ] Tabela com scroll horizontal se necessário
  - [ ] Sem truncamento de texto

- [ ] **Tablet (768px)**
  - [ ] 2 cards por linha
  - [ ] Tabela com melhor legibilidade

- [ ] **Desktop (1920px)**
  - [ ] 4 cards por linha
  - [ ] Tabela com todas as colunas visíveis

---

### **Novas Telas do Comprador**

#### 5️⃣ Conversations (Conversas)
- [ ] **Mobile (375px)**
  - [ ] Input de busca com ícone visível
  - [ ] Tabela com scroll horizontal
  - [ ] Colunas principais visíveis (Contato, Última Mensagem, Sentimento)
  - [ ] Botão "Ver" acessível
  - [ ] Badges de sentimento com cores distintas

- [ ] **Tablet (768px)**
  - [ ] Mais colunas visíveis
  - [ ] Melhor legibilidade

- [ ] **Desktop (1920px)**
  - [ ] Todas as colunas visíveis
  - [ ] Hover effects na tabela

#### 6️⃣ Automations (Automações)
- [ ] **Mobile (375px)**
  - [ ] Botão "Nova Automação" visível e acessível
  - [ ] Cards de automação com informações principais
  - [ ] Botões de ação (toggle, editar, deletar) acessíveis
  - [ ] Sem overflow de conteúdo

- [ ] **Tablet (768px)**
  - [ ] Layout mais espaçado
  - [ ] Botões de ação lado a lado

- [ ] **Desktop (1920px)**
  - [ ] Cards com melhor espaçamento
  - [ ] Hover effects nos cards

#### 7️⃣ Help (Central de Ajuda)
- [ ] **Mobile (375px)**
  - [ ] Input de busca funcional
  - [ ] Cards de quick links empilhados
  - [ ] Accordion de FAQs expansível
  - [ ] Texto das respostas legível
  - [ ] Botão "Contatar Suporte" acessível

- [ ] **Tablet (768px)**
  - [ ] Quick links em 2 colunas
  - [ ] Melhor espaçamento

- [ ] **Desktop (1920px)**
  - [ ] Quick links em 3 colunas
  - [ ] Accordion com melhor legibilidade

---

### **Painel Administrativo (Master)**

#### 8️⃣ AdminDashboard (Dashboard Admin)
- [ ] **Mobile (375px)**
  - [ ] Sidebar colapsada por padrão
  - [ ] Stats cards empilhados
  - [ ] Ícones visíveis
  - [ ] Botão de menu (hamburger) funcional
  - [ ] Conteúdo principal com padding adequado

- [ ] **Tablet (768px)**
  - [ ] Sidebar pode estar expandida
  - [ ] 2 stats cards por linha

- [ ] **Desktop (1920px)**
  - [ ] 4 stats cards por linha
  - [ ] Sidebar expandida por padrão
  - [ ] Layout de 2 colunas para recent activity + pending items

#### 9️⃣ AdminUsers (Gerenciar Usuários)
- [ ] **Mobile (375px)**
  - [ ] Input de busca funcional
  - [ ] Tabela com scroll horizontal
  - [ ] Colunas principais visíveis
  - [ ] Menu de ações (dropdown) acessível
  - [ ] Badges com cores distintas

- [ ] **Tablet (768px)**
  - [ ] Mais colunas visíveis
  - [ ] Melhor legibilidade

- [ ] **Desktop (1920px)**
  - [ ] Todas as colunas visíveis
  - [ ] Hover effects funcionando

#### 🔟 AdminBilling (Faturamento)
- [ ] **Mobile (375px)**
  - [ ] Stats cards empilhados
  - [ ] Tabela com scroll horizontal
  - [ ] Valores legíveis
  - [ ] Badges de status visíveis

- [ ] **Tablet (768px)**
  - [ ] 2 stats cards por linha
  - [ ] Melhor espaçamento

- [ ] **Desktop (1920px)**
  - [ ] 4 stats cards por linha
  - [ ] Tabela com todas as colunas

#### 1️⃣1️⃣ AdminSupport (Suporte)
- [ ] **Mobile (375px)**
  - [ ] Stats cards empilhados
  - [ ] Input de busca funcional
  - [ ] Tabela com scroll horizontal
  - [ ] Botão "Responder" acessível
  - [ ] Dialog de resposta responsivo

- [ ] **Tablet (768px)**
  - [ ] 3 stats cards por linha
  - [ ] Melhor legibilidade da tabela

- [ ] **Desktop (1920px)**
  - [ ] Layout completo
  - [ ] Dialog com melhor espaçamento

#### 1️⃣2️⃣ AdminAnalytics (Analytics)
- [ ] **Mobile (375px)**
  - [ ] Placeholder de gráfico visível
  - [ ] Texto legível

- [ ] **Tablet (768px)**
  - [ ] Melhor proporção

- [ ] **Desktop (1920px)**
  - [ ] Espaço adequado para gráficos

#### 1️⃣3️⃣ AdminNotifications (Notificações)
- [ ] **Mobile (375px)**
  - [ ] Inputs empilhados
  - [ ] Select dropdown funcional
  - [ ] Botão "Enviar" acessível

- [ ] **Tablet (768px)**
  - [ ] Melhor espaçamento

- [ ] **Desktop (1920px)**
  - [ ] Layout com melhor proporção

#### 1️⃣4️⃣ AdminLogs (Logs)
- [ ] **Mobile (375px)**
  - [ ] Botão "Exportar" visível
  - [ ] Área de logs com scroll
  - [ ] Texto legível

- [ ] **Tablet (768px)**
  - [ ] Melhor espaçamento

- [ ] **Desktop (1920px)**
  - [ ] Altura adequada para logs

#### 1️⃣5️⃣ AdminSettings (Configurações)
- [ ] **Mobile (375px)**
  - [ ] Cards empilhados verticalmente
  - [ ] Inputs legíveis
  - [ ] Botões "Salvar" acessíveis

- [ ] **Tablet (768px)**
  - [ ] 2 cards por linha

- [ ] **Desktop (1920px)**
  - [ ] Layout com melhor proporção

---

## 🎨 Testes de Tema Dark

Para cada tela, verificar:

- [ ] **Cores de Fundo**
  - [ ] Gradiente dark renderiza corretamente
  - [ ] Sem áreas brancas ou claras
  - [ ] Contraste adequado com texto

- [ ] **Texto**
  - [ ] Texto branco/claro legível
  - [ ] Sem texto invisível
  - [ ] Hierarquia visual clara

- [ ] **Componentes**
  - [ ] Inputs com fundo escuro
  - [ ] Botões com cores apropriadas
  - [ ] Badges com cores distintas
  - [ ] Cards com fundo escuro

- [ ] **Ícones**
  - [ ] Ícones visíveis
  - [ ] Cores apropriadas
  - [ ] Sem ícones invisíveis

---

## 🧭 Testes de Navegação

Para cada tela, verificar:

- [ ] **Links Internos**
  - [ ] Links funcionam corretamente
  - [ ] Navegação via Link (não <a>)
  - [ ] Sem erros de rota

- [ ] **Sidebar (Admin)**
  - [ ] Menu items clicáveis
  - [ ] Ativo/inativo correto
  - [ ] Collapse/expand funciona
  - [ ] Resize funciona (desktop)

- [ ] **Sidebar (Comprador)**
  - [ ] Menu items clicáveis
  - [ ] Ativo/inativo correto
  - [ ] Collapse/expand funciona

- [ ] **Proteção de Rotas**
  - [ ] Admin routes protegidas
  - [ ] Usuário não-admin redirecionado
  - [ ] Usuário não-autenticado redirecionado

---

## 🔍 Testes de Interatividade

Para cada tela, verificar:

- [ ] **Hover Effects**
  - [ ] Botões com hover
  - [ ] Links com hover
  - [ ] Cards com hover

- [ ] **Focus States**
  - [ ] Inputs com focus ring
  - [ ] Botões com focus ring
  - [ ] Navegação por teclado funciona

- [ ] **Dialogs/Modals**
  - [ ] Abrem corretamente
  - [ ] Fecham corretamente
  - [ ] Conteúdo responsivo
  - [ ] Overlay funciona

- [ ] **Dropdowns**
  - [ ] Abrem corretamente
  - [ ] Itens clicáveis
  - [ ] Fecham ao clicar fora

- [ ] **Accordions**
  - [ ] Expandem/colapsam
  - [ ] Conteúdo visível quando expandido
  - [ ] Múltiplos podem estar abertos

---

## 📊 Testes de Performance

Para cada tela, verificar:

- [ ] **Carregamento**
  - [ ] Página carrega em < 2s
  - [ ] Sem layout shift
  - [ ] Skeleton/loader visível se necessário

- [ ] **Animações**
  - [ ] Suaves e sem lag
  - [ ] Não causam jank
  - [ ] Reduzem em modo de economia

- [ ] **Scroll**
  - [ ] Suave
  - [ ] Sem lag
  - [ ] Tabelas com scroll horizontal funcionam

---

## 🧪 Testes de Acessibilidade

Para cada tela, verificar:

- [ ] **Contraste**
  - [ ] Texto vs fundo com contraste ≥ 4.5:1
  - [ ] Ícones com contraste adequado

- [ ] **Teclado**
  - [ ] Tab order lógico
  - [ ] Sem trap de foco
  - [ ] Enter ativa botões

- [ ] **Screen Readers**
  - [ ] Labels em inputs
  - [ ] Alt text em imagens
  - [ ] ARIA labels onde necessário

- [ ] **Tamanho de Toque**
  - [ ] Botões ≥ 44x44px
  - [ ] Links ≥ 44x44px
  - [ ] Espaçamento entre elementos

---

## 📱 Checklist por Dispositivo

### **Mobile (375px)**
- [ ] Sem scroll horizontal
- [ ] Texto legível sem zoom
- [ ] Botões acessíveis
- [ ] Imagens carregam
- [ ] Formulários funcionam
- [ ] Sidebar colapsada por padrão

### **Mobile (480px)**
- [ ] Mesmos testes que 375px
- [ ] Mais espaço disponível
- [ ] Layout otimizado

### **Tablet (768px)**
- [ ] Layout intermediário
- [ ] 2 colunas onde apropriado
- [ ] Sidebar pode estar expandida
- [ ] Touch targets adequados

### **Tablet (1024px)**
- [ ] Layout mais espaçado
- [ ] Melhor uso do espaço
- [ ] Sidebar expandida

### **Desktop (1280px)**
- [ ] Layout completo
- [ ] Sidebar expandida
- [ ] Hover effects visíveis
- [ ] Sem espaço desperdiçado

### **Desktop (1920px)**
- [ ] Máximo espaço
- [ ] Conteúdo não muito espalhado
- [ ] Proporções mantidas

---

## 🐛 Bugs Conhecidos a Verificar

- [ ] Overflow horizontal em mobile
- [ ] Texto truncado
- [ ] Ícones invisíveis
- [ ] Botões inacessíveis
- [ ] Cores de fundo incorretas
- [ ] Tabelas com scroll horizontal
- [ ] Dialogs não responsivos
- [ ] Sidebar não colapsando

---

## ✅ Checklist Final

Antes de marcar como completo:

- [ ] Todas as telas testadas em todos os breakpoints
- [ ] Sem erros de console
- [ ] Sem warnings de React
- [ ] Tema dark consistente
- [ ] Navegação funciona
- [ ] Proteção de rotas funciona
- [ ] Performance aceitável
- [ ] Acessibilidade básica ok
- [ ] Documentação atualizada

---

## 📝 Notas de Teste

**Data de Início:** _______________  
**Data de Conclusão:** _______________  
**Testador:** _______________  
**Navegador:** _______________  
**Versão do Navegador:** _______________  

### Problemas Encontrados:

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Observações:

_______________________________________________
_______________________________________________
_______________________________________________

---

## 🚀 Próximas Etapas

- [ ] Corrigir bugs encontrados
- [ ] Testar novamente
- [ ] Deploy para staging
- [ ] Teste de UAT com usuários reais
- [ ] Deploy para produção

---

**Versão:** 1.0  
**Última Atualização:** 30 de Janeiro de 2026
