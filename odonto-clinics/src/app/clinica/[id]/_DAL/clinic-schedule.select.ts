import type { Prisma } from "@/generated/prisma/client";

// Dados necessários para a página pública de agendamento. Sem password, cpf nem e-mail.
export const clinicScheduleSelect = {
    id: true,
    name: true,
    image: true,
    address: true,
    status: true,
    times: true,
    services: {
        where: { status: true },
        select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            professional: {
                select: { id: true, name: true, photo: true },
            },
        },
    },
} satisfies Prisma.UserSelect;

export type ClinicSchedule = Prisma.UserGetPayload<{ select: typeof clinicScheduleSelect }>;