import { prisma } from "@sistema-clinica/db";
import { CalendarClock, Clock, CheckCircle2, XCircle, CalendarX2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { appointmentStatusMeta } from "@/lib/status";

export default async function DashboardHomePage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [todayAppointments, professionals] = await Promise.all([
    prisma.appointment.findMany({
      where: { date: { gte: startOfToday, lt: endOfToday } },
      include: { patient: true, professional: true },
      orderBy: { date: "asc" },
    }),
    prisma.professional.findMany({ where: { active: true } }),
  ]);

  const pendingCount = todayAppointments.filter((a) => a.status === "PENDING").length;
  const confirmedCount = todayAppointments.filter((a) => a.status === "CONFIRMED").length;
  const cancelledCount = todayAppointments.filter((a) => a.status === "CANCELLED").length;

  const bySpecialty = new Map<string, number>();
  for (const a of todayAppointments) {
    bySpecialty.set(a.professional.specialty, (bySpecialty.get(a.professional.specialty) ?? 0) + 1);
  }
  const maxCount = Math.max(1, ...bySpecialty.values());

  const now = new Date();
  const nextByProfessional = await Promise.all(
    professionals.map(async (p) => {
      const next = await prisma.appointment.findFirst({
        where: { professionalId: p.id, date: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } },
        orderBy: { date: "asc" },
      });
      const todayCount = todayAppointments.filter((a) => a.professionalId === p.id).length;
      return { professional: p, next, todayCount };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-primary">Resumen de hoy</h1>
        <p className="text-sm text-ink-muted">
          {startOfToday.toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Turnos de hoy" value={todayAppointments.length} icon={CalendarClock} tone="neutral" />
        <StatCard
          label="Pendientes de confirmar"
          value={pendingCount}
          icon={Clock}
          tone={pendingCount > 0 ? "warning" : "neutral"}
        />
        <StatCard label="Confirmados" value={confirmedCount} icon={CheckCircle2} tone="good" />
        <StatCard label="Cancelados" value={cancelledCount} icon={XCircle} tone="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-medium text-ink-primary">Por especialidad</h2>
          <div className="space-y-4">
            {[...bySpecialty.entries()].map(([specialty, count]) => (
              <div key={specialty} className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink-primary">{specialty}</span>
                  <span className="text-ink-secondary">
                    <span className="font-semibold text-ink-primary">{count}</span> turnos
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-page">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <h2 className="border-b border-border px-5 py-3 text-sm font-medium text-ink-primary">Por profesional</h2>
          <div className="divide-y divide-gridline">
            {nextByProfessional.map(({ professional, next, todayCount }) => (
              <div key={professional.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-primary">{professional.name}</p>
                  <p className="truncate text-xs text-ink-muted">{professional.specialty}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-ink-primary">{todayCount}</p>
                  <p className="text-xs text-ink-muted">turnos hoy</p>
                </div>
                <div className="w-28 text-right font-mono text-xs text-ink-secondary">
                  {next ? next.date.toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" }) : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <h2 className="border-b border-border px-4 py-3 text-sm font-medium text-ink-primary">Turnos de hoy</h2>
        {todayAppointments.length === 0 ? (
          <EmptyState icon={CalendarX2} message="No hay turnos para hoy." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gridline text-left text-ink-muted">
                <th className="px-4 py-2 font-normal">Hora</th>
                <th className="px-4 py-2 font-normal">Paciente</th>
                <th className="px-4 py-2 font-normal">Profesional</th>
                <th className="px-4 py-2 font-normal">Estado</th>
              </tr>
            </thead>
            <tbody>
              {todayAppointments.map((a) => (
                <tr key={a.id} className="border-b border-gridline last:border-0">
                  <td className="px-4 py-2.5 tabular-nums">
                    {a.date.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-2.5 text-ink-primary">{a.patient.name ?? a.patient.phone}</td>
                  <td className="px-4 py-2.5 text-ink-secondary">{a.professional.name}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge meta={appointmentStatusMeta[a.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
