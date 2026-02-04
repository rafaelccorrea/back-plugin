import * as crypto from "node:crypto";
import { getDb, getWebhookByUserId } from "../db";
import { webhooks } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const OUTGOING_EVENTS = [
  "lead.created",
  "lead.updated",
  "appointment.created",
  "appointment.updated",
] as const;
export type OutgoingEvent = (typeof OUTGOING_EVENTS)[number];

function parseEvents(eventsJson: string): OutgoingEvent[] {
  try {
    const arr = JSON.parse(eventsJson) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((e): e is OutgoingEvent => typeof e === "string" && OUTGOING_EVENTS.includes(e as OutgoingEvent));
  } catch {
    return [];
  }
}

export async function getOutgoingWebhookConfig(userId: number) {
  const row = await getWebhookByUserId(userId, false);
  if (!row || !row.isActive) return null;
  return {
    id: row.id,
    url: row.url,
    events: parseEvents(row.events),
    isActive: row.isActive,
    lastTriggeredAt: row.lastTriggeredAt,
    failureCount: row.failureCount ?? 0,
  };
}

const WEBHOOK_TIMEOUT_MS = 12_000;
const CHALLENGE_TYPE = "webhook_challenge";
const ACK_HEADER = "x-webhook-ack";

/**
 * Envia um challenge para o endpoint; só considera sucesso se retornar 2xx e ack com o nonce.
 * Exige que o servidor do usuário confirme antes de receber os dados (cybersegurança).
 */
async function sendChallengeAndVerify(
  url: string,
  nonce: string,
  headers: Record<string, string>,
  secret: string | null
): Promise<boolean> {
  const challengeBody = JSON.stringify({
    type: CHALLENGE_TYPE,
    nonce,
    timestamp: new Date().toISOString(),
  });
  const challengeHeaders = { ...headers };
  if (secret?.trim()) {
    const sig = crypto.createHmac("sha256", secret.trim()).update(challengeBody, "utf8").digest("hex");
    challengeHeaders["X-Webhook-Signature"] = `sha256=${sig}`;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...challengeHeaders, "Content-Type": "application/json" },
      body: challengeBody,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return false;
    const ackHeader = res.headers.get(ACK_HEADER)?.trim();
    if (ackHeader === nonce) return true;
    const text = await res.text();
    try {
      const json = JSON.parse(text) as unknown;
      if (typeof json === "object" && json !== null && "ack" in json && (json as { ack: unknown }).ack === true) {
        const bodyNonce = (json as { nonce?: string }).nonce;
        if (bodyNonce === nonce) return true;
      }
    } catch {
      /* ignore parse */
    }
    return false;
  } catch {
    clearTimeout(timeout);
    return false;
  }
}

/**
 * Dispara o webhook do usuário para o evento (não bloqueia a resposta).
 * Fluxo de segurança: primeiro envia um challenge; só envia o payload se o endpoint
 * retornar status 2xx e confirmar o nonce (header X-Webhook-Ack ou body { ack: true, nonce }).
 * Se o endpoint não confirmar, os dados não são enviados e o failureCount é incrementado.
 */
export async function dispatchOutgoingWebhook(
  userId: number,
  event: OutgoingEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const row = await getWebhookByUserId(userId, true);
  if (!row) return;
  const db = await getDb();
  if (!db) return;
  const events = parseEvents(row.events);
  if (!events.includes(event)) return;

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = row.secret?.trim();
  if (secret) {
    const sig = crypto.createHmac("sha256", secret.trim()).update(body, "utf8").digest("hex");
    headers["X-Webhook-Signature"] = `sha256=${sig}`;
  }

  const nonce = crypto.randomBytes(16).toString("hex");

  // Fire-and-forget: challenge primeiro; só envia payload se o servidor confirmar
  (async () => {
    const db2 = await getDb();
    if (!db2) return;
    try {
      const acked = await sendChallengeAndVerify(row.url, nonce, headers, row.secret ?? null);
      if (!acked) {
        await db2
          .update(webhooks)
          .set({ failureCount: (row.failureCount ?? 0) + 1 })
          .where(eq(webhooks.id, row.id));
        return;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
      try {
        const res = await fetch(row.url, {
          method: "POST",
          headers,
          body,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          await db2.update(webhooks).set({ lastTriggeredAt: new Date() }).where(eq(webhooks.id, row.id));
        } else {
          await db2
            .update(webhooks)
            .set({ failureCount: (row.failureCount ?? 0) + 1 })
            .where(eq(webhooks.id, row.id));
        }
      } catch {
        clearTimeout(timeout);
        await db2
          .update(webhooks)
          .set({ failureCount: (row.failureCount ?? 0) + 1 })
          .where(eq(webhooks.id, row.id));
      }
    } catch {
      await db2
        .update(webhooks)
        .set({ failureCount: (row.failureCount ?? 0) + 1 })
        .where(eq(webhooks.id, row.id));
    }
  })();
}
