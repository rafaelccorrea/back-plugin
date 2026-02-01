# 📱 ChatLead Pro - Guia Completo de Teste e Produção

## 🎯 Modelo de Negócio

```
Extensão Gratuita no Chrome Web Store
        ↓
Usuário baixa e instala
        ↓
Tenta usar sem API Key
        ↓
Sistema pede API Key
        ↓
Usuário vai para site e compra plano
        ↓
Recebe API Key
        ↓
Cola na extensão e começa a usar
        ↓
Captura leads do WhatsApp
```

---

## 🧪 PARTE 1: TESTE LOCAL (Desenvolvimento)

### 1.1 Preparar a Extensão

```bash
cd /home/ubuntu/whatsapp-lead-plugin-analysis/extension

# Verificar arquivos
ls -la
# Deve ter:
# - manifest.json
# - popup.js
# - popup.html
# - popup.css
# - content.js
# - background.js
```

### 1.2 Instalar no Chrome (Modo Desenvolvedor)

**Passo 1: Abrir Chrome Extensions**
```
1. Abra Chrome
2. Digite na barra de endereço: chrome://extensions/
3. Pressione Enter
```

**Passo 2: Ativar Modo Desenvolvedor**
```
1. Canto superior direito da página
2. Clique em "Modo de desenvolvedor" (toggle)
3. Deve ficar azul/ativado
```

**Passo 3: Carregar Extensão**
```
1. Clique em "Carregar extensão sem empacotamento"
2. Navegue até: /home/ubuntu/whatsapp-lead-plugin-analysis/extension
3. Clique em "Selecionar pasta"
4. Extensão deve aparecer na lista
```

**Passo 4: Verificar Instalação**
```
1. Clique no ícone de extensões (quebra-cabeça) no Chrome
2. Procure por "ChatLead Pro"
3. Clique para fixar na barra de ferramentas
```

### 1.3 Testar Funcionalidades

#### **Teste 1: Sem API Key**
```
1. Clique no ícone da extensão
2. Deve mostrar: "Extensão não configurada"
3. Campo para colar API Key
4. Botão "Configurar Extensão"
```

#### **Teste 2: Com API Key Inválida**
```
1. Cole uma API Key fake: "test-key-123"
2. Clique em "Configurar Extensão"
3. Deve mostrar erro ou aceitar (depende da validação)
```

#### **Teste 3: Com API Key Válida**
```
1. Vá para https://nonmetallic-belinda-thankless.ngrok-free.dev/settings
2. Copie sua API Key real
3. Cole na extensão
4. Clique em "Configurar Extensão"
5. Deve mostrar: "✓ Extensão configurada"
6. Deve mostrar estatísticas (Leads Capturados, Mês)
```

#### **Teste 4: Capturar Conversa**
```
1. Abra WhatsApp Web: https://web.whatsapp.com
2. Abra uma conversa
3. Clique em "📱 Capturar Conversa" na extensão
4. Deve mostrar loading
5. Deve capturar mensagens
6. Deve enviar para análise
7. Deve mostrar resultado com sucesso
8. Som deve tocar
```

#### **Teste 5: Dashboard**
```
1. Clique em "📊 Dashboard" na extensão
2. Deve abrir nova aba com https://nonmetallic-belinda-thankless.ngrok-free.dev/leads
3. Lead deve aparecer na lista
```

#### **Teste 6: Configurações**
```
1. Clique em "⚙️ Configurações" na extensão
2. Deve abrir https://nonmetallic-belinda-thankless.ngrok-free.dev/settings
3. Deve poder desabilitar som
4. Deve poder regenerar API Key
```

### 1.4 Testar Notificações em Tempo Real

#### **Teste 1: WebSocket Conectado**
```
1. Abra DevTools (F12)
2. Vá para "Console"
3. Deve ver: "ChatLead Pro - Background Service Worker carregado"
4. Deve ver: "Conectando ao WebSocket..."
5. Deve ver: "WebSocket conectado"
```

