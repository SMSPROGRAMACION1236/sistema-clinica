function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisá tu archivo .env`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  ycloudApiKey: required("YCLOUD_API_KEY"),
  ycloudWebhookSecret: required("YCLOUD_WEBHOOK_SECRET"),
  whatsappBusinessNumber: required("WHATSAPP_BUSINESS_NUMBER"),
  openrouterApiKey: required("OPENROUTER_API_KEY"),
  openrouterModel: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
  openrouterTranscriptionModel: process.env.OPENROUTER_TRANSCRIPTION_MODEL ?? "openai/whisper-large-v3-turbo",
  reminderHoursBefore: Number(process.env.REMINDER_HOURS_BEFORE ?? 24),
  reminderCutoffMinutes: Number(process.env.REMINDER_CUTOFF_MINUTES ?? 120),
  // Delay del seguimiento automático de leads fríos (ventana de 24h de WhatsApp).
  // En producción son ~23h (1380 min) para dejar margen antes de que cierre la
  // ventana real de 24h de la plataforma; para grabar demos se puede bajar a
  // minutos. Es configuración legítima, no un secreto — sí va en .env.example.
  followupDelayMinutes: Number(process.env.FOLLOWUP_DELAY_MINUTES ?? 1380),
  timezone: process.env.TZ ?? "America/Asuncion",
};
