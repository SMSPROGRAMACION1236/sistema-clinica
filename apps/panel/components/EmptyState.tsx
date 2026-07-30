import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
      <Icon className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
      <p className="text-sm text-ink-muted">{message}</p>
    </div>
  );
}
