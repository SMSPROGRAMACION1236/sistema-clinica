"use server";

import { prisma, AppointmentStatus } from "@sistema-clinica/db";
import { revalidatePath } from "next/cache";

export async function setAppointmentStatus(id: string, status: AppointmentStatus) {
  await prisma.appointment.update({ where: { id }, data: { status } });
  revalidatePath("/turnos");
  revalidatePath("/");
}
