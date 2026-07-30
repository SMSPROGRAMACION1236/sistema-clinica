import { Router } from "express";
import { prisma } from "@sistema-clinica/db";
import { verifyYCloudSignature } from "./services/ycloud";
import { handleIncomingMessage } from "./conversation/engine";
import { isNumberAllowed } from "./lib/allowlist";

export const webhookRouter = Router();

webhookRouter.post("/webhook/ycloud", async (req, res) => {
  const rawBody = (req as unknown as { rawBody: string }).rawBody;
  const signature = req.header("YCloud-Signature");

  if (!verifyYCloudSignature(rawBody, signature)) {
    console.warn(`[webhook] firma inválida o ausente. Header recibido: ${signature ?? "(ninguno)"}`);
    res.status(401).send("Firma inválida");
    return;
  }

  res.status(200).send("ok"); // responde rápido, YCloud reintenta si no

  const event = req.body;
  if (event?.type !== "whatsapp.inbound_message.received") return;

  const message = event.whatsappInboundMessage;
  if (!message || message.type !== "text") return;

  if (!isNumberAllowed(message.from)) {
    console.log("[webhook] mensaje ignorado (número no autorizado)");
    return;
  }

  const settings = await prisma.clinicSettings.findFirst();
  if (settings && !settings.botEnabled) {
    console.log("[webhook] mensaje ignorado (bot apagado desde el panel)");
    return;
  }

  try {
    await handleIncomingMessage(message.from, message.text.body, message.customerProfile?.name);
  } catch (err) {
    console.error("[webhook] error procesando mensaje entrante:", err);
  }
});
