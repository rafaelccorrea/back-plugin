# Sistema de Notificações em Tempo Real com WebSocket

## 📋 Visão Geral

O sistema de notificações em tempo real permite que o admin envie notificações para usuários e todos recebam instantaneamente via WebSocket, sem necessidade de recarregar a página.

## 🏗️ Arquitetura

### Backend

#### 1. **Servidor WebSocket** (`server/_core/websocket.ts`)

Gerencia conexões WebSocket autenticadas com:
- ✅ Autenticação via JWT token
- ✅ Heartbeat para manter conexões vivas (a cada 30s)
- ✅ Broadcast para todos os usuários
- ✅ Broadcast para usuários com plano específico
- ✅ Envio para usuário específico

**Funções Principais:**
```typescript
setupWebSocket(server: HTTPServer) // Inicializar servidor WebSocket
broadcastNotification(notification: any) // Enviar para todos
broadcastNotificationToPlans(notification, plans, userPlans) // Enviar para plano específico
sendNotificationToUser(userId: string, notification: any) // Enviar para um usuário
getConnectedUsersCount(): number // Obter número de usuários conectados
getConnectedUsers(): string[] // Obter lista de usuários conectados
```

#### 2. **Integração com Endpoint tRPC** (`server/routers/notifications.ts`)

O endpoint `sendNotification` agora:
- Recebe título, mensagem e destinatários
- Faz broadcast via WebSocket em tempo real
- Registra log da notificação

```typescript
sendNotification: adminProcedure
  .input(z.object({
    title: z.string().min(1),
    message: z.string().min(1),
    recipients: z.enum(["all", "free", "pro", "enterprise"]),
  }))
  .mutation(async ({ input }) => {
    // ... lógica de envio ...
    broadcastNotification(notification); // Enviar via WebSocket
  })
```

#### 3. **Inicialização do Servidor** (`server/_core/index.ts`)

O WebSocket é inicializado junto com o servidor HTTP:
```typescript
setupWebSocket(server); // Antes de tRPC
```

### Frontend

#### 1. **Hook useWebSocket** (`client/src/hooks/useWebSocket.ts`)

Hook React que gerencia a conexão WebSocket com:
- ✅ Conexão autenticada com token JWT
- ✅ Reconexão automática com backoff exponencial
- ✅ Callbacks para eventos (onNotification, onConnected, onDisconnected, onError)
- ✅ Sincronização com mudanças de token (login/logout)

**Uso:**
```typescript
const { isConnected, send, disconnect, reconnect } = useWebSocket({
  onNotification: (notification) => {
    // Processar notificação recebida
  },
  onConnected: () => {
    // Conectado ao servidor
  },
  onDisconnected: () => {
    // Desconectado do servidor
  },
  onError: (error) => {
    // Erro na conexão
  },
});
```

#### 2. **Componente NotificationCenter** (`client/src/components/NotificationCenter.tsx`)

Componente que exibe notificações em tempo real com:
- ✅ Ícone de sino com contador de notificações não lidas
- ✅ Painel de notificações com lista scrollável
- ✅ Status de conexão WebSocket (ponto verde/vermelho)
- ✅ Som de notificação (Web Audio API)
- ✅ Toast de notificação
- ✅ Opção de marcar como lida
- ✅ Opção de remover notificação
- ✅ Opção de limpar tudo

#### 3. **Integração no App** (`client/src/App.tsx`)

O NotificationCenter é adicionado ao layout principal:
```typescript
<div className="fixed top-4 right-4 z-40">
  <NotificationCenter />
</div>
```

## 🔄 Fluxo de Notificação

```
1. Admin acessa painel de notificações
   ↓
2. Admin preenche título, mensagem e destinatários
   ↓
3. Admin clica em "Enviar Notificação"
   ↓
4. Frontend chama endpoint tRPC sendNotification
   ↓
5. Backend recebe requisição e:
   - Busca usuários no banco de dados
   - Faz broadcast via WebSocket
   ↓
6. Todos os usuários conectados recebem notificação
   ↓
7. Frontend exibe:
   - Toast com título e mensagem
   - Ícone de sino com contador
   - Painel de notificações com histórico
   - Som de notificação
```

## 🔐 Segurança

### Autenticação
- Todas as conexões WebSocket requerem token JWT válido
- Token é extraído da URL: `ws://localhost:3000/api/ws?token=<JWT_TOKEN>`
- Token é verificado antes de aceitar a conexão

### Autorização
- Apenas admin pode enviar notificações (via `adminProcedure`)
- Usuários podem receber notificações conforme seu plano

## 📊 Monitoramento

### Logs do Servidor
```
[WebSocket] Usuário {userId} conectado. Total: {count}
[WebSocket] Notificação enviada para {count} usuários, falhou em {count}
[Notifications] Notificação enviada: "{title}" para {count} usuários
```

### Status de Conexão
- Ponto verde: Conectado ao WebSocket
- Ponto vermelho: Desconectado do WebSocket

## 🧪 Testes

### Testar Envio de Notificação
1. Fazer login como admin
2. Navegar para `/admin/notifications`
3. Preencher título, mensagem e destinatários
4. Clicar em "Enviar Notificação"
5. Verificar se todos os usuários recebem a notificação

### Testar Reconexão
1. Abrir DevTools (F12)
2. Ir para Network
3. Filtrar por WebSocket
4. Desconectar a conexão (Close)
5. Verificar se reconecta automaticamente

### Testar Som de Notificação
1. Enviar uma notificação
2. Verificar se o som é reproduzido
3. Verificar volume do navegador

## 🚀 Próximas Melhorias

- [ ] Persistência de notificações no banco de dados
- [ ] Notificações push (PWA)
- [ ] Notificações por email
- [ ] Agendamento de notificações
- [ ] Segmentação avançada de usuários
- [ ] Analytics de notificações
- [ ] Testes A/B de notificações
- [ ] Integração com serviços de terceiros (Slack, Discord, etc.)

## 📝 Commits Relacionados

- `d5b858d` - feat: implementar sistema de notificações em tempo real com WebSocket

## 📚 Referências

- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [JWT Authentication](https://jwt.io/)
- [tRPC Documentation](https://trpc.io/)
