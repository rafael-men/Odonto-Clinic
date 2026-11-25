process.env.TZ = "America/Sao_Paulo";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ScheduleContent } from "../../src/app/clinica/[id]/_components/schedule-cont";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/components/toast-provider", () => ({
  useToast: () => ({ addToast: jest.fn() }),
}));

jest.mock("../../src/app/clinica/[id]/_actions/create-appointment", () => ({
  createAppointment: jest.fn(),
}));

jest.mock("../../src/app/clinica/[id]/_components/datePicker", () => ({
  DateTimePicker: () => null,
}));


jest.mock("@/components/ui/select", () => {
  const React = require("react");
  return {
    Select: ({ onValueChange, children }: any) =>
      React.createElement(
        "select",
        {
          "data-testid": "service-select",
          onChange: (e: any) => onValueChange(e.target.value),
        },
        React.createElement("option", { value: "" }, ""),
        children,
      ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: any) => children,
    SelectItem: ({ value, children }: any) =>
      React.createElement("option", { value }, children),
  };
});

const clinica = {
  id: "c1",
  name: "Clínica Teste",
  image: null,
  address: "Rua A, 100",
  status: true,
  times: ["09:00", "10:00"],
  services: [
    {
      id: "s1",
      name: "Limpeza",
      duration: 30,
      price: 5000,
      status: true,
      userId: "c1",
      professionalId: null,
      professional: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
} as any;

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function chooseService() {
  fireEvent.change(screen.getByTestId("service-select"), {
    target: { value: "s1" },
  });
}

beforeEach(() => {
  jest.useFakeTimers({
    doNotFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "setImmediate",
      "clearImmediate",
      "queueMicrotask",
      "nextTick",
    ],
  });
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("ScheduleContent: horários bloqueados", () => {
  it("pede os horários do dia local, mesmo depois de 21h em Brasília", async () => {
    jest.setSystemTime(new Date(2026, 10, 23, 23, 30));
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, []));

    render(<ScheduleContent clinica={clinica} patient={null} />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain("date=2026-11-23");
  });

  it("desabilita os horários ocupados e mantém os demais livres", async () => {
    jest.setSystemTime(new Date(2026, 10, 23, 8, 0));
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, ["09:00"]));

    render(<ScheduleContent clinica={clinica} patient={null} />);
    chooseService();

    const occupied = await screen.findByRole("button", { name: "09:00" });
    const free = screen.getByRole("button", { name: "10:00" });

    expect((occupied as HTMLButtonElement).disabled).toBe(true);
    expect((free as HTMLButtonElement).disabled).toBe(false);
  });

  it("não libera horários quando o servidor responde com erro", async () => {
    jest.setSystemTime(new Date(2026, 10, 23, 8, 0));
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(500, { error: "Erro interno" }),
    );

    render(<ScheduleContent clinica={clinica} patient={null} />);
    chooseService();

    expect(
      await screen.findByText("Nenhum horário disponível para esta data"),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "09:00" })).toBeNull();
    expect(screen.queryByRole("button", { name: "10:00" })).toBeNull();
  });

  it("não libera horários quando a requisição falha por rede", async () => {
    jest.setSystemTime(new Date(2026, 10, 23, 8, 0));
    (global.fetch as jest.Mock).mockRejectedValue(new Error("network down"));

    render(<ScheduleContent clinica={clinica} patient={null} />);
    chooseService();

    expect(
      await screen.findByText("Nenhum horário disponível para esta data"),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "09:00" })).toBeNull();
  });
});
