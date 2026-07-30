"use server";

import { prisma } from "@sistema-clinica/db";
import { revalidatePath } from "next/cache";

export async function updateClinicSettings(formData: FormData) {
  const id = formData.get("id") as string;
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const botInstructions = String(formData.get("botInstructions") ?? "").trim();
  const activePromotions = String(formData.get("activePromotions") ?? "").trim();
  const botEnabled = formData.get("botEnabled") === "true";
  const weeklyHoursRaw = String(formData.get("weeklyHours") ?? "{}");

  await prisma.clinicSettings.update({
    where: { id },
    data: {
      name,
      address,
      phone,
      botInstructions: botInstructions.length > 0 ? botInstructions : null,
      activePromotions: activePromotions.length > 0 ? activePromotions : null,
      botEnabled,
      weeklyHours: JSON.parse(weeklyHoursRaw),
    },
  });

  revalidatePath("/configuracion");
  revalidatePath("/");
}
