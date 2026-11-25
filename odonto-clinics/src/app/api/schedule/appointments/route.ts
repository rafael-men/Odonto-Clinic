import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");
    const dateParam = searchParams.get("date");

    if (!userId || !dateParam || !DATE_FORMAT.test(dateParam)) {
        return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const [year, monthNumber, day] = dateParam.split("-").map(Number);
    const start = new Date(year, monthNumber - 1, day, 0, 0, 0, 0);

    // Rejeita datas que não existem, como 2026-02-30, que o JavaScript converteria em março.
    if (
        start.getFullYear() !== year ||
        start.getMonth() !== monthNumber - 1 ||
        start.getDate() !== day
    ) {
        return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }

    const end = new Date(year, monthNumber - 1, day, 23, 59, 59, 999);

    try {
        const user = await prisma.user.findFirst({
            where: { id: userId },
            select: { times: true },
        });

        if (!user) {
            return NextResponse.json({ error: "Clínica não encontrada" }, { status: 404 });
        }

        const appointments = await prisma.appointments.findMany({
            where: {
                userId,
                AppointmentDate: { gte: start, lte: end },
                status: { not: "cancelled" },
            },
            include: { service: true },
        });

        const blockedSlots = new Set<string>();
        for (const apt of appointments) {
            const aptStartMin = timeToMinutes(apt.time);
            const aptEndMin = aptStartMin + apt.service.duration;

            for (const time of user.times) {
                const slotMin = timeToMinutes(time);
                if (slotMin >= aptStartMin && slotMin < aptEndMin) {
                    blockedSlots.add(time);
                }
            }
        }

        return NextResponse.json(Array.from(blockedSlots));
    } catch (err) {
        console.error("Falha ao buscar horários bloqueados:", err instanceof Error ? err.message : err);
        return NextResponse.json({ error: "Erro interno ao buscar horários" }, { status: 500 });
    }
}
