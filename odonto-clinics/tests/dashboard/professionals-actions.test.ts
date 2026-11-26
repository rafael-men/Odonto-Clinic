jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

jest.mock("@/lib/prisma", () => ({
    __esModule: true,
    default: {
        professional: {
            findMany: jest.fn(),
            create: jest.fn(),
            updateMany: jest.fn(),
            deleteMany: jest.fn(),
        },
    },
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
    getProfessionalsByUser,
    createProfessional,
    updateProfessional,
    deleteProfessional,
} from "../../src/app/dashboard/profissionais/_actions/professionals-actions";

const mockAuth = auth as unknown as jest.Mock;
const db = (prisma as any).professional as Record<string, jest.Mock>;

const session = (id: string) => mockAuth.mockResolvedValue({ user: { id } });

const payload = { name: "Dr. X", crm: "123", phone: "11999999999", whatsapp: "11999999999" };

beforeEach(() => {
    jest.clearAllMocks();
});

describe("getProfessionalsByUser", () => {
    it("sem sessão lança UNAUTHENTICATED e não consulta o banco", async () => {
        mockAuth.mockResolvedValue(null);
        await expect(getProfessionalsByUser("A")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
        expect(db.findMany).not.toHaveBeenCalled();
    });

    it("userId de outra clínica lança FORBIDDEN", async () => {
        session("A");
        await expect(getProfessionalsByUser("B")).rejects.toMatchObject({ code: "FORBIDDEN" });
        expect(db.findMany).not.toHaveBeenCalled();
    });

    it("consulta somente os profissionais do id da sessão", async () => {
        session("A");
        db.findMany.mockResolvedValue([]);
        await getProfessionalsByUser("A");
        expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "A" } }));
    });
});

describe("createProfessional", () => {
    it("userId de outra clínica é recusado e nada é gravado", async () => {
        session("A");
        await expect(createProfessional({ ...payload, userId: "B" })).rejects.toMatchObject({ code: "FORBIDDEN" });
        expect(db.create).not.toHaveBeenCalled();
    });

    it("grava com o id da sessão e revalida a página", async () => {
        session("A");
        await createProfessional({ ...payload, userId: "A" });
        expect(db.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ userId: "A", name: "Dr. X" }) }),
        );
        expect(revalidatePath).toHaveBeenCalledWith("/dashboard/profissionais");
    });
});

describe("updateProfessional", () => {
    it("não altera profissional de outra clínica", async () => {
        session("A");
        db.updateMany.mockResolvedValue({ count: 0 });
        await expect(updateProfessional("prof-de-b", payload)).rejects.toThrow("Profissional não encontrado.");
        expect(db.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "prof-de-b", userId: "A" } }),
        );
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("sem sessão lança UNAUTHENTICATED", async () => {
        mockAuth.mockResolvedValue(null);
        await expect(updateProfessional("prof-1", payload)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
        expect(db.updateMany).not.toHaveBeenCalled();
    });
});

describe("deleteProfessional", () => {
    it("apaga somente com id e dono da sessão", async () => {
        session("A");
        db.deleteMany.mockResolvedValue({ count: 1 });
        await deleteProfessional("prof-1");
        expect(db.deleteMany).toHaveBeenCalledWith({ where: { id: "prof-1", userId: "A" } });
        expect(revalidatePath).toHaveBeenCalledWith("/dashboard/profissionais");
    });

    it("não apaga profissional de outra clínica", async () => {
        session("A");
        db.deleteMany.mockResolvedValue({ count: 0 });
        await expect(deleteProfessional("prof-de-b")).rejects.toThrow("Profissional não encontrado.");
        expect(revalidatePath).not.toHaveBeenCalled();
    });
});