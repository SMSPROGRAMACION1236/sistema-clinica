import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@sistema-clinica/db";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { appointmentStatusMeta } from "@/lib/status";

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      appointments: {
        include: { professional: true },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!patient) notFound();

  const total = patient.appointments.length;
  const noShow = patient.appointments.filter((a) => a.status === "NO_SHOW").length;

  return (
    <div className="space-y-4">
      <Link href="/pacientes" className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink-primary">
        <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
        Volver a pacientes
      </Link>

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <h1 className="text-xl font-semibold text-ink-primary">{patient.name ?? "Sin nombre"}</h1>
            <div className="mt-1.5 flex gap-4 text-sm text-ink-secondary">
              <span className="font-mono">{patient.phone}</span>
              {patient.email && <span>{patient.email}</span>}
            </div>
          </div>
          <div className="ml-auto flex gap-6 text-right">
            <div>
              <p className="text-lg font-semibold text-ink-primary">{total}</p>
              <p className="text-xs text-ink-muted">turnos</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-ink-primary">{noShow}</p>
              <p className="text-xs text-ink-muted">ausencias</p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <h2 className="border-b border-border px-4 py-3 text-sm font-medium text-ink-primary">Historial de turnos</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gridline text-left text-ink-muted">
              <th className="px-4 py-2 font-normal">Fecha</th>
              <th className="px-4 py-2 font-normal">Especialidad</th>
              <th className="px-4 py-2 font-normal">Profesional</th>
              <th className="px-4 py-2 font-normal">Estado</th>
            </tr>
          </thead>
          <tbody>
            {patient.appointments.map((a) => (
              <tr key={a.id} className="border-b border-gridline last:border-0">
                <td className="px-4 py-2.5 tabular-nums">
                  {a.date.toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-2.5 text-ink-primary">{a.professional.specialty}</td>
                <td className="px-4 py-2.5 text-ink-secondary">{a.professional.name}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge meta={appointmentStatusMeta[a.status]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
