import { prisma } from "@sistema-clinica/db";
import { CalendarX2, Check, X } from "lucide-react";
import { setAppointmentStatus } from "./actions";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { appointmentStatusMeta, channelMeta } from "@/lib/status";

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: { specialty?: string; professionalId?: string };
}) {
  const [professionals, specialties] = await Promise.all([
    prisma.professional.findMany({ orderBy: { name: "asc" } }),
    prisma.professional.findMany({ distinct: ["specialty"], select: { specialty: true } }),
  ]);

  const appointments = await prisma.appointment.findMany({
    where: {
      ...(searchParams.professionalId ? { professionalId: searchParams.professionalId } : {}),
      ...(searchParams.specialty ? { professional: { specialty: searchParams.specialty } } : {}),
    },
    include: { patient: true, professional: true },
    orderBy: { date: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink-primary">Turnos</h1>

      <form className="flex flex-wrap items-center gap-3">
        <select
          name="specialty"
          defaultValue={searchParams.specialty ?? ""}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink-primary"
        >
          <option value="">Todas las especialidades</option>
          {specialties.map((s) => (
            <option key={s.specialty} value={s.specialty}>
              {s.specialty}
            </option>
          ))}
        </select>
        <select
          name="professionalId"
          defaultValue={searchParams.professionalId ?? ""}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink-primary"
        >
          <option value="">Todos los profesionales</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        {appointments.length === 0 ? (
          <EmptyState icon={CalendarX2} message="No hay turnos con estos filtros." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gridline text-left text-ink-muted">
                <th className="px-4 py-2 font-normal">Fecha</th>
                <th className="px-4 py-2 font-normal">Paciente</th>
                <th className="px-4 py-2 font-normal">Especialidad</th>
                <th className="px-4 py-2 font-normal">Profesional</th>
                <th className="px-4 py-2 font-normal">Estado</th>
                <th className="px-4 py-2 font-normal">Canal</th>
                <th className="px-4 py-2 font-normal">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} className="border-b border-gridline last:border-0">
                  <td className="px-4 py-2.5 tabular-nums">
                    {a.date.toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short", timeZone: "America/Asuncion" })}
                  </td>
                  <td className="px-4 py-2.5 text-ink-primary">{a.patient.name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink-secondary">{a.professional.specialty}</td>
                  <td className="px-4 py-2.5 text-ink-secondary">{a.professional.name}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge meta={appointmentStatusMeta[a.status]} />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge meta={channelMeta[a.channel]} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <form action={setAppointmentStatus.bind(null, a.id, "COMPLETED")}>
                        <button
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-status-good transition-colors hover:bg-status-good-wash"
                          title="Marcar como asistió"
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                          Asistió
                        </button>
                      </form>
                      <form action={setAppointmentStatus.bind(null, a.id, "CANCELLED")}>
                        <button
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-status-neutral-wash hover:text-status-neutral"
                          title="Cancelar turno"
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                          Cancelar
                        </button>
                      </form>
                    </div>
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
