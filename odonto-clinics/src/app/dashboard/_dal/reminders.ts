'use server'

import prisma from "@/lib/prisma";
import { requireOwnUserId } from "@/lib/authorization";

export async function getReminders({userId} : {userId: string}) {
    const ownerId = await requireOwnUserId(userId);

    try {
        const reminders = await prisma.reminder.findMany({
            where: { userId: ownerId }
        })

        return reminders;
    }
    catch {
        return [];
    }
}
