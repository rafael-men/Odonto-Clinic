'use server'

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const formSchema = z.object({
    appointmentId: z.string().min(3, "Forneça um agendamento válido"),
});

type FormSchema = z.infer<typeof formSchema>;

export async function cancelAppointment(formData: FormSchema) {
    const schema = formSchema.safeParse(formData);

    if (!schema.success) {
        return { error: schema.error.issues[0]?.message };
    }

    const session = await auth();

    if (!session?.user?.id) {
        return { error: "Usuário não autenticado" };
    }

    try {

        //o filtro por userId garante que só a clínica dona do agendamento cancela
        const result = await prisma.appointments.updateMany({
            where: {
                id: schema.data.appointmentId,
                userId: session.user.id,
                status: { not: "cancelled" },
            },
            data: { status: "cancelled" },
        });

        if (result.count === 0) {
            return { error: "Agendamento não encontrado ou já cancelado." };
        }

        return { success: true };
    } catch {
        return { error: "Erro ao cancelar o agendamento" };
    }
}
