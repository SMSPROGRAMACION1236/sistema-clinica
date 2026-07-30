import { prisma } from "@sistema-clinica/db";
import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export default async function ConversacionesPage() {
  const patients = await prisma.patient.findMany({
    where: { messages: { some: {} } },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink-primary">Conversaciones</h1>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {patients.length === 0 ? (
          <EmptyState icon={MessagesSquare} message="Todavía no hay conversaciones." />
        ) : (
          <div className="divide-y divide-gridline">
            {patients.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-primary">{p.name ?? p.phone}</p>
                  <p className="truncate text-xs text-ink-secondary">{p.messages[0]?.body}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                  {p.messages[0]?.createdAt.toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short", timeZone: "America/Asuncion" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
