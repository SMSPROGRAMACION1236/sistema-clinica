---
name: setup
description: Guía interactiva paso a paso para configurar el Sistema Clínica desde cero — cuentas, credenciales, subir el propio repo a GitHub, y deploy directo en EasyPanel (sin pasos intermedios en local). Usar cuando alguien acaba de clonar este repo y quiere levantarlo por primera vez.
---

# Setup guiado del Sistema Clínica

Estás ayudando a alguien que acaba de clonar este repo (probablemente el dueño de una clínica, no necesariamente programador) a levantarlo desde cero **directo en producción** — sin pasos intermedios de prueba local con ngrok. Guialo con calma, un paso a la vez, verificando cada cosa con comandos reales antes de avanzar. No le pidas que pegue credenciales reales en el chat si podés evitarlo — que las ponga directo donde corresponda (EasyPanel, GitHub) y vos solo confirmás que quedó bien, sin mostrar el valor completo.

No sigas este documento de forma rígida — si el usuario ya tiene algo hecho (cuenta de GitHub, servidor con EasyPanel), saltealo. Preguntá en qué paso está antes de arrancar.

## Plan general (explicáselo al usuario al principio)

1. Requisitos previos (herramientas instaladas)
2. Conseguir credenciales (YCloud, OpenRouter)
3. Subir este código al **propio** GitHub del usuario (no se usa el repo original como fuente de deploy)
4. Levantar en EasyPanel: Postgres, servicio del bot, servicio del panel
5. Conectar el webhook de YCloud contra la URL real ya desplegada
6. Migrar, sembrar datos, y probar el flujo completo en producción

## Paso 1 — Requisitos previos

Verificá con comandos reales, no preguntes de memoria:

```bash
node -v        # necesita ser 20+
pnpm -v        # si no está: corepack enable
git --version
gh --version   # GitHub CLI
gh auth status # tiene que decir "Logged in to github.com"
```

Si falta `pnpm`: `corepack enable`. Si falta `gh` (GitHub CLI), derivá a https://cli.github.com/ y esperá que lo instale. Si `gh auth status` falla, corré `gh auth login` con el usuario y seguí sus prompts.

Además, para el deploy el usuario necesita:
- **Un servidor (VPS) con EasyPanel instalado.** Si no lo tiene, no es parte de este skill — derivalo a https://easypanel.io/docs/installation. No sigas hasta que confirme que tiene acceso al panel de EasyPanel de su servidor.
- **Una cuenta de GitHub propia** (no la del creador de este repo).

## Paso 2 — Instalar dependencias y validar que el código compila

Aunque el deploy real lo va a hacer EasyPanel (no la máquina del usuario), conviene validar localmente que no hay nada roto antes de subir:

```bash
pnpm install
pnpm --filter @sistema-clinica/db run generate
pnpm --filter @sistema-clinica/db run build
```

Si esto falla con errores raros de módulos faltantes o símlinks rotos en Windows, no sigas parcheando archivo por archivo — ver `/troubleshoot`.

## Paso 3 — Conseguir credenciales

### YCloud (WhatsApp Business API)

1. Crear cuenta en https://www.ycloud.com
2. Dar de alta y aprobar un número de WhatsApp Business (puede tardar — si todavía no está aprobado, seguí con el resto mientras tanto)
3. Dashboard → Developers → API Key → copiar
4. El **webhook secret** se consigue recién en el Paso 5, cuando ya exista una URL pública real (la del bot ya deployado). No se puede conseguir antes.

### OpenRouter (LLM)

1. Crear cuenta en https://openrouter.ai
2. openrouter.ai/keys → generar API key
3. Modelo: `openai/gpt-4o-mini` viene por defecto (barato, soporta function calling). Cambiable con `OPENROUTER_MODEL` más adelante.

## Paso 4 — Subir el código al GitHub del usuario

EasyPanel necesita un repositorio de **su propio** GitHub para poder buildear — no se conecta al repo original. Si el usuario clonó este repo (en vez de usar `git clone` sobre su propio fork), hay que crear un repo nuevo en su cuenta y pushear ahí:

```bash
gh repo create <nombre-del-repo> --private --source=. --remote=origin --push
```

Preguntale si lo quiere **privado o público** antes de correr el comando (privado es lo más seguro por defecto; público simplifica la conexión con EasyPanel más adelante porque no hace falta configurar ningún token — podés explicarle ese trade-off y dejar que decida).

Verificá que quedó bien:
```bash
gh repo view --web
```

## Paso 5 — EasyPanel: Postgres

En el dashboard de EasyPanel del servidor del usuario:

1. Crear un proyecto (si no existe uno ya para esto).
2. Dentro del proyecto: **+ Service → Postgres** (o desde Templates).
3. Anotá el nombre del servicio — con eso se arma el `DATABASE_URL` interno: `postgresql://<usuario>:<password>@<nombre-del-servicio>:5432/<db>`. Los valores de usuario/password/db los define el propio servicio de Postgres al crearlo (EasyPanel los muestra en su vista de conexión).

## Paso 6 — EasyPanel: conectar GitHub

Si el repo del usuario es **público**, EasyPanel puede leerlo sin ninguna configuración extra — saltá a Paso 7.

Si es **privado**, hay que darle acceso a EasyPanel una sola vez:

1. En GitHub → Settings → Developer settings → Personal access tokens.
   - **Classic token:** scopes `repo` y `admin:repo_hook`.
   - **Fine-grained token:** acceso al repo específico, permisos `Contents` (read), `Metadata` (read), `Webhooks` (read/write).
2. En EasyPanel → Settings → Github → pegar el token. Tiene que confirmar "Github token updated".

