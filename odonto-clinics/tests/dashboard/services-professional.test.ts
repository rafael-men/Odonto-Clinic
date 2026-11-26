/** @jest-environment node */

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

jest.mock("@/lib/prisma", () => ({
    __esModule: true,
    default: {
        professional: { findFirst: jest.fn() },
        service: { create: jest.fn(), update: jest.fn() },
    },
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createService } from "../../src/app/dashboard/services/_actions/createService";
import { updateService } from "../../src/app/dashboard/services/_actions/updateService";

const mockAuth = auth as unknown as jest.Mock;
const db = prisma as any;

const base = { name: "Limpeza", price: 5000, duration: 30 };

beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "A" } });
    db.service.create.mockResolvedValue({ id: "s1", name: "Limpeza" });
    db.service.update.mockResolvedValue({ id: "s1", name: "Limpeza" });
});

describe("createService e professionalId", () => {
    it("recusa profissional de outra clínica e não grava", async () => {
        db.professional.findFirst.mockResolvedValue(null);

        const result = await createService({ ...base, professionalId: "prof-de-b" });

        expect(db.professional.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "prof-de-b", userId: "A" } }),
        );
        expect(result).toEqual({ success: false, error: "Profissional inválido para esta clínica." });
        expect(db.service.create).not.toHaveBeenCalled();
    });

    it("grava quando o profissional é da própria clínica", async () => {
        db.professional.findFirst.mockResolvedValue({ id: "prof-a" });

        await createService({ ...base, professionalId: "prof-a" });

        expect(db.service.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ professionalId: "prof-a", userId: "A" }) }),
        );
    });

    it("grava sem profissional e não consulta o banco", async () => {
        await createService(base);

        expect(db.professional.findFirst).not.toHaveBeenCalled();
        expect(db.service.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ professionalId: null }) }),
        );
    });
});

describe("updateService e professionalId", () => {
    it("recusa profissional de outra clínica e não altera o serviço", async () => {
        db.professional.findFirst.mockResolvedValue(null);

        const result = await updateService({ ...base, serviceId: "s1", professionalId: "prof-de-b" });

        expect(result).toEqual({ success: false, error: "Profissional inválido para esta clínica." });
        expect(db.service.update).not.toHaveBeenCalled();
    });

    it("altera quando o profissional é da própria clínica", async () => {
        db.professional.findFirst.mockResolvedValue({ id: "prof-a" });

        const result = await updateService({ ...base, serviceId: "s1", professionalId: "prof-a" });

        expect(result.success).toBe(true);
        expect(db.service.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "s1", userId: "A" } }),
        );
    });
});