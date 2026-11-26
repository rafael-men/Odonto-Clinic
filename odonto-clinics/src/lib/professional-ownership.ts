import prisma from "@/lib/prisma";

/**
 * Confere se o profissional pertence à clínica. Sem professionalId, o serviço fica sem profissional
 * e a checagem passa.
 */
export async function isOwnedProfessional(
    professionalId: string | null | undefined,
    userId: string,
): Promise<boolean> {
    if (!professionalId) return true;

    const found = await prisma.professional.findFirst({
        where: { id: professionalId, userId },
        select: { id: true },
    });
    return found !== null;
}