/**
 * Handler serverless para Vercel (deploy só-backend).
 * Garante que req.url tenha o prefixo /api para as rotas do Express baterem.
 */
import { createApp } from "../dist/api-handler.js";

const app = createApp();

export default function handler(req, res) {
  const url = req.url || "/";
  if (url.startsWith("/") && !url.startsWith("/api")) {
    req.url = "/api" + (url === "/" ? "" : url);
  }
  return app(req, res);
}
