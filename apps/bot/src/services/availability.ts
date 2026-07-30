import { prisma } from "@sistema-clinica/db";
import { clinicParts, clinicStartOfDay } from "../lib/clinicTime";

type DayHours = { enabled: boolean; open: string; close: string };
type WeeklyHours = { mon: DayHours; tue: DayHours; wed: DayHours; thu: DayHours; fri: DayHours; sat: DayHours; sun: DayHours };

const WEEKDAY_KEYS: Array<keyof WeeklyHours> = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_LABELS_ES: Record<string, string> = {
  mon: "lunes", tue: "martes", wed: "miércoles", thu: "jueves", fri: "viernes", sat: "sábado", sun: "domingo",
};

export type AvailabilityResult =
  | { available: true }
  | { available: false; reason: "blackout"; note: string | null }
  | { available: false; reason: "exception" }
  | { available: false; reason: "inactive" }
  | { available: false; reason: "day-off"; weekday: string }
  | { available: false; reason: "out-of-hours"; open: string; close: string };

/**
 * Disponibilidad de un profesional en una fecha puntual, resuelta en 3 niveles:
 * 1) BlackoutDay (corte duro general, feriado/cierre) — gana siempre.
 * 2) ProfessionalAvailabilityException (puntual, por profesional+fecha).
 * 3) Professional.weeklyAvailability (horario semanal default) + Professional.active.
 *
 * Devuelve el motivo exacto de rechazo para que el bot pueda explicarle al
 * paciente por qué (feriado, día puntual bloqueado, día que no atiende, o
 * fuera de su rango horario) en vez de un mensaje genérico.
 *
 * Todos los cálculos de día/hora usan la hora de pared de la clínica
 * (ver lib/clinicTime.ts), no la zona horaria del proceso.
 */
export async function checkAvailability(professionalId: string, date: Date): Promise<AvailabilityResult> {
  const day = clinicStartOfDay(date);

  const blackout = await prisma.blackoutDay.findUnique({ where: { date: day } });
  if (blackout) return { available: false, reason: "blackout", note: blackout.reason };

  const exception = await prisma.professionalAvailabilityException.findUnique({
    where: { professionalId_date: { professionalId, date: day } },
  });
  if (exception) {
    return exception.available ? { available: true } : { available: false, reason: "exception" };
  }

  const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
  if (!professional || !professional.active) return { available: false, reason: "inactive" };

  const parts = clinicParts(date);
  const weekdayKey = WEEKDAY_KEYS[parts.weekday];
  const hours = (professional.weeklyAvailability as unknown as WeeklyHours)[weekdayKey];
  if (!hours?.enabled) return { available: false, reason: "day-off", weekday: WEEKDAY_LABELS_ES[weekdayKey] };

  if (!isWithinRange(parts.hours, parts.minutes, hours.open, hours.close)) {
    return { available: false, reason: "out-of-hours", open: hours.open, close: hours.close };
  }

  return { available: true };
}

export async function isProfessionalAvailableOn(professionalId: string, date: Date): Promise<boolean> {
  const result = await checkAvailability(professionalId, date);
  return result.available;
}

function isWithinRange(hours: number, minutes: number, open: string, close: string): boolean {
  const minutesOfDay = hours * 60 + minutes;
  const [openH, openM] = open.split(":").map(Number);
  const [closeH, closeM] = close.split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  return minutesOfDay >= openMinutes && minutesOfDay < closeMinutes;
}

/** No hay otro turno PENDING/CONFIRMED con el mismo profesional en el mismo horario exacto. */
export async function isSlotFree(professionalId: string, date: Date): Promise<boolean> {
  const existing = await prisma.appointment.findFirst({
    where: { professionalId, date, status: { in: ["PENDING", "CONFIRMED"] } },
  });
  return !existing;
}
