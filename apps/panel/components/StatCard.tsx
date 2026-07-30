import type { LucideIcon } from "lucide-react";
import type { Tone } from "@/lib/status";

const toneClasses: Record<Tone, string> = {
  good: "bg-status-good-wash text-status-good",
  warning: "bg-status-warning-wash text-status-warning",
  serious: "bg-status-serious-wash text-status-serious",
  critical: "bg-status-critical-wash text-status-critical",
  neutral: "bg-accent-wash text-accent",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-secondary">{label}</p>
        <span className={`rounded-lg p-1.5 ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-ink-primary">{value}</p>
    </div>
  );
}
