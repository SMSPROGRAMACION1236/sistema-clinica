# Sistema Clínica

Secretaria virtual de WhatsApp para clínicas: un bot con LLM (function calling) que entiende lenguaje natural, agenda/confirma/cancela turnos y hace seguimiento de leads fríos — más un panel de gestión web. Pensado para que cualquier clínica lo clone y lo levante con su propio número de WhatsApp.

## Si estás clonando esto por primera vez

Corré el skill `/setup` — te guía paso a paso: qué cuentas crear, qué credenciales conseguir, y cómo desplegarlo directo en producción (sin pasos intermedios en local). No hace falta que leas el resto de este archivo para arrancar.

Si algo falla durante el setup o el deploy, corré `/troubleshoot` — ahí están documentados los problemas reales (no hipotéticos) con los que se tropezó la primera puesta en marcha de este proyecto, y su solución exacta.

## Arquitectura

```
apps/
  bot/     -> Servidor Node/Express. Recibe webhooks de WhatsApp (YCloud),
              arma la conversación con un LLM vía OpenRouter (function
              calling), transcribe notas de voz, y corre crons de
              recordatorios de turno y seguimiento de leads fríos.
  panel/   -> Next.js (App Router). Dashboard: turnos, profesionales,
              pacientes, seguimientos, conversaciones, y una página de
              Configuración donde se edita la personalidad del bot.
packages/
  db/      -> Schema de Prisma compartido por ambos servicios, seed de datos
              demo (100% ficticios), y constantes compartidas (ej.
              instrucciones por defecto del bot).
```

Bot y panel son servicios independientes que comparten una sola base Postgres. Se despliegan por separado (dos apps/servicios Docker).

## Stack

- **WhatsApp:** YCloud (proveedor de WhatsApp Business API).
- **LLM:** OpenRouter, modelo configurable vía `OPENROUTER_MODEL`. El bot usa function calling: conversa libre y solo llama a `create_appointment` cuando el paciente confirmó explícitamente los datos (profesional, fecha, hora).
- **Transcripción de audio:** notas de voz de WhatsApp se transcriben vía OpenRouter (`OPENROUTER_TRANSCRIPTION_MODEL`, default Whisper) antes de seguir el flujo normal de conversación.
- **Base de datos:** PostgreSQL + Prisma.
- **Panel:** Next.js + NextAuth (login usuario/contraseña, sin proveedores externos).
- **Deploy:** Docker. Documentado para EasyPanel, pero cualquier host con Docker sirve.
- Puro código, sin n8n ni herramientas de automatización visual.

## Convenciones que importan

- **pnpm workspaces.** Los scripts de cada paquete usan `dotenv-cli` para cargar el `.env` de la raíz del repo (no hay `.env` por paquete).
- **`packages/db` se compila a JS**, no se consume como TypeScript crudo. El bot en producción corre `node` puro sobre código compilado — no transpila TypeScript al vuelo. Por eso `pnpm db:generate` y `pnpm db:migrate` corren `prisma generate` **y** `tsc` en `packages/db`. Si tocás algo ahí y ves que el bot no ve los cambios, corré `pnpm --filter @sistema-clinica/db run build`.
- **Migraciones de Prisma versionadas** en `packages/db/prisma/migrations`. Nunca edites una migración ya aplicada en producción — creá una nueva.
- **El prompt del bot se arma en dos partes:** los datos objetivos (nombre, dirección, especialidades y profesionales disponibles) se inyectan automáticamente desde la base en `apps/bot/src/conversation/prompt.ts`; el resto ("cómo comportarse": tono, cómo guiar al paciente, políticas) es editable desde el panel (`Configuración`) y vive en `ClinicSettings.botInstructions`. Si ese campo está vacío, se usa `DEFAULT_BOT_INSTRUCTIONS` de `@sistema-clinica/db`.
- **`create_appointment` identifica al profesional por nombre, no por id.** El historial de conversación que arma cada turno solo persiste texto (`Message.body`), no los intercambios de tool calls de turnos anteriores — cualquier dato que una herramienta necesite tiene que poder reconstruirse desde el texto plano de la conversación (ver `.claude/skills/troubleshoot/SKILL.md`, sección "el bot dice que confirmó pero no aparece nada en el panel").
- **Toda la lógica de disponibilidad/fecha usa `lib/clinicTime.ts`** (uno en `apps/bot`, otro en `apps/panel`) en vez de `Date.prototype.getHours()/getDay()` o `toLocaleDateString` sin `timeZone` explícito. Es aritmética de offset fijo (America/Asunción, UTC-4) que no depende de la configuración de zona horaria del contenedor. Si agregás código nuevo que necesite saber "qué día/hora es" en términos de la clínica, usá ese módulo — no reinventes el cálculo con `Date` local.
- **`BlackoutDay.date` y `ProfessionalAvailabilityException.date`** tienen que construirse con la misma definición de "medianoche de la clínica" que usa `checkAvailability` para buscarlas (`clinicStartOfDay`/`clinicDateFromDateInput`) — nunca con `new Date(dateStr)` a secas, o el bloqueo queda cargado sin tener ningún efecto real (bug real que ya pasó, documentado en `/troubleshoot`).
- El bot **nunca da consejo médico ni diagnostica** — su instrucción por defecto redirige a "consultá con el profesional en el turno". Los datos del paciente se limitan a lo logístico (contacto, turnos previos); no hay campo de historial clínico ni notas médicas a propósito.

## Cosas que NO se deben commitear

- El `.env` de la raíz (ya está en `.gitignore`). Solo `.env.example` con placeholders va al repo.
- Datos reales de pacientes o turnos — `packages/db/prisma/seed.ts` usa una clínica y pacientes 100% ficticios a propósito.
