// Fixa o fuso de Brasília para o teste reproduzir o caso do bug.
process.env.TZ = "America/Sao_Paulo";

import { toDateKey } from "@/lib/utils";

describe("toDateKey", () => {
  it("mantém o dia escolhido quando a hora é depois de 21h em Brasília", () => {
    expect(toDateKey(new Date(2026, 10, 23, 21, 30))).toBe("2026-11-23");
  });

  it("mantém o dia nos limites da meia-noite", () => {
    expect(toDateKey(new Date(2026, 10, 23, 23, 59))).toBe("2026-11-23");
    expect(toDateKey(new Date(2026, 10, 24, 0, 5))).toBe("2026-11-24");
  });

  it("preenche mês e dia com zero à esquerda", () => {
    expect(toDateKey(new Date(2026, 0, 5, 10, 0))).toBe("2026-01-05");
  });
});
