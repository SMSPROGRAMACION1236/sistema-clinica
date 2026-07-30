import { DEMO_ONLY_ALLOWED_NUMBERS } from "./demoAllowlist";

const onlyDigits = (phone: string) => phone.replace(/\D/g, "");

/** Sin números cargados en DEMO_ONLY_ALLOWED_NUMBERS, el bot responde a cualquier número (modo producción). */
export function isNumberAllowed(phone: string): boolean {
  if (DEMO_ONLY_ALLOWED_NUMBERS.length === 0) return true;
  const normalized = onlyDigits(phone);
  return DEMO_ONLY_ALLOWED_NUMBERS.some((allowed) => onlyDigits(allowed) === normalized);
}
