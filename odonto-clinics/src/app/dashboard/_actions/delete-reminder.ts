'use server';

import prisma from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { AuthorizationError, requireSessionUserId } from "@/lib/authorization";

const formSchema = z.object({
    reminderId: z.string().min(1, "O ID do lembrete é obrigatório"),
})

type FormData = z.infer<typeof formSchema>;

export async function DeleteReminder(form: FormData) {
    let userId: string;
    try {
        userId = await requireSessionUserId();
    } catch (err) {
        if (err instanceof AuthorizationError) return { error: 'Não autorizado' };
        throw err;
    }

    const schema = formSchema.safeParse(form);

    if (!schema.success) {
        return {
            error: schema.error.issues[0].message
        }
    }

    try {
        const result = await prisma.reminder.deleteMany({
            where: { id: schema.data.reminderId, userId },
        });

        if (result.count === 0) {
            return { error: 'Lembrete não encontrado.' };
        }

        revalidatePath('/dashboard');
        return { success: true };
    }
    catch {
        return {
            error: 'não foi possível deletar o lembrete.'
        };
    }
}
