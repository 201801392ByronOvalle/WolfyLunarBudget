// api/tests/http/app.test.ts
// Importar src/app.ts no debe consultar la base ni verificar el usuario actual (T019).
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prismaFake } from "../support/prisma-fake";

vi.mock("../../src/lib/prisma", async () => {
    const { prismaFake: doble } = await import("../support/prisma-fake");
    return { prisma: doble, OPCIONES_TRANSACCION: { maxWait: 5000, timeout: 10000 } };
});

let servidor: Server;
let baseUrl: string;

beforeAll(async () => {
    prismaFake.control.reiniciar();
    const { app } = await import("../../src/app");
    servidor = await new Promise<Server>((resolve) => {
        const instancia = app.listen(0, () => resolve(instancia));
    });
    baseUrl = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(async () => {
    await new Promise<void>((resolve) => servidor.close(() => resolve()));
});

describe("app.ts", () => {
    it("importarla no llama a Prisma ni verifica el usuario", () => {
        expect(prismaFake.control.llamadas).toEqual([]);
    });

    it("GET /health responde 200 sin consultar la base", async () => {
        const respuesta = await fetch(`${baseUrl}/health`);
        expect(respuesta.status).toBe(200);
        expect(await respuesta.json()).toEqual({ success: true, status: "OK" });
        expect(prismaFake.control.llamadas).toEqual([]);
    });

    it("una ruta inexistente responde 404", async () => {
        const respuesta = await fetch(`${baseUrl}/no-existe`);
        expect(respuesta.status).toBe(404);
    });
});
