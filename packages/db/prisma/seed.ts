import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

function hours(open: string, close: string) {
  return { enabled: true, open, close };
}
const closed = { enabled: false, open: "08:00", close: "12:00" };

function atTime(daysFromNow: number, hh: number, mm = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hh, mm, 0, 0);
  return d;
}

function atMidnight(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  await prisma.clinicSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "Clínica Aurora",
      address: "Av. Aviadores del Chaco 2050, Asunción, Paraguay",
      phone: "+595981234567",
      weeklyHours: {
        mon: hours("08:00", "19:00"),
        tue: hours("08:00", "19:00"),
        wed: hours("08:00", "19:00"),
        thu: hours("08:00", "19:00"),
        fri: hours("08:00", "17:00"),
        sat: hours("08:00", "12:00"),
        sun: closed,
      },
      botInstructions:
        'Sos Aurora, la asistente virtual de la Clínica Aurora. Hablás en español rioplatense, con trato de "usted", cálida pero breve — nunca más de 3 líneas por mensaje.\n\nTu único objetivo es agendar, confirmar o reprogramar turnos. Siempre pedís nombre completo, especialidad y franja horaria preferida antes de ofrecer opciones.\n\nNunca das diagnósticos, indicaciones médicas ni interpretás síntomas. Si el paciente describe una urgencia, derivás de inmediato al teléfono de guardia (021 555 0134) y avisás al equipo.\n\nSi no tenés el dato, lo decís y ofrecés que un humano responda en horario de atención.',
      activePromotions:
        "· Promo julio: primera consulta de Nutrición con 30% de descuento (hasta el 31/07).\n· Limpieza dental + flúor: Gs. 280.000 (antes Gs. 350.000).\n· Kinesiología: paquete de 10 sesiones con 15% off, pago adelantado.\n· Se atiende con seguro médico Aurora Salud y ASE.",
      botEnabled: true,
    },
  });

  const adminPasswordHash = await bcrypt.hash("cambiar-esta-clave", 10);
  await prisma.adminUser.upsert({
    where: { email: "admin@clinicaaurora.com.py" },
    update: {},
    create: {
      email: "admin@clinicaaurora.com.py",
      name: "Administración",
      passwordHash: adminPasswordHash,
    },
  });

  const professionalsData = [
    { name: "Dra. Carla Benítez", specialty: "Odontología", open: "08:00", close: "14:00" },
    { name: "Dr. Matías Ferreyra", specialty: "Kinesiología", open: "09:00", close: "17:00" },
    { name: "Lic. Sofía Duarte", specialty: "Nutrición", open: "10:00", close: "16:00" },
    { name: "Dr. Iván Sosa", specialty: "Odontología", open: "08:00", close: "13:00" },
    { name: "Dra. Lucía Ramírez", specialty: "Dermatología", open: "13:00", close: "19:00" },
    { name: "Dr. Pablo Cáceres", specialty: "Kinesiología", open: "13:00", close: "18:00" },
  ];
  const professionals: Record<string, Awaited<ReturnType<typeof prisma.professional.upsert>>> = {};
  for (const p of professionalsData) {
    const weeklyAvailability = {
      mon: hours(p.open, p.close),
      tue: hours(p.open, p.close),
      wed: hours(p.open, p.close),
      thu: hours(p.open, p.close),
      fri: hours(p.open, p.close),
      sat: closed,
      sun: closed,
    };
    professionals[p.name] = await prisma.professional.upsert({
      where: { id: p.name },
      update: {},
      create: { id: p.name, name: p.name, specialty: p.specialty, weeklyAvailability },
    });
  }

  const patientsData = [
    { phone: "+595981442103", name: "María Aguirre", email: "maria.aguirre@mail.com" },
    { phone: "+595972118640", name: "Federico Núñez", email: "fede.nunez@mail.com" },
    { phone: "+595985307219", name: "Noelia Cabrera", email: "noelia.cabrera@mail.com" },
    { phone: "+595991550872", name: "Diego Maldonado", email: "d.maldonado@mail.com" },
    { phone: "+595976884331", name: "Camila Bogado", email: "camila.bogado@mail.com" },
    { phone: "+595983226447", name: "Rodrigo Villalba", email: "r.villalba@mail.com" },
    { phone: "+595981666601", name: "Valeria Ortiz", email: null },
    { phone: "+595981666602", name: "Andrea Zárate", email: null },
    { phone: "+595981666603", name: "Joaquín Prieto", email: null },
    { phone: "+595981666604", name: "Tomás Escobar", email: null },
    { phone: "+595981666605", name: "Belén Acosta", email: null },
    { phone: "+595981666606", name: "Gustavo Ledesma", email: null },
  ];
  const patients: Record<string, Awaited<ReturnType<typeof prisma.patient.upsert>>> = {};
  for (const p of patientsData) {
    patients[p.name] = await prisma.patient.upsert({
      where: { phone: p.phone },
      update: {},
      create: p,
    });
  }

  const todayAppointments = [
    { time: [8, 0], patient: "Rodrigo Villalba", professional: "Dr. Iván Sosa", status: "CONFIRMED", channel: "WHATSAPP" },
    { time: [8, 30], patient: "María Aguirre", professional: "Dra. Carla Benítez", status: "CONFIRMED", channel: "WHATSAPP" },
    { time: [9, 0], patient: "Federico Núñez", professional: "Dr. Matías Ferreyra", status: "PENDING", channel: "WHATSAPP" },
    { time: [9, 40], patient: "Valeria Ortiz", professional: "Dra. Carla Benítez", status: "CONFIRMED", channel: "MOSTRADOR" },
    { time: [10, 15], patient: "Camila Bogado", professional: "Dr. Matías Ferreyra", status: "CONFIRMED", channel: "WHATSAPP" },
    { time: [11, 0], patient: "Diego Maldonado", professional: "Lic. Sofía Duarte", status: "PENDING", channel: "WHATSAPP" },
    { time: [11, 30], patient: "Andrea Zárate", professional: "Lic. Sofía Duarte", status: "CANCELLED", channel: "WHATSAPP" },
    { time: [13, 20], patient: "Joaquín Prieto", professional: "Dr. Pablo Cáceres", status: "CONFIRMED", channel: "WHATSAPP" },
    { time: [14, 20], patient: "Noelia Cabrera", professional: "Dra. Lucía Ramírez", status: "PENDING", channel: "WHATSAPP" },
    { time: [15, 0], patient: "Tomás Escobar", professional: "Dr. Pablo Cáceres", status: "CONFIRMED", channel: "MOSTRADOR" },
    { time: [16, 10], patient: "Belén Acosta", professional: "Dra. Lucía Ramírez", status: "CONFIRMED", channel: "WHATSAPP" },
    { time: [17, 0], patient: "Gustavo Ledesma", professional: "Dra. Carla Benítez", status: "PENDING", channel: "WHATSAPP" },
  ] as const;

  for (const a of todayAppointments) {
    await prisma.appointment.create({
      data: {
        patientId: patients[a.patient].id,
        professionalId: professionals[a.professional].id,
        date: atTime(0, a.time[0], a.time[1]),
        status: a.status,
        channel: a.channel,
      },
    });
  }

  type PastVisitStatus = "COMPLETED" | "NO_SHOW" | "CANCELLED";
  const pastVisits: Array<{ patient: string; professional: string; daysAgo: number; status: PastVisitStatus }> = [
    { patient: "María Aguirre", professional: "Dra. Carla Benítez", daysAgo: 48, status: "COMPLETED" },
    { patient: "María Aguirre", professional: "Lic. Sofía Duarte", daysAgo: 87, status: "COMPLETED" },
    { patient: "María Aguirre", professional: "Dr. Iván Sosa", daysAgo: 134, status: "CANCELLED" },
    { patient: "María Aguirre", professional: "Dra. Lucía Ramírez", daysAgo: 184, status: "COMPLETED" },
    { patient: "Federico Núñez", professional: "Dr. Matías Ferreyra", daysAgo: 8, status: "COMPLETED" },
    { patient: "Federico Núñez", professional: "Dr. Matías Ferreyra", daysAgo: 15, status: "NO_SHOW" },
    { patient: "Federico Núñez", professional: "Dr. Pablo Cáceres", daysAgo: 22, status: "COMPLETED" },
    { patient: "Noelia Cabrera", professional: "Dra. Lucía Ramírez", daysAgo: 72, status: "COMPLETED" },
    { patient: "Noelia Cabrera", professional: "Lic. Sofía Duarte", daysAgo: 178, status: "COMPLETED" },
    { patient: "Diego Maldonado", professional: "Lic. Sofía Duarte", daysAgo: 44, status: "NO_SHOW" },
    { patient: "Diego Maldonado", professional: "Lic. Sofía Duarte", daysAgo: 71, status: "COMPLETED" },
    { patient: "Diego Maldonado", professional: "Dr. Iván Sosa", daysAgo: 90, status: "COMPLETED" },
    { patient: "Camila Bogado", professional: "Dr. Matías Ferreyra", daysAgo: 7, status: "COMPLETED" },
    { patient: "Camila Bogado", professional: "Dr. Matías Ferreyra", daysAgo: 14, status: "COMPLETED" },
    { patient: "Camila Bogado", professional: "Dr. Matías Ferreyra", daysAgo: 21, status: "COMPLETED" },
    { patient: "Rodrigo Villalba", professional: "Dr. Iván Sosa", daysAgo: 107, status: "COMPLETED" },
  ];

  for (const v of pastVisits) {
    await prisma.appointment.create({
      data: {
        patientId: patients[v.patient].id,
        professionalId: professionals[v.professional].id,
        date: atTime(-v.daysAgo, 10, 0),
        status: v.status,
        channel: "WHATSAPP",
      },
    });
  }

  // Blackout days (feriados / cierre general): ningún profesional ofrece turnos.
  await prisma.blackoutDay.upsert({
    where: { date: new Date("2026-08-15T00:00:00.000Z") },
    update: {},
    create: { date: new Date("2026-08-15T00:00:00.000Z"), reason: "Feriado — Fundación de Asunción" },
  });
  await prisma.blackoutDay.upsert({
    where: { date: new Date("2026-08-25T00:00:00.000Z") },
    update: {},
    create: { date: new Date("2026-08-25T00:00:00.000Z"), reason: "Cierre por mantenimiento" },
  });

  // Excepción puntual: la Dra. Benítez no atiende un día puntual próximo, pese a su horario semanal.
  await prisma.professionalAvailabilityException.upsert({
    where: {
      professionalId_date: {
        professionalId: professionals["Dra. Carla Benítez"].id,
        date: atMidnight(5),
      },
    },
    update: {},
    create: {
      professionalId: professionals["Dra. Carla Benítez"].id,
      date: atMidnight(5),
      available: false,
    },
  });

  // Seguimientos: leads que preguntaron y no volvieron a responder (ventana de 24h de WhatsApp).
  const followUpLeads = [
    { phone: "+595982111111", name: "Lorena Giménez", topic: "Consultó por limpieza dental", msg: "Hola, quería saber cuánto sale una limpieza y si tienen lugar esta semana", hoursAgo: 17, disabled: false },
    { phone: "+595982222222", name: "Sergio Ovelar", topic: "Pidió turno de kinesiología", msg: "Perfecto, déjame ver mi agenda y te confirmo el horario", hoursAgo: 12, disabled: false },
    { phone: "+595982333333", name: "Patricia Rojas", topic: "Consultó por plan nutricional", msg: "¿El plan incluye seguimiento mensual o es una sola consulta?", hoursAgo: 20, disabled: false },
    { phone: "+595982444444", name: "Hernán Barrios", topic: "Reagendamiento pendiente", msg: "Se me complicó el jueves, ¿qué otro día tienen disponible?", hoursAgo: 8, disabled: false },
    { phone: "+595982555555", name: "Julieta Franco", topic: "Consultó por dermatología", msg: "Gracias! Lo consulto con mi esposo y te escribo", hoursAgo: 4, disabled: false },
  ];

  for (const f of followUpLeads) {
    const patient = await prisma.patient.upsert({
      where: { phone: f.phone },
      update: {},
      create: { phone: f.phone, name: f.name },
    });
    await prisma.message.create({
      data: { patientId: patient.id, direction: "INBOUND", body: f.msg },
    });
    const lastInboundAt = new Date(Date.now() - f.hoursAgo * 60 * 60 * 1000);
    const windowExpiresAt = new Date(lastInboundAt.getTime() + 24 * 60 * 60 * 1000);
    await prisma.followUp.upsert({
      where: { patientId: patient.id },
      update: {},
      create: { patientId: patient.id, lastInboundAt, windowExpiresAt, disabled: f.disabled },
    });
  }

  console.log("Seed completo: clínica demo 'Clínica Aurora' lista.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
