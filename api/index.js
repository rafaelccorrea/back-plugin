/**
 * Rota GET /api na Vercel (responde na raiz após rewrite / -> /api).
 * Responde "Hello World" para garantir que a raiz não retorne 404.
 */
export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({ message: "Hello World", docs: "/api/docs", trpc: "/api/trpc" });
}
