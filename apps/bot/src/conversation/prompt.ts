import { DEFAULT_BOT_INSTRUCTIONS, type ClinicSettings, type Professional } from "@sistema-clinica/db";

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

  const today = new Date().toLocaleDateString("es-PY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Asuncion",
  });

  const instructions = settings.botInstructions?.trim() || DEFAULT_BOT_INSTRUCTIONS;
  const promotions = settings.activePromotions?.trim();

  return `Sos el asistente virtual de WhatsApp de "${settings.name}", una clínica en Paraguay.

Datos de la clínica:
- Dirección: ${settings.address}
- Hoy es: ${today}

Especialidades y profesionales disponibles:
${professionalsText}
${promotions ? `\nPromociones y contexto activo (mencionalo cuando sea relevante, no lo inventes ni lo cambies):\n${promotions}\n` : ""}
${instructions}`;
}
