import type { Prisma } from "@/generated/prisma/client";

// Campos de User exibidos nas listagens públicas. Não inclui password, cpf nem e-mail.
export const publicClinicSelect = {
    id: true,
    name: true,
    image: true,
    address: true,
    phone: true,
    times: true,
} satisfies Prisma.UserSelect;

export type PublicClinic = Prisma.UserGetPayload<{ select: typeof publicClinicSelect }>;