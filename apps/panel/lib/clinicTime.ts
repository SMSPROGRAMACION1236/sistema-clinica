/**
 * Mismo problema y misma solución que en apps/bot/src/lib/clinicTime.ts:
 * los filtros de "turnos de hoy" no pueden depender de la zona horaria del
 * proceso (Date.prototype.getHours()/setHours() local), porque en un
 * contenedor Alpine mal configurado eso puede terminar comparando contra el
 * día equivocado. Desplazamos el instante UTC a mano por un offset fijo
 * (América/Asunción, UTC-4 todo el año desde que Paraguay sacó el horario
 * de verano en 2024) y leemos con los getters UTC, que son siempre
 * deterministas sin importar la configuración del contenedor.
 */
const CLINIC_UTC_OFFSET_MINUTES = -4 * 60;

interface ClinicParts {
  year: number;
  month: number; // 0-11
  day: number;
}

function clinicParts(instant: Date): ClinicParts {
  const fake = new Date(instant.getTime() + CLINIC_UTC_OFFSET_MINUTES * 60 * 1000);
  return { year: fake.getUTCFullYear(), month: fake.getUTCMonth(), day: fake.getUTCDate() };
}

function fromClinicParts(year: number, month: number, day: number): Date {
  const fakeUtcMs = Date.UTC(year, month, day, 0, 0, 0, 0);
  return new Date(fakeUtcMs - CLINIC_UTC_OFFSET_MINUTES * 60 * 1000);
}

/** Medianoche (hora de pared de la clínica) del día que contiene `instant`, como instante UTC real. */
export function clinicStartOfDay(instant: Date): Date {
  const p = clinicParts(instant);
  return fromClinicParts(p.year, p.month, p.day);
}

/** Medianoche del día 1 del mes (hora de pared de la clínica) que contiene `instant`. */
export function clinicStartOfMonth(instant: Date): Date {
  const p = clinicParts(instant);
  return fromClinicParts(p.year, p.month, 1);
}

/** Valor "YYYY-MM-DD" (hora de pared de la clínica) para un <input type="date">. */
export function toClinicDateInputValue(instant: Date): string {
  const p = clinicParts(instant);
  return `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/**
 * Medianoche de la clínica (instante UTC real) para un string "YYYY-MM-DD"
 * que viene de un <input type="date">. Usar esto (no `new Date(dateStr)`)
 * para guardar BlackoutDay/ProfessionalAvailabilityException — tienen que
 * coincidir exactamente con lo que `checkAvailability` busca del lado del
 * bot (misma definición de "medianoche de la clínica").
 */
export function clinicDateFromDateInput(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return fromClinicParts(year, month - 1, day);
}
