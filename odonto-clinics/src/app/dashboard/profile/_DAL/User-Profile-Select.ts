import type { Prisma } from "@/generated/prisma/client";

//todos os campos escalares de User, exceto password
export const userProfileSelect = {
    id: true,
    name: true,
    email: true,
    emailVerified: true,
    cpf: true,
    image: true,
    address: true,
    phone: true,
    status: true,
    timeZone: true,
    times: true,
} satisfies Prisma.UserSelect;

export type UserProfile = Prisma.UserGetPayload<{ select: typeof userProfileSelect }>;
