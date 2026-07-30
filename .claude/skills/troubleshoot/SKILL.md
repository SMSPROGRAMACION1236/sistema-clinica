---
name: troubleshoot
description: Problemas reales (no hipotéticos) con los que se topó la primera puesta en marcha del Sistema Clínica, con la causa exacta y la solución. Usar cuando algo falla durante setup, desarrollo local o deploy y el síntoma se parece a alguno de los de acá.
---

# Problemas reales ya resueltos en este proyecto

Cada uno de estos pasó de verdad mientras se armaba este repo (o su proyecto hermano de restaurante, con la misma arquitectura). Antes de investigar desde cero, fijate si el síntoma coincide con alguno.

## "El bot no responde nada" / no aparece log de webhook

**Síntoma:** le escribís al WhatsApp Business y no pasa nada, ni un error.

**Causas posibles, en este orden de probabilidad:**

1. **El webhook de YCloud nunca llegó al servidor.** Revisá que la URL registrada en YCloud (Developers → Webhooks) apunte exactamente a `https://<tu-dominio>/webhook/ycloud` (con esa ruta exacta — el código la expone en singular, `/webhook/ycloud`, no `/webhooks/ycloud`).
2. **Firma inválida silenciosa.** Si el servidor SÍ recibe el POST pero devuelve 401, antes no quedaba ningún log — ya está arreglado (`apps/bot/src/webhook.ts` loguea `firma inválida o ausente` con el header recibido). Si ves ese log: el formato real del header de YCloud es **un solo header** `YCloud-Signature: t={timestamp},s={signature}` — no dos headers separados. Si tocaste `apps/bot/src/services/ycloud.ts` (`verifyYCloudSignature`), asegurate de que sigue parseando ese formato combinado.
3. **El número que escribe no está en `DEMO_ONLY_ALLOWED_NUMBERS`** (`apps/bot/src/lib/demoAllowlist.ts`) — el bot lo ignora a propósito (log `[webhook] mensaje ignorado (número no autorizado)`). Esto **no es una variable de entorno**, es código: para que el bot responda a cualquiera, vaciá el array a `[]` en ese archivo y volvé a buildear/deployar.
4. **El bot está apagado desde el panel** (`ClinicSettings.botEnabled = false`, sección Configuración → kill switch). Log esperado: `[webhook] mensaje ignorado (bot apagado desde el panel)`. Antes de asumir otra causa, entrá a `/configuracion` en el panel y confirmá que el toggle esté en "Activo".
5. Revisá los logs del contenedor del bot en vivo mientras alguien manda el mensaje — no asumas nada sin ver el log real.

## El bot rechaza turnos que en realidad están dentro del horario del profesional ("no atiende hoy" siendo falso)

**Síntoma:** le pedís un turno a un profesional en un horario que sí está dentro de su rango de atención (ej. las 18hs a la Dra. Ramírez, que atiende 13-19) y el bot igual dice que no está disponible ese día/horario — pasa consistentemente, con distintos profesionales, distintos días y distintas horas.

**Causa real (no es solo un tema de código faltante, es un tema de zona horaria):** toda la lógica de disponibilidad (`apps/bot/src/services/availability.ts`) necesita saber qué día de la semana y qué hora "de pared" (hora de Asunción) corresponde a la fecha/hora que pidió el paciente. La primera versión de esto usaba `new Date(str)` + `.getHours()`/`.getDay()`, que dependen de la zona horaria **del proceso** (variable de entorno `TZ` + base de datos de zonas del sistema operativo). Instalar `tzdata` en el Dockerfile (`apk add tzdata`) ayuda pero **no garantiza nada** si `TZ` no está bien seteada en el Environment del servicio, o si algo más en la cadena falla — y en un contenedor Alpine es fácil que esto quede mal sin que se note.

**Solución aplicada:** se sacó la dependencia de la zona horaria del proceso por completo. `apps/bot/src/lib/clinicTime.ts` hace la aritmética a mano con un offset fijo (`UTC-4`, Paraguay no tiene horario de verano desde 2024) usando los getters `getUTC*` de `Date`, que son siempre deterministas sin importar cómo esté configurado el contenedor. `availability.ts`, `conversation/tools.ts` (construcción de la fecha del turno) y `conversation/prompt.ts` (la fecha de "hoy" que ve el LLM) usan este módulo — **no** hay que volver a usar `Date.prototype.getHours()/getDay()` ni `toLocaleDateString` con `timeZone` en ningún código que decida disponibilidad. Se verificó forzando `TZ=UTC` y `TZ=` (vacía) en local: da exactamente el mismo resultado en los dos casos.

Si Paraguay volviera a tener horario de verano, el único lugar a tocar es la constante `CLINIC_UTC_OFFSET_MINUTES` en `clinicTime.ts`.

`apk add tzdata` en el Dockerfile del bot se dejó igual (no molesta, puede servir para otras cosas), pero ya no es la pieza que resuelve este bug.

## Prisma: "Environment variable not found: DATABASE_URL" durante un build de Docker

Esto es **esperado y no es un bug** — pasa durante `next build` porque Next.js intenta pre-renderizar cada ruta al buildear, y en esa etapa no hay `DATABASE_URL` disponible (solo se inyecta en runtime). Mientras el build termine con `✓ Generating static pages` y las rutas queden marcadas `ƒ (Dynamic)`, está todo bien. Si en cambio el build directamente falla (exit code distinto de 0), ahí sí hay un problema real.

## Prisma: "The table `public.X` does not exist in the current database"

