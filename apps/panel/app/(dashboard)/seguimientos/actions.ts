"use server";

import { prisma } from "@sistema-clinica/db";
import { revalidatePath } from "next/cache";

export async function toggleFollowUp(id: string, disabled: boolean) {
  await prisma.followUp.update({ where: { id }, data: { disabled } });
  revalidatePath("/seguimientos");
}
