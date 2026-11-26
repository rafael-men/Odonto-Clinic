/** @jest-environment node */

jest.mock("@/lib/prisma", () => ({
    __esModule: true,
    default: {
        user: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
        },
    },
}));

import prisma from "@/lib/prisma";
import { publicClinicSelect } from "../../src/app/_data_access/public-clinic.select";
import { clinicScheduleSelect } from "../../src/app/clinica/[id]/_DAL/clinic-schedule.select";
import { getProfessionals } from "../../src/app/_data_access/get-professionals";
import { getInfoSchedule } from "../../src/app/clinica/[id]/_DAL/get-schedule";

const db = (prisma as any).user as Record<string, jest.Mock>;

beforeEach(() => {
    jest.clearAllMocks();
});

describe("seleções públicas não expõem dados sensíveis", () => {
    it("listagem pública não inclui password, cpf nem e-mail", () => {
        const keys = Object.keys(publicClinicSelect);
        expect(keys).not.toEqual(expect.arrayContaining(["password", "cpf", "email"]));
    });

    it("agenda pública não inclui password", () => {
        expect(Object.keys(clinicScheduleSelect)).not.toContain("password");
    });
});

describe("getProfessionals", () => {
    it("consulta usando o select público", async () => {
        db.findMany.mockResolvedValue([]);
        await getProfessionals();
        expect(db.findMany).toHaveBeenCalledWith({ select: publicClinicSelect });
    });
});

describe("getInfoSchedule", () => {
    it("consulta a clínica pelo id usando o select da agenda", async () => {
        db.findFirst.mockResolvedValue(null);
        await getInfoSchedule({ userId: "c1" });
        expect(db.findFirst).toHaveBeenCalledWith({
            where: { id: "c1" },
            select: clinicScheduleSelect,
        });
    });

    it("retorna null sem id e não consulta o banco", async () => {
        await expect(getInfoSchedule({ userId: "" })).resolves.toBeNull();
        expect(db.findFirst).not.toHaveBeenCalled();
    });
});