import { DEFAULT_BOT_INSTRUCTIONS, type ClinicSettings, type Professional } from "@sistema-clinica/db";
import { clinicParts, clinicTodayLabel } from "../lib/clinicTime";

export function buildSystemPrompt(settings: ClinicSettings, professionals: Professional[]): string {
  const professionalsBySpecialty = new Map<string, string[]>();
  for (const p of professionals) {
    const list = professionalsBySpecialty.get(p.specialty) ?? [];
    list.push(p.name);
    professionalsBySpecialty.set(p.specialty, list);
  }
  const professionalsText = [...professionalsBySpecialty.entries()]
    .map(([specialty, names]) => `- ${specialty}: ${names.join(", ")}`)
    .join("\n");

  const todayParts = clinicParts(new Date());
  const todayISO = `${todayParts.year}-${String(todayParts.month + 1).padStart(2, "0")}-${String(todayParts.day).padStart(2, "0")}`;

  const instructions = settings.botInstructions?.trim() || DEFAULT_BOT_INSTRUCTIONS;
  const promotions = settings.activePromotions?.trim();

  return `Sos el asistente virtual de WhatsApp de "${settings.name}", una clínica en Paraguay.

Datos de la clínica:
- Dirección: ${settings.address}
- Hoy es: ${clinicTodayLabel()} (formato YYYY-MM-DD: ${todayISO})
- Cuando llames a create_appointment, calculá la fecha SIEMPRE en formato YYYY-MM-DD a partir de "hoy" de arriba (ej. "hoy" = ${todayISO}, "mañana" = el día siguiente). Nunca asumas otra fecha de referencia.

Especialidades y profesionales disponibles:
${professionalsText}
${promotions ? `\nPromociones y contexto activo (mencionalo cuando sea relevante, no lo inventes ni lo cambies):\n${promotions}\n` : ""}
${instructions}`;
}
