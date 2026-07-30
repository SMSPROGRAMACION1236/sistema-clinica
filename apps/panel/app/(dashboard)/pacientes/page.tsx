import Link from "next/link";
import { prisma } from "@sistema-clinica/db";
import { Users, Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export default async function PacientesPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim();

  const patients = await prisma.patient.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          appointments: true,
        },
      },
    },
    take: 100,
  });

  const noShowCounts = await prisma.appointment.groupBy({
    by: ["patientId"],
    where: { patientId: { in: patients.map((p) => p.id) }, status: "NO_SHOW" },
    _count: true,
  });
  const noShowByPatient = new Map(noShowCounts.map((c) => [c.patientId, c._count]));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink-primary">Pacientes</h1>

      <form className="flex items-center gap-2">
        <div className="flex flex-1 max-w-sm items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink-muted">
          <Search className="h-4 w-4 shrink-0" strokeWidth={2} />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o teléfono"
            className="w-full bg-transparent text-ink-primary outline-none placeholder:text-ink-muted"
          />
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        {patients.length === 0 ? (
          <EmptyState icon={Users} message="No hay pacientes registrados." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gridline text-left text-ink-muted">
                <th className="px-4 py-2 font-normal">Nombre</th>
                <th className="px-4 py-2 font-normal">Teléfono</th>
                <th className="px-4 py-2 font-normal">Turnos</th>
                <th className="px-4 py-2 font-normal">Ausencias</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-gridline last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/pacientes/${p.id}`} className="text-ink-primary hover:text-accent">
                      {p.name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary">{p.phone}</td>
                  <td className="px-4 py-2.5 tabular-nums">{p._count.appointments}</td>
                  <td className="px-4 py-2.5 tabular-nums">{noShowByPatient.get(p.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
