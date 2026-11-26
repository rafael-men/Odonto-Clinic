'use server'

import prisma from "@/lib/prisma";
import { requireOwnUserId } from "@/lib/authorization";

export async function getServices({userId}: {userId: string}) {
    const ownerId = await requireOwnUserId(userId);

    try {
        const services = await prisma.service.findMany({
            where: {
                userId: ownerId,
                status: true
            },
            include: {
                professional: true,
            }
        })

        return {
            data: services
        }
    }
    catch {
        throw new Error('Erro ao Buscar Serviços.');
    }
}