## Paso 7 — EasyPanel: servicio del bot

1. **+ Service → App**, fuente **GitHub Repository** → elegir owner/repo/branch del usuario.
2. **Build:** Dockerfile en `apps/bot/Dockerfile`, contexto de build en la raíz del repo (`.`).
3. Puerto: `3001` (tiene que coincidir con la variable `PORT` que va a ir en el environment — ver Paso 9 sobre por qué esto importa).
4. Deployá una primera vez (aunque todavía falten variables de entorno, esto le asigna un dominio público al servicio — es lo que necesitamos para el paso siguiente).
5. Anotá el dominio que le asignó EasyPanel (pestaña **Domains**).

## Paso 8 — Registrar el webhook de YCloud con la URL real

Ahora sí, con el dominio real del bot:

1. YCloud dashboard → Developers → Webhooks → Add Endpoint, URL: `https://<dominio-del-bot>/webhook/ycloud`.
2. Copiá el **webhook secret** que te da YCloud en ese momento — recién ahora existe.

## Paso 9 — EasyPanel: variables de entorno del bot

En la pestaña **Environment** del servicio del bot, pegá (una por línea, formato `NOMBRE=valor`):

```
DATABASE_URL=<el del Paso 5>
YCLOUD_API_KEY=<del Paso 3>
YCLOUD_WEBHOOK_SECRET=<del Paso 8>
WHATSAPP_BUSINESS_NUMBER=<el número de WhatsApp Business, formato E.164>
OPENROUTER_API_KEY=<del Paso 3>
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_TRANSCRIPTION_MODEL=openai/whisper-large-v3-turbo
PORT=3001
TZ=America/Asuncion
REMINDER_HOURS_BEFORE=24
REMINDER_CUTOFF_MINUTES=120
FOLLOWUP_DELAY_MINUTES=1380
```

Guardá y **Deploy** de nuevo (las variables de entorno no toman efecto hasta el próximo deploy o restart). Confirmá con el usuario que vio aparecer el toast de confirmación del deploy antes de esperar — a veces el primer click no registra (ver `/troubleshoot`).

Después, en **Domains**, verificá que el puerto de destino sea `3001` — el default de EasyPanel al crear el dominio suele ser `80`, y si no se corrige el servicio queda inalcanzable aunque el contenedor esté corriendo bien.

**Antes de grabar una demo real**: confirmá con el usuario que `apps/bot/src/lib/demoAllowlist.ts` tiene cargado su número personal correcto (`DEMO_ONLY_ALLOWED_NUMBERS`) — mientras ese array tenga un valor, el bot solo responde a ese número, para no interferir con el WhatsApp Business real que ya recibe clientes. Es código, no una variable de entorno — si se cambia, hay que volver a buildear/deployar el bot. Antes de dejar el proyecto listo para producción real, ese array debe vaciarse a `[]` (o borrar el archivo).

## Paso 10 — Migrar la base y cargar datos demo (en producción)

Usá la consola del servicio del bot (ícono `Console` en la barra de EasyPanel, shell `Sh`):

```bash
cd /app/packages/db && ./node_modules/.bin/prisma migrate deploy
```

Si el usuario quiere arrancar con datos de ejemplo (una clínica ficticia con profesionales, pacientes y turnos de prueba) para ver el panel poblado antes de tener turnos reales:

```bash
./node_modules/.bin/tsx prisma/seed.ts
```

Esto crea también el usuario admin del panel: `admin@clinicaaurora.com.py` / `cambiar-esta-clave`. Avisale al usuario que tiene que cambiar esa contraseña antes de compartir el acceso con nadie más.

## Paso 11 — EasyPanel: servicio del panel

1. **+ Service → App**, mismo repo GitHub, Dockerfile en `apps/panel/Dockerfile`, contexto en la raíz.
2. Deployá una vez para conseguir el dominio (pestaña **Domains**).
3. **Environment:**
   ```
   DATABASE_URL=<el mismo del bot>
   NEXTAUTH_SECRET=<generar, ver abajo>
   NEXTAUTH_URL=https://<dominio-que-le-asignó-easypanel-a-este-servicio>
   PORT=3000
   ```
   Para `NEXTAUTH_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
4. Guardá, Deploy de nuevo, y en **Domains** confirmá que el puerto de destino sea `3000` (mismo problema que con el bot — default 80).

## Paso 12 — Probar todo en producción

```bash
curl -s https://<dominio-del-bot>/health        # {"status":"ok"}
```
Y que `https://<dominio-del-panel>/login` cargue y se pueda entrar con el admin del seed (si lo corrió).

Pedile al usuario que le escriba "hola" a su WhatsApp Business real desde su celular (con el número personal cargado en `demoAllowlist.ts`, si todavía está activo). Mirá los logs del servicio del bot en EasyPanel mientras tanto — tiene que aparecer:
```
[webhook] evento recibido: whatsapp.inbound_message.received
```
Si no aparece nada, o aparece `firma inválida`, andá a `/troubleshoot`.

Si el mensaje se procesa, seguí la conversación hasta agendar un turno, y confirmá que aparece en `https://<dominio-del-panel>/turnos`.

## Cuándo parar y preguntar

- Si YCloud o EasyPanel requieren aprobación/instalación manual que puede tardar, avisá al usuario y seguí con lo que sí se puede avanzar mientras tanto.
- Nunca inventes valores de credenciales ni asumas que un deploy "success" en la UI de EasyPanel significa que ya funciona — probá siempre con `curl` contra el dominio real.
- Si algo fallara de una forma que no está en `/troubleshoot`, documentalo ahí después de resolverlo.
