import { env } from "../lib/env";

const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

/**
 * WhatsApp manda notas de voz típicamente como audio/ogg (codec opus).
 * OpenRouter espera uno de: wav, mp3, flac, m4a, ogg, webm, aac.
 */
function formatFromMimeType(mimeType: string): string {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "audio/ogg": "ogg",
    "audio/opus": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/aac": "aac",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/webm": "webm",
    "audio/flac": "flac",
  };
  return map[base] ?? "ogg";
}

/** Transcribe un audio (nota de voz de WhatsApp) a texto usando un modelo de OpenRouter. */
export async function transcribeAudio(audio: Buffer, mimeType: string): Promise<string> {
  const res = await fetch(`${OPENROUTER_API_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openrouterApiKey}`,
    },
    body: JSON.stringify({
      model: env.openrouterTranscriptionModel,
      input_audio: {
        data: audio.toString("base64"),
        format: formatFromMimeType(mimeType),
      },
      language: "es",
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`OpenRouter rechazó la transcripción (${res.status}): ${errorBody}`);
  }

  const data = (await res.json()) as { text?: string };
  if (!data.text) {
    throw new Error(`Respuesta de transcripción sin texto: ${JSON.stringify(data)}`);
  }
  return data.text.trim();
}
