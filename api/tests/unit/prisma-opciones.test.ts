// api/tests/unit/prisma-opciones.test.ts
// Verifica los valores de las opciones de transacción (T011, research R4 / hallazgo H3).
// Importa el lib/prisma real: crear PrismaClient no abre conexión, y tests/setup.ts apunta
// DATABASE_URL a un host ".invalid". Esta prueba no consulta la base.
import { describe, expect, it } from "vitest";
import { OPCIONES_TRANSACCION } from "../../src/lib/prisma";

describe("OPCIONES_TRANSACCION", () => {
    it("fija maxWait en 5000 ms y timeout en 10000 ms", () => {
        expect(OPCIONES_TRANSACCION).toEqual({ maxWait: 5000, timeout: 10000 });
    });
});
