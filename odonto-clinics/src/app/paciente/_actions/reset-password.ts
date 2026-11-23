'use server'

import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { enforceRateLimit, getClientIp, tooManyAttemptsMessage } from "@/lib/rate-limit";


function generateToken(): string {
    const array = new Uint8Array(32);
    globalThis.crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function requestPasswordReset(email: string) {
    const ip = await getClientIp();
    const normalized = email.trim().toLowerCase();
    const blocked = await enforceRateLimit([
        { key: `reset-request:ip:${ip}`, limit: 10, windowSeconds: 60 * 60 },
        { key: `reset-request:email:${normalized}`, limit: 3, windowSeconds: 60 * 60 },
    ])
    if(blocked) {
        return {
            error: tooManyAttemptsMessage(blocked.retryAfterSeconds)
        }
    }
    try {
        const patient = await prisma.patient.findUnique({ where: { email } });
        if (!patient) {
            return { success: true };
        }

        await prisma.passwordResetToken.deleteMany({ where: { email } });

        const token = generateToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await prisma.passwordResetToken.create({
            data: { email, token, expiresAt },
        });

        sendPasswordResetEmail(email, patient.name, token);

        return { success: true };
    } catch {
        return { error: "Erro ao processar solicitação." };
    }
}

export async function resetPassword(token: string, newPassword: string) {
    const ip = await getClientIp();
    const block = await enforceRateLimit([
        { key: `reset-confirm:ip:${ip}`, limit: 20, windowSeconds: 15 * 60 },
    ])
    if(block) {
        return {
            error: tooManyAttemptsMessage(block.retryAfterSeconds)
        }
    }
    if (newPassword.length < 6) {
        return { error: "A senha deve ter pelo menos 6 caracteres." };
    }

    try {
        const record = await prisma.passwordResetToken.findUnique({ where: { token } });

        if (!record) {
            return { error: "Link inválido ou expirado." };
        }

        if (record.expiresAt < new Date()) {
            await prisma.passwordResetToken.delete({ where: { token } });
            return { error: "Link expirado. Solicite uma nova redefinição." };
        }

        const hashed = await bcrypt.hash(newPassword, 10);

        await prisma.patient.update({
            where: { email: record.email },
            data: { password: hashed },
        });

        await prisma.passwordResetToken.delete({ where: { token } });

        return { success: true };
    } catch {
        return { error: "Erro ao redefinir senha." };
    }
}
