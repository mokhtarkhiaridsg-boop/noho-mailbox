"use server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export async function getSiteConfig(key: string): Promise<string | null> {
  const row = await prisma.siteConfig.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSiteConfig(key: string, value: string): Promise<{ success: boolean }> {
  await verifyAdmin();
  await prisma.siteConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function setSiteConfigs(entries: Record<string, string>): Promise<{ success: boolean }> {
  await verifyAdmin();
  await Promise.all(
    Object.entries(entries).map(([key, value]) =>
      prisma.siteConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );
  revalidatePath("/admin");
  return { success: true };
}

export async function getManyConfigs(keys: string[]): Promise<Record<string, string>> {
  const rows = await prisma.siteConfig.findMany({ where: { key: { in: keys } } });
  const out: Record<string, string> = {};
  for (const row of rows) out[row.key] = row.value;
  return out;
}
