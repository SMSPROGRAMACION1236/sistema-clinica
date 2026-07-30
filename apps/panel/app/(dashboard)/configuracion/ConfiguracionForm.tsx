"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Save, Check, Power } from "lucide-react";
import { updateClinicSettings } from "./actions";

type DayHours = { enabled: boolean; open: string; close: string };
type WeeklyHours = Record<string, DayHours>;

const DAY_ORDER: Array<{ key: string; label: string }> = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

export function ConfiguracionForm({
  settings,
  defaultInstructions,
}: {
  settings: {
    id: string;
    name: string;
    address: string;
    phone: string;
    weeklyHours: unknown;
    botInstructions: string | null;
    activePromotions: string | null;
    botEnabled: boolean;
  };
  defaultInstructions: string;
}) {
  const [instructions, setInstructions] = useState(settings.botInstructions ?? defaultInstructions);
  const [promotions, setPromotions] = useState(settings.activePromotions ?? "");
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(
    (settings.weeklyHours as WeeklyHours) ?? {}
  );
  const [botEnabled, setBotEnabled] = useState(settings.botEnabled);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function updateDay(key: string, patch: Partial<DayHours>) {
    setWeeklyHours((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function handleSubmit(formData: FormData) {
    formData.set("botInstructions", instructions);
    formData.set("activePromotions", promotions);
    formData.set("weeklyHours", JSON.stringify(weeklyHours));
    formData.set("botEnabled", String(botEnabled));
    startTransition(async () => {
      await updateClinicSettings(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <input type="hidden" name="id" value={settings.id} />

      <div
        className={`flex items-center gap-4 rounded-xl border p-5 ${
          botEnabled ? "border-border bg-surface" : "border-status-critical bg-status-critical-wash"
        }`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            botEnabled ? "bg-accent-wash text-accent" : "bg-status-critical text-white"
          }`}
        >
          <Power className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink-primary">Asistente de WhatsApp — {botEnabled ? "Activo" : "Apagado"}</p>
          <p className="mt-0.5 text-sm text-ink-secondary">
            {botEnabled
              ? "Atiende consultas, agenda y confirma turnos las 24 horas. Podés apagarlo en cualquier momento."
              : "El asistente NO está respondiendo. Los pacientes que escriban no recibirán ninguna respuesta automática."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBotEnabled((v) => !v)}
          className={`h-8 w-14 shrink-0 rounded-full p-1 transition-colors ${botEnabled ? "bg-accent" : "bg-status-critical"}`}
        >
          <span
            className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${
              botEnabled ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-medium text-ink-primary">Datos de la clínica</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre" name="name" defaultValue={settings.name} />
          <Field label="Teléfono" name="phone" defaultValue={settings.phone} />
          <Field label="Dirección" name="address" defaultValue={settings.address} className="sm:col-span-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-medium text-ink-primary">Personalidad e instrucciones</h2>
            <button
              type="button"
              onClick={() => setInstructions(defaultInstructions)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ink-secondary transition-colors hover:bg-accent-wash/50 hover:text-ink-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} />
              Restaurar por defecto
            </button>
          </div>
          <p className="mb-3 text-xs text-ink-muted">
            El nombre, dirección y especialidades/profesionales de la clínica se agregan automáticamente al mensaje
            del bot — acá solo definís cómo debe comportarse: tono, reglas de la conversación, qué puede y no puede
            hacer.
          </p>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={14}
            className="w-full rounded-lg border border-border bg-page px-3 py-2.5 font-mono text-xs leading-relaxed text-ink-primary outline-none ring-accent transition-shadow focus:ring-2"
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-medium text-ink-primary">Promociones y contexto activo</h2>
            <p className="mt-1 mb-3 text-xs text-ink-muted">Información que el asistente menciona cuando es relevante.</p>
            <textarea
              value={promotions}
              onChange={(e) => setPromotions(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-border bg-page px-3 py-2.5 text-sm leading-relaxed text-ink-primary outline-none ring-accent transition-shadow focus:ring-2"
            />
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-medium text-ink-primary">Horarios de atención</h2>
            <p className="mt-1 mb-3 text-xs text-ink-muted">Franjas en las que el asistente puede ofrecer turnos.</p>
            <div className="divide-y divide-gridline">
              {DAY_ORDER.map(({ key, label }) => {
                const day = weeklyHours[key] ?? { enabled: false, open: "08:00", close: "18:00" };
                return (
                  <div key={key} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="w-24 shrink-0 font-medium text-ink-primary">{label}</span>
                    <input
                      type="time"
                      value={day.open}
                      onChange={(e) => updateDay(key, { open: e.target.value })}
                      disabled={!day.enabled}
                      className="rounded-md border border-border bg-page px-2 py-1 text-xs text-ink-secondary disabled:opacity-40"
                    />
                    <span className="text-ink-muted">–</span>
                    <input
                      type="time"
                      value={day.close}
                      onChange={(e) => updateDay(key, { close: e.target.value })}
                      disabled={!day.enabled}
                      className="rounded-md border border-border bg-page px-2 py-1 text-xs text-ink-secondary disabled:opacity-40"
                    />
                    <button
                      type="button"
                      onClick={() => updateDay(key, { enabled: !day.enabled })}
                      className={`ml-auto h-6 w-11 shrink-0 rounded-full p-1 transition-colors ${
                        day.enabled ? "bg-accent" : "bg-border"
                      }`}
                    >
                      <span
                        className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          day.enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saved ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Save className="h-4 w-4" strokeWidth={2.25} />}
        {isPending ? "Guardando..." : saved ? "Guardado" : "Guardar cambios"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  className = "",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-sm font-medium text-ink-secondary">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-border bg-page px-3 py-2 text-sm text-ink-primary outline-none ring-accent transition-shadow focus:ring-2"
      />
    </div>
  );
}
