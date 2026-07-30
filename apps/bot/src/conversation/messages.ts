export function reminderMessage(params: { date: Date; hour: number; minute: number; professionalName: string }): string {
  const dateLabel = params.date.toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long" });
  const timeLabel = `${String(params.hour).padStart(2, "0")}:${String(params.minute).padStart(2, "0")}`;
  return (
    `¡Hola! Te recordamos tu turno con ${params.professionalName} para ${dateLabel} a las ${timeLabel}.\n\n` +
    `¿Confirmás? Respondé *confirmar* o *cancelar*.`
  );
}

export const reminderConfirmedMessage = "¡Genial! Tu turno queda confirmado. Te esperamos 🙌";
export const reminderCancelledMessage =
  "Gracias por avisar. Liberamos ese horario para otro paciente. ¡Esperamos verte en otra ocasión!";

export function followUpNudgeMessage(): string {
  return "¡Hola de nuevo! ¿Seguís con dudas sobre el turno o hay algo más en lo que te pueda ayudar? Con gusto seguimos por acá.";
}
