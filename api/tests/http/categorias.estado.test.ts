// api/tests/http/categorias.estado.test.ts
// US4 — Activar y desactivar una categoría (T045). Contrato: specs/001-gestion-categorias/contracts/categorias.md
// Prisma se sustituye por el doble en memoria; ninguna prueba toca una base de datos.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prismaFake, type CategoriaFake, type MovimientoFake } from "../support/prisma-fake";
import { iniciarServidorDePrueba, type ServidorDePrueba } from "../support/servidor-prueba";

vi.mock("../../src/lib/prisma", async () => {
    const { prismaFake: doble } = await import("../support/prisma-fake");
    return { prisma: doble, OPCIONES_TRANSACCION: { maxWait: 5000, timeout: 10000 } };
});

const USUARIO_ACTUAL = 1; // CURRENT_USER_ID de tests/setup.ts
const OTRO_USUARIO = 2;

function categoria(CATId: number, CATActiva: boolean, USUId = USUARIO_ACTUAL): CategoriaFake {
    return {
        CATId,
        CATNombre: `Categoría ${CATId}`,
        CATTipo: "gasto",
        CATColor: null,
        CATIcono: null,
        CATActiva,
        CATCreadoEn: new Date("2026-01-10T15:00:00.000Z"),
        USUId,
    };
}

function movimiento(MOVId: number, CATId: number): MovimientoFake {
    return {
        MOVId,
        MOVTipo: "GASTO",
        MOVMonto: "80.00",
        MOVDescripcion: "Cena",
        MOVFecha: new Date("2026-10-01T00:00:00.000Z"),
        MOVActiva: true,
        MOVCreadoEn: new Date("2026-10-01T00:00:00.000Z"),
        USUId: USUARIO_ACTUAL,
        CUEId: 1,
        CATId,
    };
}

let servidor: ServidorDePrueba;

async function cambiarEstado(id: number | string, accion: "activar" | "desactivar") {
    const respuesta = await fetch(`${servidor.baseUrl}/api/categorias/${id}/${accion}`, { method: "PATCH" });
    return { status: respuesta.status, cuerpo: await respuesta.json() };
}

function guardada(id: number) {
    return prismaFake.control.datos.categorias.find((c) => c.CATId === id);
}

beforeAll(async () => {
    prismaFake.control.reiniciar();
    prismaFake.control.datos.usuarios.push({ USUId: USUARIO_ACTUAL, USUNombre: "Usuario de prueba" });
    servidor = await iniciarServidorDePrueba();
});

afterAll(async () => {
    await servidor.cerrar();
});

beforeEach(() => {
    vi.restoreAllMocks();
    const { control } = prismaFake;
    control.datos.categorias.length = 0;
    control.datos.movimientos.length = 0;
    control.llamadas.length = 0;
    control.escrituras.length = 0;
    control.transacciones.length = 0;
    control.programarFallosTransaccion();
});

describe("PATCH /api/categorias/:id/desactivar", () => {
    it("desactiva una categoría activa sin borrarla (US4-2, FR-008)", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, true));

        const { status, cuerpo } = await cambiarEstado(3, "desactivar");

        expect(status).toBe(200);
        expect(cuerpo.success).toBe(true);
        expect(cuerpo.message).toBe("Categoría desactivada correctamente");
        expect(cuerpo.data).toMatchObject({ CATId: 3, CATActiva: false });
        expect(guardada(3)?.CATActiva).toBe(false);
        expect(prismaFake.control.datos.categorias).toHaveLength(1);
        expect(prismaFake.control.escrituras).toEqual([
            { modelo: "categoria", metodo: "update", data: { CATActiva: false } },
        ]);
    });

    it("con movimientos asociados se permite y no escribe sobre movimientos (US4-5, FR-010, FR-011, SC-002)", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, true));
        prismaFake.control.datos.movimientos.push(movimiento(1, 3), movimiento(2, 3));
        const antes = JSON.stringify(prismaFake.control.datos.movimientos);

        const { status } = await cambiarEstado(3, "desactivar");

        expect(status).toBe(200);
        expect(JSON.stringify(prismaFake.control.datos.movimientos)).toBe(antes);
        expect(prismaFake.control.escrituras.every((e) => e.modelo === "categoria")).toBe(true);
    });

    it("repetir sobre una categoría ya inactiva → 409 sin escrituras (US4-7, FR-012)", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, false));

        const { status, cuerpo } = await cambiarEstado(3, "desactivar");

        expect(status).toBe(409);
        expect(cuerpo).toEqual({ success: false, message: "La categoría ya se encuentra inactiva", data: null });
        expect(prismaFake.control.escrituras).toEqual([]);
    });
});