#### **Teste 2: Receber Notificação**
```
1. Em outra aba, faça login como admin
2. Vá para /admin/notifications
3. Envie uma notificação para "all"
4. Na aba com a extensão:
   - Som deve tocar
   - Notificação do navegador deve aparecer
   - Badge deve atualizar
```

---

## 🚀 PARTE 2: PRODUÇÃO (Chrome Web Store)

### 2.1 Preparar Arquivos

#### **Criar Pasta de Distribuição**
```bash
mkdir -p /home/ubuntu/whatsapp-lead-plugin-analysis/dist/extension
cp -r /home/ubuntu/whatsapp-lead-plugin-analysis/extension/* /home/ubuntu/whatsapp-lead-plugin-analysis/dist/extension/
```

#### **Criar Arquivo ZIP**
```bash
cd /home/ubuntu/whatsapp-lead-plugin-analysis/dist
zip -r chatleadpro-extension.zip extension/
```

### 2.2 Preparar Ícones da Extensão

A extensão precisa de ícones em 3 tamanhos:

```bash
mkdir -p /home/ubuntu/whatsapp-lead-plugin-analysis/extension/icons

# Criar ícones (você pode usar ferramentas online ou ImageMagick)
# 16x16 pixels - icon-16.png
# 48x48 pixels - icon-48.png
# 128x128 pixels - icon-128.png
```

**Opção: Usar ferramentas online**
- https://www.favicon-generator.org/
- https://www.online-convert.com/

### 2.3 Criar Conta Google Developer

```
1. Acesse: https://chrome.google.com/webstore/devconsole/
2. Faça login com sua conta Google
3. Clique em "Criar novo item"
4. Pague taxa de registro: $5 USD (único)
5. Pronto! Agora pode publicar extensões
```

### 2.4 Publicar no Chrome Web Store

#### **Passo 1: Upload da Extensão**
```
1. Clique em "Novo item"
2. Clique em "Selecionar arquivo"
3. Selecione: chatleadpro-extension.zip
4. Clique em "Upload"
```

#### **Passo 2: Preencher Informações**

**Nome da Extensão:**
```
ChatLead Pro - WhatsApp Lead Capture
```

**Descrição Curta (132 caracteres):**
```
Capture and analyze WhatsApp conversations with AI-powered lead qualification. Requires API Key.
```

**Descrição Completa:**
```
ChatLead Pro is an AI-powered extension that helps real estate professionals capture and qualify leads directly from WhatsApp Web.

Features:
- Capture WhatsApp conversations in one click
- AI-powered lead analysis and qualification
- Real-time notifications with sound
- Secure API Key authentication
- Track leads in your dashboard

How to use:
1. Install the extension
2. Get an API Key from our website
3. Paste the API Key in the extension settings
4. Start capturing leads from WhatsApp

Requires active subscription for API Key.
```

**Idioma:**
```
English (ou Português - Brasileiro)
```

**Categoria:**
```
Productivity
```

**Ícones:**
```
- 128x128: icon-128.png
```

#### **Passo 3: Informações de Privacidade**

**Permissões Solicitadas:**
```
- Storage: Armazenar API Key localmente
- Active Tab: Acessar aba ativa
- Scripting: Executar scripts no WhatsApp Web
- WebSocket: Conectar para notificações em tempo real
```

**Explicação de Privacidade:**
```
Esta extensão:
- NÃO coleta dados pessoais
- NÃO compartilha informações com terceiros
- Armazena API Key localmente no seu navegador
- Conecta apenas com nosso servidor para análise
- Não modifica conteúdo do WhatsApp
```

**Website:**
```
https://nonmetallic-belinda-thankless.ngrok-free.dev
```

**Email de Contato:**
```
seu-email@example.com
```

#### **Passo 4: Revisar e Publicar**

```
1. Revise todas as informações
2. Clique em "Publicar"
3. Aguarde aprovação (geralmente 24-48 horas)
4. Receberá email de confirmação
```

### 2.5 Após Aprovação

```
1. Extensão estará disponível em:
   https://chrome.google.com/webstore/detail/chatleadpro/[ID-UNICO]

2. Usuários podem instalar clicando em "Adicionar ao Chrome"

3. Você pode atualizar a extensão:
   - Vá para Developer Console
   - Clique em "Editar"
   - Upload nova versão
   - Clique em "Publicar"
```

