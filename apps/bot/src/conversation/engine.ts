import { prisma } from "@sistema-clinica/db";
import { sendWhatsAppText } from "../services/ycloud";
import { chatCompletion, type ChatMessage } from "../services/llm";
import { buildSystemPrompt } from "./prompt";
import { listProfessionalsTool, runListProfessionals, createAppointmentTool, runCreateAppointment } from "./tools";
import { reminderConfirmedMessage, reminderCancelledMessage } from "./messages";

type ReminderDraft = { reminderAppointmentId?: string };

const FOLLOW_UP_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function handleIncomingMessage(fromPhone: string, text: string, customerName?: string): Promise<void> {
  const patient = await prisma.patient.upsert({
    where: { phone: fromPhone },
    update: customerName ? { name: customerName } : {},
    create: { phone: fromPhone, name: customerName },
  });

  const priorMessages = await prisma.message.findMany({
    where: { patientId: patient.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  priorMessages.reverse();

  await prisma.message.create({ data: { patientId: patient.id, direction: "INBOUND", body: text } });

  // Reinicia la ventana de seguimiento de 24h cada vez que el paciente escribe.
  const now = new Date();
  await prisma.followUp.upsert({
    where: { patientId: patient.id },
    update: { lastInboundAt: now, windowExpiresAt: new Date(now.getTime() + FOLLOW_UP_WINDOW_MS), disabled: false, sentAt: null },
    create: { patientId: patient.id, lastInboundAt: now, windowExpiresAt: new Date(now.getTime() + FOLLOW_UP_WINDOW_MS) },
  });

  const state = await prisma.conversationState.upsert({
    where: { patientId: patient.id },
    update: {},
    create: { patientId: patient.id, step: "IDLE", context: {} },
  });

  const draft = (state.context as ReminderDraft) ?? {};

  let reply: string;
  if (state.step === "AWAITING_CONFIRMATION" && draft.reminderAppointmentId) {
    const result = await handleReminderReply(text, draft.reminderAppointmentId);
    reply = result.message;
    if (result.resolved) {
      await prisma.conversationState.update({
        where: { patientId: patient.id },
        data: { step: "IDLE", context: {} },
      });
    }
  } else {
    reply = await runAgentTurn(patient.id, priorMessages, text);
    await prisma.conversationState.update({
      where: { patientId: patient.id },
      data: { step: "IDLE", context: {} },
    });
  }

  await sendWhatsAppText(fromPhone, reply);
  await prisma.message.create({ data: { patientId: patient.id, direction: "OUTBOUND", body: reply } });
}

async function runAgentTurn(
  patientId: string,
  priorMessages: { direction: string; body: string }[],
  text: string
): Promise<string> {
  const [settings, professionals] = await Promise.all([
    prisma.clinicSettings.findFirst(),
    prisma.professional.findMany({ where: { active: true } }),
  ]);
  if (!settings) {
    throw new Error("No hay configuración de clínica. Corré el seed: pnpm db:seed");
  }

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(settings, professionals) },
    ...priorMessages.map((m): ChatMessage => ({
      role: m.direction === "INBOUND" ? "user" : "assistant",
      content: m.body,
    })),
    { role: "user", content: text },
  ];

  const tools = [listProfessionalsTool, createAppointmentTool];
  const first = await chatCompletion(messages, tools);

  if (first.tool_calls && first.tool_calls.length > 0) {
    messages.push(first);
    for (const call of first.tool_calls) {
      let result: unknown;
      if (call.function.name === "list_professionals") {
        result = await runListProfessionals(JSON.parse(call.function.arguments));
      } else if (call.function.name === "create_appointment") {
        result = await runCreateAppointment(patientId, JSON.parse(call.function.arguments));
      } else {
        result = { success: false, message: "Herramienta desconocida" };
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }

    const followUp = await chatCompletion(messages, tools);
    return followUp.content ?? "Listo.";
  }

  return first.content ?? "";
}

async function handleReminderReply(
  text: string,
  appointmentId: string
): Promise<{ message: string; resolved: boolean }> {
  const normalized = text.trim().toLowerCase();

  if (isAffirmative(normalized)) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    return { message: reminderConfirmedMessage, resolved: true };
  }

  if (isNegative(normalized)) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    return { message: reminderCancelledMessage, resolved: true };
  }

  return { message: "Respondé *confirmar* o *cancelar* para tu turno próximo.", resolved: false };
}

/** Usado por el cron de recordatorios para poner a un paciente en modo "esperando respuesta al recordatorio". */
export async function armReminderConfirmation(patientId: string, appointmentId: string): Promise<void> {
  await prisma.conversationState.upsert({
    where: { patientId },
    update: { step: "AWAITING_CONFIRMATION", context: { reminderAppointmentId: appointmentId } },
    create: { patientId, step: "AWAITING_CONFIRMATION", context: { reminderAppointmentId: appointmentId } },
  });
}

function isAffirmative(text: string): boolean {
  return ["si", "sí", "confirmar", "confirmo", "dale", "ok"].some((w) => text.includes(w));
}

function isNegative(text: string): boolean {
  return ["no", "cancelar", "cancelo"].some((w) => text.includes(w));
}
