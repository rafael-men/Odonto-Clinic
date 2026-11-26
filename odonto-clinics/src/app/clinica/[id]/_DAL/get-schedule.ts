'use server'

import prisma from "@/lib/prisma";
import { clinicScheduleSelect } from "./clinic-schedule.select";

export async function getInfoSchedule({userId}:{userId: string}) {
    try {
        if(!userId) {
            return null;
        }

        return await prisma.user.findFirst({
            where: { id: userId },
            select: clinicScheduleSelect,
        });
    }
    catch(err) {
        throw err;
    }
}