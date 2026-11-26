'use server'

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireOwnUserId, requireSessionUserId } from "@/lib/authorization";

const PROFESSIONALS_PATH = '/dashboard/profissionais';

export async function getProfessionalsByUser(userId: string) {
    const ownerId = await requireOwnUserId(userId);

    return prisma.professional.findMany({
        where: { userId: ownerId },
        orderBy: { createdAt: 'desc' },
    });
}

export async function createProfessional(data: {
    name: string;
    crm: string;
    phone: string;
    whatsapp: string;
    photo?: string;
    userId: string;
}) {
    // O userId recebido só é conferido. O registro grava o id da sessão.
    const ownerId = await requireOwnUserId(data.userId);

    await prisma.professional.create({
        data: {
            name: data.name,
            crm: data.crm,
            phone: data.phone,
            whatsapp: data.whatsapp,
            photo: data.photo,
            userId: ownerId,
        },
    });
    revalidatePath(PROFESSIONALS_PATH);
}

export async function updateProfessional(id: string, data: {
    name: string;
    crm: string;
    phone: string;
    whatsapp: string;
    photo?: string;
}) {
    const ownerId = await requireSessionUserId();

    // updateMany com dono no filtro: um profissional de outra clínica não é alterado.
    const result = await prisma.professional.updateMany({
        where: { id, userId: ownerId },
        data,
    });
    if (result.count === 0) {
        throw new Error("Profissional não encontrado.");
    }
    revalidatePath(PROFESSIONALS_PATH);
}

export async function deleteProfessional(id: string) {
    const ownerId = await requireSessionUserId();

    const result = await prisma.professional.deleteMany({
        where: { id, userId: ownerId },
    });
    if (result.count === 0) {
        throw new Error("Profissional não encontrado.");
    }
    revalidatePath(PROFESSIONALS_PATH);
}