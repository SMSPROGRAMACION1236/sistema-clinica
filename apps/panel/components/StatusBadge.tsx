import type { StatusMeta } from "@/lib/status";

const toneClasses: Record<StatusMeta["tone"], string> = {
  good: "bg-status-good-wash text-status-good",
  warning: "bg-status-warning-wash text-status-warning",
  serious: "bg-status-serious-wash text-status-serious",
  critical: "bg-status-critical-wash text-status-critical",
  neutral: "bg-status-neutral-wash text-status-neutral",
};

export function StatusBadge({ meta }: { meta: StatusMeta }) {
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[meta.tone]}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      {meta.label}
    </span>
  );
}
