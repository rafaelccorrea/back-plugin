import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { createApp } from "../app";
import { serveStatic, setupVite } from "./vite";
import { isResendConfigured } from "../services/emailService";
import { setupWebSocket } from "./websocket";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = createApp();
  const server = createServer(app);

  // WebSocket não é suportado na Vercel (serverless); só ativa em Node
  if (!process.env.VERCEL) {
    setupWebSocket(server);
  }

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    if (!process.env.VERCEL) {
      console.log(`WebSocket disponível em ws://localhost:${port}/api/ws`);
    }
    if (isResendConfigured()) {
      console.log("[Email] Resend configurado – emails de verificação e recuperação de senha ativos.");
    } else {
      console.warn("[Email] Resend NÃO configurado – defina RESEND_API_KEY e FROM_EMAIL no .env para enviar emails.");
    }
  });
}

startServer().catch(console.error);