describe("PATCH /api/categorias/:id/activar", () => {
    it("activa una categoría inactiva (US4-6)", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, false));

        const { status, cuerpo } = await cambiarEstado(3, "activar");

        expect(status).toBe(200);
        expect(cuerpo.message).toBe("Categoría activada correctamente");
        expect(cuerpo.data).toMatchObject({ CATId: 3, CATActiva: true });
        expect(guardada(3)?.CATActiva).toBe(true);
    });

    it("repetir sobre una categoría ya activa → 409 sin escrituras (US4-7, FR-012)", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, true));

        const { status, cuerpo } = await cambiarEstado(3, "activar");

        expect(status).toBe(409);
        expect(cuerpo).toEqual({ success: false, message: "La categoría ya se encuentra activa", data: null });
        expect(prismaFake.control.escrituras).toEqual([]);
    });
});

describe.each(["activar", "desactivar"] as const)("PATCH /api/categorias/:id/%s — reglas comunes", (accion) => {
    it.each([
        ["inexistente", 99],
        ["de otro usuario", 5],
    ])("categoría %s → 404 sin revelar datos ni escribir", async (_caso, id) => {
        prismaFake.control.datos.categorias.push(categoria(5, accion === "activar" ? false : true, OTRO_USUARIO));

        const { status, cuerpo } = await cambiarEstado(id, accion);

        expect(status).toBe(404);
        expect(cuerpo).toEqual({ success: false, message: "La categoría indicada no existe", data: null });
        expect(prismaFake.control.escrituras).toEqual([]);
    });

    it.each(["abc", "0", "duplicados"])("id %j → 400", async (id) => {
        const { status, cuerpo } = await cambiarEstado(id, accion);

        expect(status).toBe(400);
        expect(cuerpo).toEqual({ success: false, message: "El id de la categoría es inválido", data: null });
    });

    it("lee y escribe dentro de una transacción con el aislamiento por omisión", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, accion === "activar" ? false : true));

        await cambiarEstado(3, accion);

        expect(prismaFake.control.transacciones).toEqual([undefined]);
        const metodos = prismaFake.control.llamadas.map((l) => `${l.modelo}.${l.metodo}`);
        expect(metodos).toEqual(["$transaction.$transaction", "categoria.findUnique", "categoria.update"]);
    });

    it("la ruta fija no llega a updateCategoria (no se pide Serializable ni se edita otro campo)", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, accion === "activar" ? false : true));

        const { status } = await cambiarEstado(3, accion);

        expect(status).toBe(200);
        expect(prismaFake.control.escrituras).toEqual([
            { modelo: "categoria", metodo: "update", data: { CATActiva: accion === "activar" } },
        ]);
    });

    // Error de transacción SIMULADO: no prueba los tiempos reales de PostgreSQL.
    it("P2028 simulado → 500 genérico", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, accion === "activar" ? false : true));
        prismaFake.control.programarFallosTransaccion("P2028");
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        const { status, cuerpo } = await cambiarEstado(3, accion);

        expect(status).toBe(500);
        expect(cuerpo).toEqual({
            success: false,
            message: accion === "activar" ? "Error al activar la categoría" : "Error al desactivar la categoría",
            data: null,
        });
        expect(prismaFake.control.transacciones).toHaveLength(1);
    });
});
