'use server'

import prisma from "@/lib/prisma";
import { publicClinicSelect } from "./public-clinic.select";

export async function getProfessionals() {
    try {
        return await prisma.user.findMany({ select: publicClinicSelect });
    } catch (error) {
        return [];
    }
}