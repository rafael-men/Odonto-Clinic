'use server'

import prisma from "@/lib/prisma";
import { requireOwnUserId } from "@/lib/authorization";

export async function getAgenda({userId} : {userId: string}) {
    const ownerId = await requireOwnUserId(userId);

    try {
        const user = await prisma.user.findFirst({
            where: { id: ownerId },
            select: { id: true, times: true }
        })

        if (!user) {
            return { times: [], userId: '' };
        }

        return { times: user.times, userId: user.id };
    }
    catch {
        return { times: [], userId: '' };
    }
}
