process.env.TZ = "America/Sao_Paulo";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: { findFirst: jest.fn() },
    service: { findFirst: jest.fn() },
    appointments: { findMany: jest.fn(), create: jest.fn() },
  },
}));

jest.mock("@/lib/email", () => ({
  sendAppointmentConfirmationEmail: jest.fn().mockResolvedValue(true),
}));

import prisma from "@/lib/prisma";
import { createAppointment } from "../../src/app/clinica/[id]/_actions/create-appointment";

const mockPrisma = prisma as unknown as {
  user: { findFirst: jest.Mock };
  service: { findFirst: jest.Mock };
  appointments: { findMany: jest.Mock; create: jest.Mock };
};

const baseForm = {
  name: "Ana",
  email: "ana@exemplo.com",
  phone: "11999999999",
  time: "21:30",
  serviceId: "s1",
  clinicaId: "c1",
  paymentForm: "pix",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.user.findFirst.mockResolvedValue({ id: "c1", name: "Clínica Teste" });
  mockPrisma.service.findFirst.mockResolvedValue({ id: "s1", name: "Limpeza", duration: 30 });
  mockPrisma.appointments.findMany.mockResolvedValue([]);
  mockPrisma.appointments.create.mockResolvedValue({ id: "a1" });
});

describe("createAppointment com data no formato YYYY-MM-DD", () => {
  it("grava o agendamento no dia escolhido, mesmo depois de 21h", async () => {
    const result = await createAppointment({ ...baseForm, date: "2026-11-23" });

    expect(result).toEqual({ data: { id: "a1" } });
    const created = mockPrisma.appointments.create.mock.calls[0][0];
    expect(created.data.AppointmentDate).toEqual(new Date(2026, 10, 23, 0, 0, 0, 0));
  });

  it("busca os agendamentos do dia escolhido, de 00:00 a 23:59", async () => {
    await createAppointment({ ...baseForm, date: "2026-11-23" });

    const query = mockPrisma.appointments.findMany.mock.calls[0][0];
    expect(query.where.AppointmentDate.gte).toEqual(new Date(2026, 10, 23, 0, 0, 0, 0));
    expect(query.where.AppointmentDate.lte).toEqual(new Date(2026, 10, 23, 23, 59, 59, 999));
  });

  it("rejeita data que não está no formato YYYY-MM-DD", async () => {
    const result = await createAppointment({ ...baseForm, date: "23/11/2026" });

    expect(result).toEqual({ error: "Data inválida" });
    expect(mockPrisma.appointments.create).not.toHaveBeenCalled();
  });
});
