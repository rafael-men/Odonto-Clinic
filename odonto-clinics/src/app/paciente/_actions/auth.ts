'use server'

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { enforceRateLimit, getClientIp, resetRateLimit, tooManyAttemptsMessage } from "@/lib/rate-limit";
import {
    COOKIE_NAME,
    createPatientCookieValue,
    patientCookieOptions,
    patientFingerprint,
    readPatientCookieValue,
} from "@/lib/patient-session";

type PatientAuthRecord = {
    id: string;
    password: string | null;
    googleId: string | null;
};

async function setPatientSession(patient: PatientAuthRecord) {
    const cookieStore = await cookies();
    cookieStore.set(
        COOKIE_NAME,
        createPatientCookieValue(patient.id, patientFingerprint(patient)),
        patientCookieOptions,
    );
}

export async function registerPatient(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
}) {
    const ip = await getClientIp();
    const blocked = await enforceRateLimit([
        { key: `register:ip:${ip}`, limit: 10, windowSeconds: 60 * 60 },
    ]);
    if (blocked) return { error: tooManyAttemptsMessage(blocked.retryAfterSeconds) };

    const existing = await prisma.patient.findUnique({ where: { email: data.email } });
    if (existing) return { error: "Email já cadastrado." };

    const hashed = await bcrypt.hash(data.password, 10);
    const patient = await prisma.patient.create({
        data: { name: data.name, email: data.email, phone: data.phone, password: hashed },
    });

    await setPatientSession(patient);

    return { success: true };
}

export async function loginPatient(data: { email: string; password: string }) {
    const email = data.email.trim().toLowerCase();
    const ip = await getClientIp();

    const blocked = await enforceRateLimit([
        { key: `login:ip:${ip}`, limit: 30, windowSeconds: 15 * 60 },
        { key: `login:patient:${email}`, limit: 10, windowSeconds: 15 * 60 },
    ]);
    if (blocked) return { error: tooManyAttemptsMessage(blocked.retryAfterSeconds) };

    const patient = await prisma.patient.findUnique({ where: { email: data.email } });

    // Conta criada só com Google não tem senha. A mensagem é a mesma de senha errada.
    if (!patient || !patient.password) return { error: "Email ou senha inválidos." };

    const valid = await bcrypt.compare(data.password, patient.password);
    if (!valid) return { error: "Email ou senha inválidos." };

    await resetRateLimit(`login:patient:${email}`);
    await setPatientSession(patient);

    return { success: true };
}

export async function logoutPatient() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    redirect("/paciente/login");
}

export async function getPatientSession() {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_NAME)?.value;
    if (!raw) return null;

    const session = readPatientCookieValue(raw);
    if (!session) return null;

    const patient = await prisma.patient.findUnique({
        where: { id: session.id },
        select: { id: true, name: true, email: true, phone: true, password: true, googleId: true },
    });

    // password e googleId só entram na comparação. Não são devolvidos.
    if (!patient || patientFingerprint(patient) !== session.fp) return null;

    return {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
    };
}