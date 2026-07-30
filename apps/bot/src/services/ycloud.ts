import crypto from "node:crypto";
import { env } from "../lib/env";

const YCLOUD_API_BASE = "https://api.ycloud.com/v2";

export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  const res = await fetch(`${YCLOUD_API_BASE}/whatsapp/messages/sendDirectly`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.ycloudApiKey,
    },
    body: JSON.stringify({
      from: env.whatsappBusinessNumber,
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`YCloud rechazó el envío de mensaje (${res.status}): ${errorBody}`);
  }
}

/**
 * Descarga el contenido de un media entrante (ej. audio de un mensaje de voz).
 * El link que manda YCloud en el webhook (ej. `whatsappInboundMessage.audio.link`)
 * requiere el mismo header X-API-Key para poder descargarse.
 */
export async function downloadMedia(link: string): Promise<Buffer> {
  const res = await fetch(link, {
    headers: { "X-API-Key": env.ycloudApiKey },
  });

  if (!res.ok) {
    throw new Error(`YCloud rechazó la descarga del media (${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * YCloud manda un único header "YCloud-Signature: t={timestamp},s={signature}".
 * La firma es HMAC-SHA256 de "{timestamp}.{rawBody}" con el webhook secret.
 * Ver: https://docs.ycloud.com/reference/webhook-integration-guide
 */
export function verifyYCloudSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.trim().split("=");
      return [key, value];
    })
  );
  const timestamp = parts.t;
  const signature = parts.s;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto.createHmac("sha256", env.ycloudWebhookSecret).update(signedPayload).digest("hex");

  const expected = Buffer.from(expectedSignature, "hex");
  const received = Buffer.from(signature, "hex");
  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(expected, received);
}
