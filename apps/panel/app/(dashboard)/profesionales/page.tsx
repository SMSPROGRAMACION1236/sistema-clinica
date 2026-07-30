import { prisma } from "@sistema-clinica/db";
import { CalendarOff } from "lucide-react";
import { toggleProfessionalAvailability, toggleBlackoutDay } from "./actions";
import { EmptyState } from "@/components/EmptyState";
import { clinicStartOfDay, toClinicDateInputValue } from "@/lib/clinicTime";

type DayHours = { enabled: boolean; open: string; close: string };
type WeeklyHours = Record<string, DayHours>;

function summarizeHours(weekly: unknown): string {
  const w = weekly as WeeklyHours;
  const enabledDays = Object.values(w ?? {}).filter((d) => d?.enabled);
  if (enabledDays.length === 0) return "Sin horario cargado";
  const first = enabledDays[0];
  return `${first.open} – ${first.close}`;
}

const toDateInputValue = toClinicDateInputValue;

export default async function ProfesionalesPage() {
  const today = clinicStartOfDay(new Date());

  const [professionals, exceptions, blackoutDays] = await Promise.all([
    prisma.professional.findMany({ orderBy: { name: "asc" } }),
    prisma.professionalAvailabilityException.findMany({ where: { date: { gte: today } } }),
    prisma.blackoutDay.findMany({ where: { date: { gte: today } }, orderBy: { date: "asc" } }),
  ]);

  const exceptionsByProfessional = new Map<string, typeof exceptions>();
  for (const e of exceptions) {
    const list = exceptionsByProfessional.get(e.professionalId) ?? [];
    list.push(e);
    exceptionsByProfessional.set(e.professionalId, list);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink-primary">Profesionales</h1>
      <p className="text-sm text-ink-muted">
        Disponibilidad por profesional y días bloqueados generales para toda la clínica.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {professionals.map((p) => {
          const upcoming = exceptionsByProfessional.get(p.id) ?? [];
          return (
            <div key={p.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-page text-sm font-semibold text-ink-secondary">
                  {p.name
                    .split(" ")
                    .filter((w) => /^[A-ZÁÉÍÓÚ]/.test(w))
                    .slice(-2)
                    .map((w) => w[0])
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-primary">{p.name}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {p.specialty} · {summarizeHours(p.weeklyAvailability)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    p.active ? "bg-status-good-wash text-status-good" : "bg-status-critical-wash text-status-critical"
                  }`}
                >
                  {p.active ? "Activo" : "De baja"}
                </span>
              </div>

              <div className="mt-4 border-t border-gridline pt-4">
                <p className="mb-2 text-xs font-medium text-ink-secondary">Bloquear/desbloquear un día puntual</p>
                <form action={toggleProfessionalAvailability.bind(null, p.id)} className="flex items-center gap-2">
                  <input
                    type="date"
                    name="date"
                    defaultValue={toDateInputValue(today)}
                    className="rounded-lg border border-border bg-page px-2.5 py-1.5 text-sm text-ink-primary"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-page"
                  >
                    Alternar disponibilidad
                  </button>
                </form>
                {upcoming.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {upcoming.map((e) => (
                      <p key={e.id} className="text-xs text-ink-muted">
                        {e.date.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", timeZone: "America/Asuncion" })}:{" "}
                        <span className={e.available ? "text-status-good" : "text-status-critical"}>
                          {e.available ? "disponible" : "no disponible"}
                        </span>{" "}
                        (excepción puntual)
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-medium text-ink-primary">Días bloqueados (feriados / cierre general)</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Ningún profesional ofrece turnos estos días, sin importar su disponibilidad individual.
        </p>

        <form action={toggleBlackoutDay} className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={toDateInputValue(today)}
            className="rounded-lg border border-border bg-page px-2.5 py-1.5 text-sm text-ink-primary"
          />
          <input
            type="text"
            name="reason"
            placeholder="Motivo (opcional)"
            className="rounded-lg border border-border bg-page px-2.5 py-1.5 text-sm text-ink-primary"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            Bloquear / desbloquear
          </button>
        </form>

        <div className="mt-4">
          {blackoutDays.length === 0 ? (
            <EmptyState icon={CalendarOff} message="No hay días bloqueados próximos." />
          ) : (
            <div className="space-y-2">
              {blackoutDays.map((b) => (
                <div key={b.id} className="flex items-center gap-2.5 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-critical" />
                  <span className="font-medium text-ink-primary">
                    {b.date.toLocaleDateString("es-PY", { day: "2-digit", month: "long", timeZone: "America/Asuncion" })}
                  </span>
                  <span className="text-ink-muted">{b.reason ?? "Bloqueo general"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
