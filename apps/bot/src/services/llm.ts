import { env } from "../lib/env";

const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: ChatRole;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export async function chatCompletion(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatMessage> {
  const res = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openrouterApiKey}`,
    },
    body: JSON.stringify({
      model: env.openrouterModel,
      messages,
      ...(tools ? { tools, tool_choice: "auto" } : {}),
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`OpenRouter rechazó la solicitud (${res.status}): ${errorBody}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0]?.message;
  if (!choice) {
    throw new Error(`Respuesta de OpenRouter sin mensaje: ${JSON.stringify(data)}`);
  }
  return choice as ChatMessage;
}
