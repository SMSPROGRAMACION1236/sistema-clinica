/**
 * Toda la lógica de disponibilidad depende de la hora "de pared" de la
 * clínica (America/Asuncion). A propósito NUNCA usamos
 * Date.prototype.getHours()/getDay() sobre un Date construido con
 * `new Date(str)`/`setHours()`, ni `toLocaleDateString` con `timeZone` —
 * todo eso depende de la configuración de zona horaria del proceso
 * (variable TZ + base de datos de zonas del sistema operativo), que en
 * contenedores Alpine es poco confiable incluso con `tzdata` instalado.
 *
 * En cambio, desplazamos el instante UTC a mano por un offset fijo y
 * leemos con los getters *UTC*, que son siempre deterministas sin
 * importar cómo esté configurado el contenedor.
 *
 * Paraguay no tiene horario de verano desde 2024 — el offset es UTC-4 fijo
 * todo el año. Si eso cambiara, actualizar esta única constante.
 */
const CLINIC_UTC_OFFSET_MINUTES = -4 * 60;

const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export interface ClinicParts {
  year: number;
  month: number; // 0-11
  day: number;
  weekday: number; // 0=domingo .. 6=sábado
  hours: number;
  minutes: number;
}

/** Instante UTC real correspondiente a una fecha/hora de pared de la clínica ("YYYY-MM-DD", HH, MM). */
export function clinicDateTime(dateStr: string, hour: number, minute: number): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const fakeUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  return new Date(fakeUtcMs - CLINIC_UTC_OFFSET_MINUTES * 60 * 1000);
}

/** Componentes de fecha/hora de pared de la clínica para un instante UTC real. */
export function clinicParts(instant: Date): ClinicParts {
  const fake = new Date(instant.getTime() + CLINIC_UTC_OFFSET_MINUTES * 60 * 1000);
  return {
    year: fake.getUTCFullYear(),
    month: fake.getUTCMonth(),
    day: fake.getUTCDate(),
    weekday: fake.getUTCDay(),
    hours: fake.getUTCHours(),
    minutes: fake.getUTCMinutes(),
  };
}

/** Medianoche (hora de pared de la clínica) del día que contiene `instant`, como instante UTC real. */
export function clinicStartOfDay(instant: Date): Date {
  const p = clinicParts(instant);
  const dateStr = `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  return clinicDateTime(dateStr, 0, 0);
}

/** Texto legible ("jueves, 30 de julio") de un instante cualquiera, en hora de la clínica. */
export function clinicDateLabel(instant: Date): string {
  const p = clinicParts(instant);
  return `${WEEKDAY_NAMES[p.weekday]}, ${p.day} de ${MONTH_NAMES[p.month]}`;
}

/** Texto legible ("jueves, 30 de julio de 2026") para mostrarle al LLM en el prompt. */
export function clinicTodayLabel(): string {
  const p = clinicParts(new Date());
  return `${WEEKDAY_NAMES[p.weekday]}, ${p.day} de ${MONTH_NAMES[p.month]} de ${p.year}`;
}
