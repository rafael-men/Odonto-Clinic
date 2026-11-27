jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

jest.mock("@/lib/prisma", () => ({
    __esModule: true,
    default: {
        appointments: {
            updateMany: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { cancelAppointment } from "../../src/app/_actions-appointments/cancel-appointment";

const mockAuth = auth as unknown as jest.Mock;
const db = (prisma as any).appointments as Record<string, jest.Mock>;

beforeEach(() => {
    jest.clearAllMocks();
});

describe("cancelAppointment (clínica)", () => {
    it("sem sessão retorna erro e não altera nada", async () => {
        mockAuth.mockResolvedValue(null);

        const result = await cancelAppointment({ appointmentId: "appt-1" });

        expect(result).toEqual({ error: "Usuário não autenticado" });
        expect(db.updateMany).not.toHaveBeenCalled();
    });

    it("marca como cancelado com filtro de dono e de status", async () => {
        mockAuth.mockResolvedValue({ user: { id: "A" } });
        db.updateMany.mockResolvedValue({ count: 1 });

        const result = await cancelAppointment({ appointmentId: "appt-1" });

        expect(db.updateMany).toHaveBeenCalledWith({
            where: { id: "appt-1", userId: "A", status: { not: "cancelled" } },
            data: { status: "cancelled" },
        });
        expect(result).toEqual({ success: true });
    });

    it("não apaga o registro", async () => {
        mockAuth.mockResolvedValue({ user: { id: "A" } });
        db.updateMany.mockResolvedValue({ count: 1 });

        await cancelAppointment({ appointmentId: "appt-1" });

        expect(db.delete).not.toHaveBeenCalled();
    });

    it("agendamento de outra clínica ou já cancelado retorna erro", async () => {
        mockAuth.mockResolvedValue({ user: { id: "A" } });
        db.updateMany.mockResolvedValue({ count: 0 });

        const result = await cancelAppointment({ appointmentId: "appt-de-b" });

        expect(result).toEqual({ error: "Agendamento não encontrado ou já cancelado." });
    });
});
