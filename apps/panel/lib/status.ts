import { Clock, CheckCircle2, XCircle, AlertTriangle, CheckCheck, MessageCircle, Store, type LucideIcon } from "lucide-react";

export type Tone = "good" | "warning" | "serious" | "critical" | "neutral";

export interface StatusMeta {
  label: string;
  tone: Tone;
  icon: LucideIcon;
}

export const appointmentStatusMeta: Record<string, StatusMeta> = {
  PENDING: { label: "Pendiente", tone: "warning", icon: Clock },
  CONFIRMED: { label: "Confirmado", tone: "good", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelado", tone: "neutral", icon: XCircle },
  NO_SHOW: { label: "Ausente", tone: "critical", icon: AlertTriangle },
  COMPLETED: { label: "Asistió", tone: "good", icon: CheckCheck },
};

export const channelMeta: Record<string, StatusMeta> = {
  WHATSAPP: { label: "WhatsApp", tone: "good", icon: MessageCircle },
  MOSTRADOR: { label: "Mostrador", tone: "neutral", icon: Store },
};
