import { Router } from "express";
import { prisma } from "@sistema-clinica/db";
import { verifyYCloudSignature, downloadMedia } from "./services/ycloud";
import { transcribeAudio } from "./services/transcription";
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
  if (!message || (message.type !== "text" && message.type !== "audio")) return;

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
    const text = message.type === "audio" ? await transcribeIncomingAudio(message.audio) : message.text.body;
    if (text === null) return;

    await handleIncomingMessage(message.from, text, message.customerProfile?.name);
  } catch (err) {
    console.error("[webhook] error procesando mensaje entrante:", err);
  }
});

async function transcribeIncomingAudio(audio: { link: string; mime_type: string } | undefined): Promise<string | null> {
  if (!audio?.link) return null;

  console.log("[webhook] transcribiendo nota de voz entrante...");
  const buffer = await downloadMedia(audio.link);
  const text = await transcribeAudio(buffer, audio.mime_type);
  console.log(`[webhook] audio transcripto: "${text}"`);

  return text;
}
