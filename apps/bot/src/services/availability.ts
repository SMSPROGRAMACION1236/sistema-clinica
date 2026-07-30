import { prisma } from "@sistema-clinica/db";

type DayHours = { enabled: boolean; open: string; close: string };
type WeeklyHours = { mon: DayHours; tue: DayHours; wed: DayHours; thu: DayHours; fri: DayHours; sat: DayHours; sun: DayHours };

const WEEKDAY_KEYS: Array<keyof WeeklyHours> = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Disponibilidad de un profesional en una fecha puntual, resuelta en 3 niveles:
 * 1) BlackoutDay (corte duro general, feriado/cierre) — gana siempre.
 * 2) ProfessionalAvailabilityException (puntual, por profesional+fecha).
 * 3) Professional.weeklyAvailability (horario semanal default) + Professional.active.
 */
export async function isProfessionalAvailableOn(professionalId: string, date: Date): Promise<boolean> {
  const day = startOfDay(date);

  const blackout = await prisma.blackoutDay.findUnique({ where: { date: day } });
  if (blackout) return false;

  const exception = await prisma.professionalAvailabilityException.findUnique({
    where: { professionalId_date: { professionalId, date: day } },
  });
  if (exception) return exception.available;

  const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
  if (!professional || !professional.active) return false;

  const weekday = WEEKDAY_KEYS[date.getDay()];
  const hours = (professional.weeklyAvailability as unknown as WeeklyHours)[weekday];
  if (!hours?.enabled) return false;

  return isWithinRange(date, hours.open, hours.close);
}

function isWithinRange(date: Date, open: string, close: string): boolean {
  const minutesOfDay = date.getHours() * 60 + date.getMinutes();
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
