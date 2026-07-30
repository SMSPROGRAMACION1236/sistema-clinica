import cron from "node-cron";
import { prisma } from "@sistema-clinica/db";
import { env } from "../lib/env";
import { sendWhatsAppText } from "../services/ycloud";
import { followUpNudgeMessage } from "../conversation/messages";
import { isNumberAllowed } from "../lib/allowlist";

const CHECK_INTERVAL_CRON = "*/15 * * * *"; // cada 15 minutos

export function startFollowUpCron(): void {
  cron.schedule(CHECK_INTERVAL_CRON, async () => {
    await sendPendingFollowUps().catch((err) => console.error("[cron] error enviando seguimientos:", err));
  });

  console.log(`[cron] seguimientos activos (${CHECK_INTERVAL_CRON}), delay ${env.followupDelayMinutes} min`);
}

/** Conversaciones sin respuesta del paciente: dispara un nudge antes de que cierre la ventana de 24h de WhatsApp. */
async function sendPendingFollowUps(): Promise<void> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - env.followupDelayMinutes * 60 * 1000);

  const pending = await prisma.followUp.findMany({
    where: {
      disabled: false,
      sentAt: null,
      lastInboundAt: { lte: cutoff },
      windowExpiresAt: { gt: now },
    },
    include: { patient: true },
  });

  for (const followUp of pending) {
    if (!isNumberAllowed(followUp.patient.phone)) continue;

    const text = followUpNudgeMessage();
    await sendWhatsAppText(followUp.patient.phone, text);
    await prisma.message.create({
      data: { patientId: followUp.patientId, direction: "OUTBOUND", body: text },
    });
    await prisma.followUp.update({
      where: { id: followUp.id },
      data: { sentAt: now },
    });
  }
}
