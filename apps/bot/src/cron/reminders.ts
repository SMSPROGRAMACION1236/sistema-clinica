import cron from "node-cron";
import { prisma } from "@sistema-clinica/db";
import { env } from "../lib/env";
import { sendWhatsAppText } from "../services/ycloud";
import { reminderMessage } from "../conversation/messages";
import { armReminderConfirmation } from "../conversation/engine";
import { isNumberAllowed } from "../lib/allowlist";

const CHECK_INTERVAL_CRON = "*/15 * * * *"; // cada 15 minutos

export function startReminderCron(): void {
  cron.schedule(CHECK_INTERVAL_CRON, async () => {
    await sendPendingReminders().catch((err) => console.error("[cron] error enviando recordatorios:", err));
    await sweepNoShows().catch((err) => console.error("[cron] error marcando no-shows:", err));
  });

  console.log(`[cron] recordatorios activos (${CHECK_INTERVAL_CRON}), ${env.reminderHoursBefore}h antes del turno`);
}

async function sendPendingReminders(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + env.reminderHoursBefore * 60 * 60 * 1000);
  const windowEnd = new Date(windowStart.getTime() + 15 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      reminderSentAt: null,
      date: { gte: windowStart, lt: windowEnd },
    },
    include: { patient: true, professional: true },
  });

  for (const appointment of appointments) {
    if (!isNumberAllowed(appointment.patient.phone)) continue;

    const text = reminderMessage({
      date: appointment.date,
      hour: appointment.date.getHours(),
      minute: appointment.date.getMinutes(),
      professionalName: appointment.professional.name,
    });

    await sendWhatsAppText(appointment.patient.phone, text);
    await prisma.message.create({
      data: { patientId: appointment.patientId, direction: "OUTBOUND", body: text },
    });
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { reminderSentAt: now },
    });
    await armReminderConfirmation(appointment.patientId, appointment.id);
  }
}

/** Turnos cuya hora ya pasó (+ margen) y nadie marcó como completado/cancelado: se registran como no-show. */
async function sweepNoShows(): Promise<void> {
  const cutoff = new Date(Date.now() - env.reminderCutoffMinutes * 60 * 1000);

  await prisma.appointment.updateMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      date: { lt: cutoff },
    },
    data: { status: "NO_SHOW" },
  });
}
