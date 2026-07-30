import { prisma } from "@sistema-clinica/db";
import type { ToolDefinition } from "../services/llm";
import { checkAvailability, isSlotFree, type AvailabilityResult } from "../services/availability";
import { clinicDateTime } from "../lib/clinicTime";

export const listProfessionalsTool: ToolDefinition = {
  type: "function",
  function: {
    name: "list_professionals",
    description:
      "Lista los profesionales activos de una especialidad, para poder ofrecerle uno concreto al paciente antes de agendar.",
    parameters: {
      type: "object",
      properties: {
        specialty: { type: "string", description: "Especialidad a buscar, tal cual aparece en el prompt (ej. Odontología)" },
      },
      required: ["specialty"],
    },
  },
};

export async function runListProfessionals(args: { specialty: string }): Promise<{ professionals: { id: string; name: string }[] }> {
  const professionals = await prisma.professional.findMany({
    where: { specialty: args.specialty, active: true },
    select: { id: true, name: true },
  });
  return { professionals };
}

export const createAppointmentTool: ToolDefinition = {
  type: "function",
  function: {
    name: "create_appointment",
    description:
      "Crea un turno para el paciente con un profesional puntual. Llamar únicamente después de que el paciente confirmó explícitamente nombre, profesional (usar el id devuelto por list_professionals), fecha y hora.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre completo del paciente" },
        professionalId: { type: "string", description: "Id del profesional elegido, obtenido de list_professionals" },
        date: { type: "string", description: "Fecha del turno en formato YYYY-MM-DD" },
        time: { type: "string", description: "Hora del turno en formato HH:MM de 24 horas" },
      },
      required: ["name", "professionalId", "date", "time"],
    },
  },
};

interface CreateAppointmentArgs {
  name: string;
  professionalId: string;
  date: string;
  time: string;
}

export async function runCreateAppointment(
  patientId: string,
  args: CreateAppointmentArgs
): Promise<{ success: boolean; message: string }> {
  const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(args.date);
  const timeMatch = /^\d{2}:\d{2}$/.test(args.time);
  if (!dateMatch || !timeMatch) {
    return { success: false, message: "Datos del turno inválidos o incompletos." };
  }

  const [hour, minute] = args.time.split(":").map(Number);
  const date = clinicDateTime(args.date, hour, minute);

  if (date.getTime() < Date.now() - 60 * 60 * 1000) {
    return { success: false, message: "La fecha y hora ya pasaron. Pedile al paciente una fecha futura." };
  }

  const availability = await checkAvailability(args.professionalId, date);
  if (!availability.available) {
    return { success: false, message: unavailabilityMessage(availability) };
  }

  const free = await isSlotFree(args.professionalId, date);
  if (!free) {
    return { success: false, message: "Ese horario ya está ocupado. Ofrecele otro horario cercano." };
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (patient && args.name && patient.name !== args.name) {
    await prisma.patient.update({ where: { id: patientId }, data: { name: args.name } });
  }

  await prisma.appointment.create({
    data: { patientId, professionalId: args.professionalId, date, status: "PENDING", channel: "WHATSAPP" },
  });

  return {
    success: true,
    message: `Turno creado para ${args.name}, el ${args.date} a las ${args.time}.`,
  };
}

function unavailabilityMessage(result: Extract<AvailabilityResult, { available: false }>): string {
  switch (result.reason) {
    case "blackout":
      return `Ese día la clínica está cerrada${result.note ? ` (${result.note})` : ""}. Ofrecele otra fecha.`;
    case "exception":
      return "El profesional tiene bloqueada esa fecha puntual (ausencia excepcional, no es su horario habitual). Ofrecele otra fecha u otro profesional de la misma especialidad.";
    case "inactive":
      return "Ese profesional ya no está en actividad en la clínica. Ofrecele otro profesional de la misma especialidad.";
    case "day-off":
      return `El profesional no atiende los ${result.weekday}. Ofrecele otro día, o preguntale por otro profesional de la misma especialidad.`;
    case "out-of-hours":
      return `Ese horario está fuera del rango de atención del profesional (atiende de ${result.open} a ${result.close}). Ofrecele un horario dentro de ese rango.`;
  }
}
