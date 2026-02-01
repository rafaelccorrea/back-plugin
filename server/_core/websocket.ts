import { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyJWT } from "../services/authService";

interface WebSocketClient {
  ws: WebSocket;
  userId: string;
  isAlive: boolean;
}

const clients = new Map<string, WebSocketClient>();

export function setupWebSocket(server: HTTPServer) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", async (ws: WebSocket, req) => {
    try {
      // Extrair token da URL
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const token = url.searchParams.get("token");

      if (!token) {
        ws.close(1008, "Token não fornecido");
        return;
      }

      // Verificar token JWT
      const payload = verifyJWT(token);
      if (!payload || !payload.userId) {
        ws.close(1008, "Token inválido");
        return;
      }

      const userId = String(payload.userId);

      // Armazenar cliente
      clients.set(userId, {
        ws,
        userId,
        isAlive: true,
      });

      console.log(`[WebSocket] Usuário ${userId} conectado. Total: ${clients.size}`);

      // Enviar mensagem de confirmação
      ws.send(
        JSON.stringify({
          type: "connected",
          message: "Conectado ao servidor de notificações",
          userId,
        })
      );

      // Lidar com mensagens
      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          handleMessage(userId, message);
        } catch (error) {
          console.error("[WebSocket] Erro ao processar mensagem:", error);
        }
      });

      // Lidar com pong (heartbeat)
      ws.on("pong", () => {
        const client = clients.get(userId);
        if (client) {
          client.isAlive = true;
        }
      });

      // Lidar com desconexão
      ws.on("close", () => {
        clients.delete(userId);
        console.log(`[WebSocket] Usuário ${userId} desconectado. Total: ${clients.size}`);
      });

      // Lidar com erros
      ws.on("error", (error) => {
        console.error(`[WebSocket] Erro para usuário ${userId}:`, error);
      });
    } catch (error) {
      console.error("[WebSocket] Erro na conexão:", error);
      ws.close(1011, "Erro interno do servidor");
    }
  });

  // Heartbeat para manter conexões vivas
  const interval = setInterval(() => {
    clients.forEach((client) => {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(client.userId);
        return;
      }

      client.isAlive = false;
      client.ws.ping();
    });
  }, 30000); // A cada 30 segundos

  wss.on("close", () => {
    clearInterval(interval);
  });

  return wss;
}

function handleMessage(userId: string, message: any) {
  console.log(`[WebSocket] Mensagem de ${userId}:`, message);
  // Implementar lógica de mensagens conforme necessário
}

/**
 * Enviar notificação para um usuário específico
 */
export function sendNotificationToUser(userId: string, notification: any) {
  const client = clients.get(userId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(
      JSON.stringify({
        type: "notification",
        data: notification,
        timestamp: new Date().toISOString(),
      })
    );
    return true;
  }
  return false;
}

/**
 * Enviar notificação para todos os usuários conectados
 */
export function broadcastNotification(notification: any) {
  const sentTo: string[] = [];
  const failedTo: string[] = [];

  clients.forEach((client, userId) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(
          JSON.stringify({
            type: "notification",
            data: notification,
            timestamp: new Date().toISOString(),
          })
        );
        sentTo.push(userId);
      } catch (error) {
        console.error(`[WebSocket] Erro ao enviar para ${userId}:`, error);
        failedTo.push(userId);
      }
    } else {
      failedTo.push(userId);
    }
  });

  console.log(
    `[WebSocket] Notificação enviada para ${sentTo.length} usuários, falhou em ${failedTo.length}`
  );

  return { sentTo, failedTo };
}

/**
 * Enviar notificação para usuários com um plano específico
 */
export function broadcastNotificationToPlans(
  notification: any,
  plans: string[],
  userPlans: Map<string, string>
) {
  const sentTo: string[] = [];
  const failedTo: string[] = [];

  clients.forEach((client, userId) => {
    const userPlan = userPlans.get(userId);
    if (userPlan && plans.includes(userPlan)) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(
            JSON.stringify({
              type: "notification",
              data: notification,
              timestamp: new Date().toISOString(),
            })
          );
          sentTo.push(userId);
        } catch (error) {
          console.error(`[WebSocket] Erro ao enviar para ${userId}:`, error);
          failedTo.push(userId);
        }
      } else {
        failedTo.push(userId);
      }
    }
  });

  console.log(
    `[WebSocket] Notificação enviada para ${sentTo.length} usuários com planos ${plans.join(
      ", "
    )}, falhou em ${failedTo.length}`
  );

  return { sentTo, failedTo };
}

/**
 * Obter número de usuários conectados
 */
export function getConnectedUsersCount(): number {
  return clients.size;
}

/**
 * Obter lista de usuários conectados
 */
export function getConnectedUsers(): string[] {
  return Array.from(clients.keys());
}
