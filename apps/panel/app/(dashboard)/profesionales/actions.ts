"use server";

import { prisma } from "@sistema-clinica/db";
import { revalidatePath } from "next/cache";

function atMidnight(dateStr: string): Date {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Alterna la disponibilidad puntual de un profesional para una fecha exacta. */
export async function toggleProfessionalAvailability(professionalId: string, formData: FormData) {
  const dateStr = String(formData.get("date") ?? "");
  if (!dateStr) return;
  const date = atMidnight(dateStr);

  const existing = await prisma.professionalAvailabilityException.findUnique({
    where: { professionalId_date: { professionalId, date } },
  });

  if (existing) {
    await prisma.professionalAvailabilityException.delete({ where: { id: existing.id } });
  } else {
    await prisma.professionalAvailabilityException.create({
      data: { professionalId, date, available: false },
    });
  }

  revalidatePath("/profesionales");
}

/** Alterna un día bloqueado general (feriado/cierre): ningún profesional ofrece turnos ese día. */
export async function toggleBlackoutDay(formData: FormData) {
  const dateStr = String(formData.get("date") ?? "");
  if (!dateStr) return;
  const reason = String(formData.get("reason") ?? "").trim();
  const date = atMidnight(dateStr);

  const existing = await prisma.blackoutDay.findUnique({ where: { date } });

  if (existing) {
    await prisma.blackoutDay.delete({ where: { id: existing.id } });
  } else {
    await prisma.blackoutDay.create({ data: { date, reason: reason || null } });
  }

  revalidatePath("/profesionales");
}
