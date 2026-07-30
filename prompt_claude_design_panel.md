# Prompt para Claude Design — Panel de control clínica

Diseñá el prototipo visual de un panel de control (dashboard web) para el
dueño/administrador de una clínica que usa un asistente de WhatsApp con IA
para atender pacientes. Es una demo/prototipo de UI — no necesita estar
conectado a datos reales, podés usar datos de ejemplo ficticios.

## Estilo visual

- Moderno, atractivo, premium — inspirado en productos tipo Linear, Vercel,
  Stripe Dashboard: mucho espacio en blanco, tipografía clara, tarjetas con
  bordes suaves, sin saturar de color.
- Soporte de modo oscuro y claro (el oscuro como protagonista si hay que
  elegir uno para las capturas de pantalla del video).
- Paleta neutra/placeholder (grises + un color de acento único, por ejemplo
  azul o verde suave) — nada de branding específico todavía, esto se ajusta
  después.
- Sidebar de navegación fija a la izquierda + contenido principal.
- Debe verse bien en una grabación de pantalla de escritorio (1920x1080),
  priorizando legibilidad a distancia sobre densidad de información.

## Secciones que debe tener (navegación lateral)

1. **Dashboard / Inicio**
   - Resumen del día: turnos de hoy, pendientes de confirmar, confirmados,
     cancelados.
   - Vista rápida de agendamientos ordenados por especialidad y por
     profesional.

2. **Turnos**
   - Listado/calendario de turnos, filtrable por profesional y especialidad.
   - Estado de cada turno (pendiente, confirmado, cancelado).

3. **Profesionales**
   - Lista de profesionales/doctores con su especialidad.
   - Toggle para activar/desactivar la disponibilidad de un profesional en
     una fecha puntual.
   - Selector de días bloqueados tipo feriado (blackout general, ningún
     profesional disponible ese día).

4. **Pacientes**
   - Ficha simple por paciente: nombre, contacto, turnos previos (fecha,
     especialidad, profesional, estado). Sin historial clínico ni notas
     médicas — esto es logística de turnos, no un sistema clínico.

5. **Seguimientos (follow-ups)**
   - Vista de conversaciones a las que se les va a disparar un mensaje de
     seguimiento automático (paciente que preguntó y dejó de responder)
     dentro de la ventana de 24hs de WhatsApp.
   - Toggle para desactivar el seguimiento de una conversación puntual antes
     de que se dispare.

6. **Configuración**
   - Campo de texto largo para editar la personalidad/instrucciones del bot
     (cómo debe hablar, tono, políticas).
   - Campo para inyectar contexto/promociones activas que el bot debe
     mencionar a los pacientes.
   - Configuración de horarios de atención generales.
   - Apagado general del bot (kill switch, con confirmación visual clara de
     que está encendido/apagado).

## Qué necesito como entregable

- Un prototipo navegable (o al menos las pantallas principales de cada
  sección) en alta fidelidad, con datos ficticios realistas de una clínica
  (ej. especialidades como "Odontología", "Kinesiología", "Nutrición",
  nombres de profesionales inventados).
- Foco en que se vea premium y "vendible" en una demo grabada — este panel
  se muestra en un video de YouTube como parte de una demostración en vivo.
- No hace falta lógica funcional real ni conexión a backend — es un
  prototipo visual para iterar el diseño antes de implementarlo con código.