Si ves esto en logs de build (no en runtime), probablemente es el mismo fenómeno de arriba pero con una `DATABASE_URL` real apuntando a una base *distinta* de la que esperás (ej. una base de build efímera de la plataforma). No es necesariamente indicativo de que la base de producción real esté rota — confirmá contra el sitio en vivo (`curl` al endpoint, o abrí el panel) antes de asumir que hay que re-migrar.

## El bot corre local pero al compilarlo para producción (`node dist/index.js`) tira error de sintaxis TypeScript

**Causa:** `packages/db` exporta su código fuente (`.ts`) directamente. En desarrollo, `tsx` transpila cualquier `.ts` que se importe, incluso de un paquete del workspace — por eso funciona sin que lo notes. En producción, el bot corre con `node` puro (sin `tsx`), que no puede parsear TypeScript.

**Solución ya aplicada:** `packages/db` tiene un script `build` (`tsc`) y su `package.json` apunta `main` a `dist/index.js`, no a `src/index.ts`. Si tocás algo en `packages/db/src`, acordate de correr `pnpm --filter @sistema-clinica/db run build` (o `pnpm db:generate`, que ya lo encadena) antes de probar el build de producción del bot o del panel.

## Build de Docker falla con módulos faltantes o copia mal el `node_modules`

- Los `Dockerfile` de `apps/bot` y `apps/panel` necesitan copiar **los tres** `package.json` del monorepo (bot, panel, db) más el `pnpm-lock.yaml` antes de instalar — el lockfile de pnpm referencia todo el workspace, y si falta un `package.json` de un paquete que ni siquiera se va a buildear, la instalación igual puede saltear devDependencies necesarias de otro paquete.
- Verificá que exista un `.dockerignore` en la raíz excluyendo `**/node_modules`, `**/.next`, `**/generated`, `.git`, `.env*`. Sin eso, el `node_modules` de tu máquina (con symlinks que solo tienen sentido en tu filesystem) se copia encima del que arma el propio build de Docker, rompiendo todo.
- La imagen final (`runner` stage) tiene que copiar el `node_modules` de cada app individualmente además del `node_modules` raíz — con pnpm, las dependencias de una app viven en `apps/<app>/node_modules` como symlinks al store compartido; si solo copiás el `node_modules` raíz, el `require()` de paquetes como `express` falla en runtime.

## EasyPanel: el panel/bot muestra "Service is not reachable" después de un deploy

Pasó más de una vez. Antes de asumir que algo se rompió:

1. Confirmá en **Domains** que el puerto de destino coincide con la variable `PORT` real del servicio (bot = 3001, panel = 3000). El default de EasyPanel al crear un dominio es puerto 80 — si nunca lo cambiaste, ahí está el problema.
2. Si el puerto ya está bien y el contenedor muestra "Ready" en los logs pero el dominio sigue sin responder, probá **restart** (el ícono circular, no un redeploy completo) — varias veces esto resolvió un estado de proxy/DNS interno que se quedó apuntando al contenedor viejo después de un rolling deploy.
3. Esperá al menos 15-20 segundos entre un deploy y probar el dominio público — el proxy tarda en registrar el contenedor nuevo.

## EasyPanel: el botón "Deploy" no hace nada

A veces el primer click no registra ningún cambio visual (no aparece el spinner ni el toast "Deploy service"). Volvé a hacer click y confirmá que SÍ aparezca el toast antes de asumir que el deploy arrancó — si vas a esperar sin ver esa confirmación, estás esperando en vano. Revisá el historial en **Deployments** para confirmar que el commit correcto quedó registrado.

## EasyPanel: variables de entorno "no toman efecto"

El `.env` de tu máquina **nunca viaja solo** a EasyPanel (ni a ningún host remoto). Cada servicio (bot, panel) tiene su propia pestaña **Environment** en EasyPanel donde hay que pegar las variables a mano. Después de guardar, hay que **Deploy** (o restart) para que el contenedor las tome — guardar solo no alcanza.

## Windows: `pnpm install` deja símlinks rotos / "Cannot find module .../next/dist/bin/next" o similar

Pasó en Windows con OneDrive/antivirus interfiriendo en operaciones de archivo concurrentes (o después de matar procesos de Node a la fuerza mientras pnpm estaba escribiendo). Si un `pnpm install` normal no lo arregla:

```bash
rm -rf node_modules apps/bot/node_modules apps/panel/node_modules packages/db/node_modules
pnpm install
```

Después volvé a generar el cliente de Prisma y compilar `db`:
```bash
pnpm db:generate
```

## Windows: `prisma generate` falla con `EPERM: operation not permitted, rename ...query_engine-windows.dll.node.tmp...`

Algún proceso Node sigue corriendo y tiene el motor de Prisma cargado en memoria (típicamente un `next dev` o `tsx watch` que quedó vivo de una sesión anterior). Buscalo y matalo antes de reintentar:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Select-Object ProcessId, CommandLine
Stop-Process -Id <PID> -Force
```

## Probando en local pero conectado sin querer a la base de producción

El `.env` de la raíz es un solo archivo compartido por todos los `pnpm *:dev`. Si en algún momento pegaste ahí el `DATABASE_URL` de producción (por ejemplo, para copiar valores hacia EasyPanel), correr `pnpm bot:dev` o `pnpm panel:dev` sin querer apunta a la base real. Para forzar la base local al probar:

```bash
DATABASE_URL="postgresql://clinica:clinica@localhost:5432/sistema_clinica" pnpm bot:dev
```

(dotenv-cli no pisa una variable que ya viene seteada desde afuera, así que este override funciona)