---

## 📋 PARTE 3: Fluxo de Teste Completo

### 3.1 Teste de Usuário Novo

```
1. Usuário acessa site: https://nonmetallic-belinda-thankless.ngrok-free.dev
2. Vê landing page com planos
3. Clica em "Instalar Extensão"
4. Vai para Chrome Web Store
5. Clica em "Adicionar ao Chrome"
6. Extensão instala
7. Clica no ícone da extensão
8. Vê: "Extensão não configurada"
9. Clica em "Gere uma aqui"
10. Vai para /settings no site
11. Vê opção de gerar API Key
12. Clica em "Gerar Nova API Key"
13. Copia API Key
14. Volta para extensão
15. Cola API Key
16. Clica em "Configurar Extensão"
17. Extensão mostra: "✓ Pronto para capturar leads"
18. Abre WhatsApp Web
19. Abre uma conversa
20. Clica em "Capturar Conversa"
21. Extensão captura e analisa
22. Mostra resultado
23. Lead aparece no dashboard
24. Sucesso! ✓
```

### 3.2 Teste de Notificações

```
1. Usuário tem extensão configurada
2. Deixa extensão aberta
3. Admin envia notificação para "all"
4. Usuário recebe:
   - Som de notificação
   - Notificação do navegador
   - Badge atualizado
5. Clica na notificação
6. Vai para dashboard
7. Sucesso! ✓
```

### 3.3 Teste de Erro

```
1. Usuário cola API Key inválida
2. Clica em "Configurar Extensão"
3. Sistema tenta validar
4. Mostra erro: "API Key inválida"
5. Usuário tenta novamente com API Key correta
6. Funciona normalmente
7. Sucesso! ✓
```

---

## 🔐 PARTE 4: Validação de API Key

### 4.1 No Backend

Adicione validação no endpoint de análise:

```typescript
// server/routers/leads.ts
export const leadsRouter = router({
  analyze: publicProcedure
    .input(z.object({
      conversation: z.string(),
      contactName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validar API Key
      const apiKey = ctx.apiKey;
      if (!apiKey) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'API Key inválida ou expirada',
        });
      }

      // Validar quota
      const usage = await checkUsage(ctx.userId);
      if (usage.leadsCreated >= usage.quota) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Quota de leads atingida. Atualize seu plano.',
        });
      }

      // Análise...
    }),
});
```

### 4.2 Na Extensão

Adicione validação no popup.js:

```javascript
async function validateApiKey(apiKey) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/trpc/billing.getUsage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error('API Key inválida');
    }

    const data = await response.json();
    return data.result?.data ? true : false;
  } catch (error) {
    return false;
  }
}
```

---

## 📊 PARTE 5: Monitoramento em Produção

### 5.1 Métricas Importantes

```
- Instalações totais
- Usuários ativos
- Leads capturados
- Taxa de erro
- Tempo médio de captura
- WebSocket uptime
```

### 5.2 Ferramentas

```
- Google Analytics (adicionar ao site)
- Sentry (monitorar erros)
- LogRocket (session replay)
- Datadog (APM)
```

### 5.3 Suporte ao Usuário

```
- Email: support@wa-sdr.manus.space
- Chat ao vivo no site
- FAQ na documentação
- Vídeo tutorial no YouTube
```

---

## 🎯 Checklist Final

- [ ] Extensão testada localmente
- [ ] Ícones criados (16x16, 48x48, 128x128)
- [ ] ZIP criado
- [ ] Conta Google Developer criada
- [ ] Informações preenchidas no Web Store
- [ ] Extensão publicada
- [ ] Link compartilhado com usuários
- [ ] Monitoramento configurado
- [ ] Suporte preparado

---

## 📞 Próximos Passos

1. **Criar ícones da extensão**
2. **Publicar no Chrome Web Store**
3. **Adicionar link no site**
4. **Criar tutorial em vídeo**
5. **Configurar monitoramento**
6. **Preparar suporte ao cliente**

---

**Pronto para produção! 🚀**
