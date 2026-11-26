'use server'

import prisma from "@/lib/prisma";
import { requireOwnUserId } from "@/lib/authorization";
import { userProfileSelect } from "./User-Profile-Select";

interface getUserProps {
    userId: string;
}

export default async function getUser({ userId }: getUserProps) {
    const ownerId = await requireOwnUserId(userId);

    try {
        const user = await prisma.user.findFirst({
            where: { id: ownerId },
            select: userProfileSelect,
        });

        return user ?? null;
    }
    catch {
        return null;
    }
}
