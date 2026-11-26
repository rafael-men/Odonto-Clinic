jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

jest.mock("@/lib/prisma", () => ({
    __esModule: true,
    default: {
        reminder: { deleteMany: jest.fn() },
    },
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireOwnUserId } from "@/lib/authorization";
import { DeleteReminder } from "../../src/app/dashboard/_actions/delete-reminder";

const mockAuth = auth as unknown as jest.Mock;
const mockDeleteMany = (prisma as any).reminder.deleteMany as jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
});

describe("requireOwnUserId", () => {
    it("lança UNAUTHENTICATED quando não há sessão", async () => {
        mockAuth.mockResolvedValue(null);
        await expect(requireOwnUserId("A")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    });

    it("lança FORBIDDEN quando o userId pedido é de outro usuário", async () => {
        mockAuth.mockResolvedValue({ user: { id: "A" } });
        await expect(requireOwnUserId("B")).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("lança FORBIDDEN para string vazia", async () => {
        mockAuth.mockResolvedValue({ user: { id: "A" } });
        await expect(requireOwnUserId("")).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("retorna o id da sessão quando o userId é igual", async () => {
        mockAuth.mockResolvedValue({ user: { id: "A" } });
        await expect(requireOwnUserId("A")).resolves.toBe("A");
    });

    it("retorna o id da sessão quando o userId não é informado", async () => {
        mockAuth.mockResolvedValue({ user: { id: "A" } });
        await expect(requireOwnUserId(undefined)).resolves.toBe("A");
    });
});

describe("DeleteReminder", () => {
    it("retorna não autorizado sem sessão e não apaga nada", async () => {
        mockAuth.mockResolvedValue(null);

        const result = await DeleteReminder({ reminderId: "r1" });

        expect(result).toEqual({ error: "Não autorizado" });
        expect(mockDeleteMany).not.toHaveBeenCalled();
    });

    it("apaga apenas com id e dono da sessão", async () => {
        mockAuth.mockResolvedValue({ user: { id: "A" } });
        mockDeleteMany.mockResolvedValue({ count: 1 });

        const result = await DeleteReminder({ reminderId: "r1" });

        expect(mockDeleteMany).toHaveBeenCalledWith({ where: { id: "r1", userId: "A" } });
        expect(result).toEqual({ success: true });
        expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("não revalida nem informa sucesso quando o lembrete é de outro usuário", async () => {
        mockAuth.mockResolvedValue({ user: { id: "A" } });
        mockDeleteMany.mockResolvedValue({ count: 0 });

        const result = await DeleteReminder({ reminderId: "r-de-b" });

        expect(result).toEqual({ error: "Lembrete não encontrado." });
        expect(revalidatePath).not.toHaveBeenCalled();
    });
});
