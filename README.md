# Sistema Clínica

Secretaria virtual de WhatsApp para clínicas: un bot con LLM que entiende lenguaje natural, responde consultas de especialidades y precios, agenda turnos, envía recordatorios y confirma o libera turnos automáticamente según la respuesta del paciente, y hace seguimiento de leads que preguntaron y no volvieron a escribir — más un panel de control con turnos, profesionales, pacientes y conversaciones en un solo lugar.

Este repo es el material descargable que acompaña el video de [Mantle Core Labs](https://mantlecorelabs.com). Está pensado para que lo clones, configures tus propias credenciales, y lo tengas corriendo en tu propia clínica.

## La forma más fácil de arrancar

Si tenés [Claude Code](https://claude.com/claude-code), abrí este repo con él y corré:

```
/setup
```

Te guía paso a paso: qué cuentas crear, cómo conseguir cada credencial, y cómo desplegarlo directo en producción. Si algo falla en el camino, corré `/troubleshoot` — ahí están documentados los problemas reales con los que se topó este proyecto la primera vez, con su solución exacta.

Si preferís seguir el instructivo manual, seguí leyendo este README.

## Arquitectura

```
apps/
  bot/     -> Servidor Node.js que recibe mensajes de WhatsApp (vía YCloud),
              transcribe notas de voz, maneja la conversación, agenda turnos
              y corre los recordatorios/seguimientos automáticos.
  panel/   -> Dashboard en Next.js: turnos, profesionales, pacientes,
              seguimientos y configuración.
packages/
  db/      -> Schema de Prisma compartido por ambos servicios + seed de datos demo.
```

Bot y panel son dos servicios independientes que comparten la misma base de datos Postgres. Se pueden desplegar por separado (por ejemplo, dos apps distintas en EasyPanel).

## Stack

- **WhatsApp:** [YCloud](https://www.ycloud.com) como proveedor de WhatsApp Business API.
- **LLM:** [OpenRouter](https://openrouter.ai) (modelo configurable, por defecto uno barato) con function calling — el modelo entiende la conversación en lenguaje natural y llama a una herramienta (`create_appointment`) recién cuando el paciente confirmó los datos.
- **Transcripción de audio:** notas de voz de WhatsApp se transcriben con un modelo de OpenRouter (`OPENROUTER_TRANSCRIPTION_MODEL`, por defecto Whisper) antes de procesarse como cualquier otro mensaje.
- **Backend del bot:** Node.js + TypeScript + Express, recordatorios y seguimientos con `node-cron`.
- **Base de datos:** PostgreSQL + Prisma.
- **Panel:** Next.js (App Router) + NextAuth (login simple con usuario/contraseña).
- **Deploy:** Docker, pensado para levantar en [EasyPanel](https://easypanel.io) o cualquier host con Docker.

## Requisitos

- Node.js 20+
- pnpm (`corepack enable` si no lo tenés instalado)
- Docker Desktop (para levantar Postgres localmente)
- Una cuenta de YCloud con un número de WhatsApp Business ya aprobado
- Una cuenta de OpenRouter

## Puesta en marcha (desarrollo local)

1. **Cloná el repo e instalá dependencias**

   ```bash
   pnpm install
   ```

2. **Copiá el archivo de variables de entorno y completá tus credenciales**

   ```bash
   cp .env.example .env
   ```

   Mirá la sección [Variables de entorno](#variables-de-entorno) para saber de dónde sacar cada valor.

3. **Levantá Postgres**

   ```bash
   docker compose up -d postgres
   ```

4. **Corré las migraciones y cargá los datos de ejemplo**

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

   Esto crea una clínica demo ("Clínica Aurora") con profesionales, pacientes y turnos de ejemplo, y un usuario admin para el panel:

   - Email: `admin@clinicaaurora.com.py`
   - Contraseña: `cambiar-esta-clave` (cambiala apenas entres)

5. **Corré el bot y el panel** (en dos terminales separadas)

   ```bash
   pnpm bot:dev
   pnpm panel:dev
   ```

   El panel queda en `http://localhost:3000` y el bot escucha en `http://localhost:3001`.

## Conectar tu WhatsApp Business (YCloud)

1. Creá una cuenta en [YCloud](https://www.ycloud.com) y aprobá tu número de WhatsApp Business.
2. En el dashboard de YCloud: **Developers > API Key** — copiá la key a `YCLOUD_API_KEY`.
3. Como el bot corre en tu máquina o en un servidor, necesitás exponer `POST /webhook/ycloud` con una URL pública. En desarrollo podés usar [ngrok](https://ngrok.com) (`ngrok http 3001`); en producción, la URL de tu servicio ya desplegado.
4. En YCloud: **Developers > Webhooks > Add Endpoint** — pegá esa URL pública + `/webhook/ycloud`, y copiá el secret que te dan a `YCLOUD_WEBHOOK_SECRET`.
5. Completá `WHATSAPP_BUSINESS_NUMBER` con tu número en formato E.164 (ej: `+595981234567`).

## Deploy en EasyPanel

El orden importa: necesitás el dominio del servicio `bot` antes de poder registrar el webhook en YCloud.

0. **Subí este código a tu propio GitHub.** EasyPanel necesita un repositorio en tu cuenta, no el original — no lo puede leer del repo de donde bajaste esto. Si tenés [GitHub CLI](https://cli.github.com/):
   ```bash
   gh auth login   # si no estás logueado todavía
   gh repo create tu-repo --private --source=. --remote=origin --push
   ```
   Si el repo lo dejás **privado**, después vas a tener que darle acceso a EasyPanel con un token de GitHub (Settings → Github en EasyPanel — ver [docs de EasyPanel](https://easypanel.io/docs/code-sources/github)). Si lo dejás **público**, EasyPanel lo lee directo sin configuración extra.

1. **Postgres.** Creá un servicio Postgres desde el catálogo de EasyPanel (Templates > Postgres). Anotá el host interno, usuario, contraseña y nombre de base — con eso armás el `DATABASE_URL` interno (algo como `postgresql://usuario:password@nombre-servicio:5432/nombre-db`).

2. **Servicio `bot`.**
   - App > Create Service > **From a Git repository**, apuntando a este repo.
   - Build: Dockerfile en `apps/bot/Dockerfile`, contexto de build en la raíz del repo (`.`).
   - Puerto del contenedor: `3001`.
   - Variables de entorno: todas las de `.env.example` **excepto** las de `NEXTAUTH_*` (esas son solo del panel). Usá el `DATABASE_URL` interno de Postgres del paso 1.
   - Deployá. EasyPanel te asigna un dominio público. Anotalo — lo necesitás ahora. Confirmá en **Domains** que el puerto de destino sea `3001` (el default suele ser `80`).

3. **Webhook de YCloud.** En el dashboard de YCloud: Developers > Webhooks > Add Endpoint, con URL `https://<dominio-del-bot>/webhook/ycloud`. Copiá el secret que te da a `YCLOUD_WEBHOOK_SECRET` y actualizá esa variable en el servicio `bot` en EasyPanel (esto redeploya el servicio).

4. **Servicio `panel`.**
   - Mismo repo, Dockerfile en `apps/panel/Dockerfile`, contexto en la raíz.
   - Puerto del contenedor: `3000`.
   - Variables: `DATABASE_URL` (mismo Postgres), `NEXTAUTH_SECRET` (generado con `openssl rand -base64 32`), `NEXTAUTH_URL` = el dominio público que te asigne EasyPanel para este servicio.
   - Deployá. Confirmá en **Domains** que el puerto de destino sea `3000`.

5. **Migraciones y seed contra producción.** Una sola vez, desde la consola que ofrece EasyPanel para el servicio `bot` (shell `sh`, no `bash` — las imágenes son Alpine):

   ```bash
   cd /app/packages/db && ./node_modules/.bin/prisma migrate deploy
   ./node_modules/.bin/tsx prisma/seed.ts   # opcional: solo si querés los datos demo en producción
   ```

6. Probá el flujo completo: `curl https://<dominio-del-bot>/health` (debería dar `{"status":"ok"}`), escribile a tu número de WhatsApp Business, seguí la conversación hasta agendar un turno, y confirmá que aparece en `https://<dominio-del-panel>/turnos`.

## Variables de entorno

Ver [`.env.example`](./.env.example) — cada variable tiene un comentario explicando de dónde sacarla.

## Personalización

- **Profesionales, especialidades y datos de la clínica:** editá `packages/db/prisma/seed.ts` y volvé a correr `pnpm db:seed`, o gestionalos directamente desde el panel (Profesionales / Configuración).
- **Personalidad y reglas de conversación del bot:** editable desde el panel (Configuración → "Personalidad e instrucciones"), sin tocar código ni redeployar. El default de fallback vive en `packages/db/src/constants.ts`.
- **Modelo de LLM:** variable `OPENROUTER_MODEL` — cualquier modelo de OpenRouter que soporte function calling.
- **Modelo de transcripción de audio:** variable `OPENROUTER_TRANSCRIPTION_MODEL`.
- **Tiempo de recordatorio antes del turno:** variable `REMINDER_HOURS_BEFORE` (por defecto 24hs).
- **Delay del seguimiento a leads fríos:** variable `FOLLOWUP_DELAY_MINUTES` (por defecto ~23hs, dentro de la ventana de 24hs de WhatsApp).

## Licencia

Este proyecto se comparte con fines educativos como parte del contenido de [Mantle Core Labs](https://mantlecorelabs.com). Usalo, modificalo y adaptalo a tu clínica libremente.
