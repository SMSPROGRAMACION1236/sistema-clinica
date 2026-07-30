import { prisma, DEFAULT_BOT_INSTRUCTIONS } from "@sistema-clinica/db";
import { ConfiguracionForm } from "./ConfiguracionForm";

export default async function ConfiguracionPage() {
  const settings = await prisma.clinicSettings.findFirst();

  if (!settings) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-ink-primary">Configuración</h1>
        <p className="text-sm text-ink-muted">
          No hay configuración de clínica todavía. Corré el seed (<code>pnpm db:seed</code>) para crear una.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink-primary">Configuración</h1>
      <ConfiguracionForm settings={settings} defaultInstructions={DEFAULT_BOT_INSTRUCTIONS} />
    </div>
  );
}
