"use server";

import { revalidatePath } from "next/cache";

import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validators";

export type ProfileState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> } | null;

/**
 * Atualiza o perfil do usuário logado (escopo = sessão).
 * Não permite trocar e-mail/role aqui — apenas dados pessoais editáveis.
 */
export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const ctx = await requireOrg();

  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    avatarUrl: formData.get("avatarUrl"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await db.user.update({
    where: { id: ctx.userId },
    data: {
      name: parsed.data.name,
      avatarUrl: parsed.data.avatarUrl || null,
    },
  });

  revalidatePath("/app/profile");
  return { ok: true };
}
