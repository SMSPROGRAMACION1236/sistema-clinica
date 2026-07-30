import { prisma } from "@sistema-clinica/db";
import { MessagesSquare } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { CountdownBadge } from "@/components/CountdownBadge";
import { toggleFollowUp } from "./actions";

export default async function SeguimientosPage() {
  const now = new Date();

  const pending = await prisma.followUp.findMany({
    where: { sentAt: null, windowExpiresAt: { gt: now } },
    include: { patient: true },
    orderBy: { windowExpiresAt: "asc" },
  });

  const lastMessages = await Promise.all(
    pending.map((f) =>
      prisma.message.findFirst({
        where: { patientId: f.patientId, direction: "INBOUND" },
        orderBy: { createdAt: "desc" },
      })
    )
  );

  const sentThisMonth = await prisma.followUp.count({
    where: { sentAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink-primary">Seguimientos</h1>
      <p className="max-w-2xl text-sm text-ink-secondary">
        Conversaciones que quedaron sin respuesta. El asistente enviará un mensaje de seguimiento antes de que se
        cierre la ventana de 24 horas de WhatsApp.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Programados" value={pending.length} icon={MessagesSquare} tone="neutral" />
        <StatCard label="Enviados este mes" value={sentThisMonth} icon={MessagesSquare} tone="good" />
        <StatCard
          label="Desactivados"
          value={pending.filter((f) => f.disabled).length}
          icon={MessagesSquare}
          tone="neutral"
        />
      </div>

      {pending.length === 0 ? (
        <EmptyState icon={MessagesSquare} message="No hay seguimientos pendientes." />
      ) : (
        <div className="space-y-3">
          {pending.map((f, i) => {
            const lastMessage = lastMessages[i];
            return (
              <div key={f.id} className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-surface p-5 lg:grid-cols-[1.5fr_1fr_180px]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-page text-xs font-semibold text-ink-secondary">
                      {(f.patient.name ?? f.patient.phone).slice(0, 2).toUpperCase()}
                    </div>
                    <p className="truncate text-sm font-semibold text-ink-primary">{f.patient.name ?? f.patient.phone}</p>
                  </div>
                  {lastMessage && (
                    <div className="mt-3 rounded-lg border border-gridline bg-page px-3 py-2.5 text-sm text-ink-secondary">
                      “{lastMessage.body}”
                    </div>
                  )}
                </div>

                <CountdownBadge windowExpiresAt={f.windowExpiresAt.toISOString()} />

                <div className="flex items-center justify-end gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-ink-primary">
                      {f.disabled ? "Seguimiento desactivado" : "Se enviará automáticamente"}
                    </p>
                    <p className="text-xs text-ink-muted">{f.disabled ? "No se enviará nada" : "Mensaje automático"}</p>
                  </div>
                  <form action={toggleFollowUp.bind(null, f.id, !f.disabled)}>
                    <button
                      type="submit"
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        f.disabled
                          ? "border-border text-ink-secondary hover:bg-page"
                          : "border-status-critical text-status-critical hover:bg-status-critical-wash"
                      }`}
                    >
                      {f.disabled ? "Reactivar" : "Desactivar"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
