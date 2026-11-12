// api/tests/http/movimientos.http.test.ts
// US5 — Compatibilidad e integración con Movimientos (T051). Contrato: specs/001-gestion-categorias/contracts/movimientos.md
// Prisma se sustituye por el doble en memoria; ninguna prueba toca una base de datos. Los errores de
// transacción son SIMULADOS: no prueban aislamiento, tiempos ni concurrencia reales de PostgreSQL.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
    prismaFake,
    type CategoriaFake,
    type CuentaFake,
    type MovimientoFake,
} from "../support/prisma-fake";
import { iniciarServidorDePrueba, type ServidorDePrueba } from "../support/servidor-prueba";

vi.mock("../../src/lib/prisma", async () => {
    const { prismaFake: doble } = await import("../support/prisma-fake");
    return { prisma: doble, OPCIONES_TRANSACCION: { maxWait: 5000, timeout: 10000 } };
});

const USUARIO_ACTUAL = 1; // CURRENT_USER_ID de tests/setup.ts
const OTRO_USUARIO = 2;

function cuenta(CUEId: number, CUEActiva = true, USUId = USUARIO_ACTUAL): CuentaFake {
    return { CUEId, CUENombre: `Cuenta ${CUEId}`, CUEActiva, USUId };
}

function categoria(CATId: number, CATTipo: string, CATActiva = true, USUId = USUARIO_ACTUAL): CategoriaFake {
    return {
        CATId,
        CATNombre: `Categoría ${CATId}`,
        CATTipo,
        CATColor: null,
        CATIcono: null,
        CATActiva,
        CATCreadoEn: new Date("2026-01-10T15:00:00.000Z"),
        USUId,
    };
}

function movimiento(
    MOVId: number,
    MOVTipo: string,
    CATId: number | null,
    extra: Partial<MovimientoFake> = {},
): MovimientoFake {
    return {
        MOVId,
        MOVTipo,
        MOVMonto: "80.00",
        MOVDescripcion: "Cena",
        MOVFecha: new Date("2026-10-01T00:00:00.000Z"),
        MOVActiva: true,
        MOVCreadoEn: new Date("2026-10-01T00:00:00.000Z"),
        USUId: USUARIO_ACTUAL,
        CUEId: 1,
        CATId,
        ...extra,
    };
}

let servidor: ServidorDePrueba;

async function peticion(metodo: "POST" | "PATCH", ruta: string, cuerpo?: unknown) {
    const respuesta = await fetch(`${servidor.baseUrl}/api/movimientos${ruta}`, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    return { status: respuesta.status, cuerpo: await respuesta.json() };
}

const crear = (cuerpo: unknown) => peticion("POST", "", cuerpo);
const editar = (id: number | string, cuerpo: unknown) => peticion("PATCH", `/${id}`, cuerpo);
const desactivar = (id: number | string) => peticion("PATCH", `/${id}/desactivar`);

function escrituras() {
    return prismaFake.control.escrituras;
}

function rechazo(message: string) {
    return { success: false, message, data: null };
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
    control.datos.cuentas.length = 0;
    control.datos.categorias.length = 0;
    control.datos.movimientos.length = 0;
    control.llamadas.length = 0;
    control.escrituras.length = 0;
    control.transacciones.length = 0;
    control.programarFallosTransaccion();

    control.datos.cuentas.push(cuenta(1), cuenta(2, false), cuenta(9, true, OTRO_USUARIO));
    control.datos.categorias.push(
        categoria(3, "gasto"),
        categoria(4, "ingreso"),
        categoria(6, " Gasto "), // tipo histórico con espacios y mayúscula: corresponde a GASTO
        categoria(7, "gasto", false),
        categoria(8, "gasto", false),
        categoria(5, "gasto", true, OTRO_USUARIO),
    );
});

// ---------------------------------------------------------------------------------------------
describe("POST /api/movimientos", () => {
    const base = { CUEId: 1, MOVTipo: "GASTO", MOVMonto: 150.5, MOVFecha: "2026-11-12" };

    it("sin USUId → 201 con el usuario configurado (FR-024)", async () => {
        const { status, cuerpo } = await crear({ ...base, CATId: 3, MOVDescripcion: "Súper" });

        expect(status).toBe(201);
        expect(cuerpo.message).toBe("Movimiento creado correctamente");
        expect(cuerpo.data).toMatchObject({ USUId: USUARIO_ACTUAL, CUEId: 1, CATId: 3, MOVTipo: "GASTO" });
        expect(escrituras()).toHaveLength(1);
        expect(escrituras()[0]).toMatchObject({ modelo: "movimiento", metodo: "create" });
        expect(escrituras()[0].data.USUId).toBe(USUARIO_ACTUAL);
        expect(prismaFake.control.transacciones).toEqual([undefined]);
    });

    it("USUId igual al configurado → 201 (compatibilidad de transición)", async () => {
        const { status, cuerpo } = await crear({ ...base, USUId: USUARIO_ACTUAL });

        expect(status).toBe(201);
        expect(cuerpo.data.USUId).toBe(USUARIO_ACTUAL);
    });

    it.each([[OTRO_USUARIO], [0], ["1"], [null]])("USUId %j distinto → 400 sin escrituras (D2)", async (USUId) => {
        const { status, cuerpo } = await crear({ ...base, USUId });

        expect(status).toBe(400);
        expect(cuerpo).toEqual(rechazo("USUId no corresponde al usuario actual del servidor"));
        expect(escrituras()).toEqual([]);
    });

    it("ya no consulta el usuario del cuerpo (se verifica al arrancar)", async () => {
        await crear(base);

        expect(prismaFake.control.llamadas.some((l) => l.modelo === "usuario")).toBe(false);
    });

    it("categoría de otro tipo → 400 (US5-3, FR-021)", async () => {
        const { status, cuerpo } = await crear({ ...base, MOVTipo: "INGRESO", CATId: 3 });

        expect(status).toBe(400);
        expect(cuerpo).toEqual(rechazo("La categoría no corresponde al tipo del movimiento"));
        expect(escrituras()).toEqual([]);
    });

    it("tipo de categoría con espacios y mayúsculas corresponde sin distinguir mayúsculas", async () => {
        const { status } = await crear({ ...base, CATId: 6 });

        expect(status).toBe(201);
    });

    it("categoría de otro usuario → 404 (US5-7)", async () => {
        const { status, cuerpo } = await crear({ ...base, CATId: 5 });

        expect(status).toBe(404);
        expect(cuerpo).toEqual(rechazo("La categoría indicada no existe"));
        expect(escrituras()).toEqual([]);
    });

    it("categoría inexistente → 404", async () => {
        const { status, cuerpo } = await crear({ ...base, CATId: 99 });

        expect(status).toBe(404);
        expect(cuerpo).toEqual(rechazo("La categoría indicada no existe"));
    });

    it("categoría inactiva → 409 (FR-009, US4-4)", async () => {
        const { status, cuerpo } = await crear({ ...base, CATId: 7 });

        expect(status).toBe(409);
        expect(cuerpo).toEqual(rechazo("La categoría indicada está inactiva"));
        expect(escrituras()).toEqual([]);
    });

    it("cuenta de otro usuario → 404 (US5-7)", async () => {
        const { status, cuerpo } = await crear({ ...base, CUEId: 9 });

        expect(status).toBe(404);
        expect(cuerpo).toEqual(rechazo("La cuenta indicada no existe"));
        expect(escrituras()).toEqual([]);
    });

    it("cuenta inactiva → 409 (sin cambios)", async () => {
        const { status, cuerpo } = await crear({ ...base, CUEId: 2 });

        expect(status).toBe(409);
        expect(cuerpo).toEqual(rechazo("La cuenta indicada está inactiva"));
    });

    it("sin categoría → 201 con CATId null (regresión)", async () => {
        const { status, cuerpo } = await crear(base);

        expect(status).toBe(201);
        expect(cuerpo.data.CATId).toBeNull();
    });

    it.each([
        [{ CUEId: "1" }, "CUEId es requerido y debe ser un número entero positivo"],
        [{ MOVTipo: "OTRO" }, "MOVTipo debe ser uno de: INGRESO, GASTO, AHORRO"],
        [{ MOVMonto: 0 }, "MOVMonto debe ser un número mayor a 0"],
        [{ MOVFecha: "no-es-fecha" }, "MOVFecha debe ser una fecha ISO válida"],
    ])("validación de formato %j → 400 como antes (regresión)", async (cambio, mensaje) => {
        const { status, cuerpo } = await crear({ ...base, ...cambio });

        expect(status).toBe(400);
        expect(cuerpo).toEqual(rechazo(mensaje));
        expect(prismaFake.control.transacciones).toEqual([]);
    });

    it("P2028 simulado → 500 genérico sin reintento", async () => {
        prismaFake.control.programarFallosTransaccion("P2028");
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        const { status, cuerpo } = await crear(base);

        expect(status).toBe(500);
        expect(cuerpo).toEqual(rechazo("Error al crear el movimiento"));
        expect(prismaFake.control.transacciones).toHaveLength(1);
        expect(escrituras()).toEqual([]);
    });
});

// ---------------------------------------------------------------------------------------------
describe("PATCH /api/movimientos/:id", () => {
    // Reenvío completo como lo hace MovementsTable.
    function reenvio(m: MovimientoFake, cambios: Record<string, unknown> = {}) {
        return {
            CUEId: m.CUEId,
            CATId: m.CATId,
            MOVTipo: m.MOVTipo,
            MOVMonto: Number(m.MOVMonto),
            MOVDescripcion: m.MOVDescripcion,
            MOVFecha: m.MOVFecha.toISOString().slice(0, 10),
            ...cambios,
        };
    }

    function ultimaEscritura() {
        const lista = escrituras();
        return lista[lista.length - 1];
    }

    it("conserva una categoría inactiva reenviando todo → 200 sin CATId ni CUEId en el update (US5-4, C1)", async () => {
        const m = movimiento(10, "GASTO", 7);
        prismaFake.control.datos.movimientos.push(m);

        const { status, cuerpo } = await editar(10, reenvio(m, { MOVDescripcion: "Cena familiar" }));

        expect(status).toBe(200);
        expect(cuerpo.message).toBe("Movimiento actualizado correctamente");
        expect(cuerpo.data).toMatchObject({ MOVId: 10, CATId: 7, MOVDescripcion: "Cena familiar" });
        expect(escrituras()).toEqual([
            { modelo: "movimiento", metodo: "update", data: { MOVDescripcion: "Cena familiar" } },
        ]);
        // La categoría histórica no se consulta ni se revalida.
        expect(prismaFake.control.llamadas.some((l) => l.modelo === "categoria")).toBe(false);
        expect(prismaFake.control.transacciones).toEqual([undefined]);
    });

    it("asignar otra categoría inactiva → 409 sin escrituras (US5-5, FR-022)", async () => {
        const m = movimiento(10, "GASTO", 7);
        prismaFake.control.datos.movimientos.push(m);

        const { status, cuerpo } = await editar(10, reenvio(m, { CATId: 8 }));

        expect(status).toBe(409);
        expect(cuerpo).toEqual(rechazo("La categoría indicada está inactiva"));
        expect(escrituras()).toEqual([]);
    });

    it("quitar la categoría → 200 con CATId null (US5-6)", async () => {
        const m = movimiento(10, "GASTO", 7);
        prismaFake.control.datos.movimientos.push(m);

        const { status, cuerpo } = await editar(10, reenvio(m, { CATId: null }));

        expect(status).toBe(200);
        expect(cuerpo.data.CATId).toBeNull();
        expect(ultimaEscritura().data).toEqual({ CATId: null });
    });

    it("movimiento sin categoría sigue sin categoría → 200 sin CATId en el update (US5-6)", async () => {
        const m = movimiento(12, "GASTO", null);
        prismaFake.control.datos.movimientos.push(m);

        const { status } = await editar(12, reenvio(m, { MOVMonto: 95 }));

        expect(status).toBe(200);
        expect(ultimaEscritura().data).toEqual({ MOVMonto: 95 });
    });

    it("histórico con categoría que no corresponde, sin cambiar tipo ni categoría → 200 sin corregir (US5-8)", async () => {
        const m = movimiento(11, "INGRESO", 3); // categoría 3 es de gasto
        prismaFake.control.datos.movimientos.push(m);

        const { status, cuerpo } = await editar(11, reenvio(m, { MOVDescripcion: "Reembolso" }));

        expect(status).toBe(200);
        expect(cuerpo.data).toMatchObject({ MOVTipo: "INGRESO", CATId: 3 });
        expect(ultimaEscritura().data).toEqual({ MOVDescripcion: "Reembolso" });
    });

    it("cambiar solo el tipo manteniendo una categoría inactiva → 409 (FR-026)", async () => {
        const m = movimiento(10, "GASTO", 7);
        prismaFake.control.datos.movimientos.push(m);

        const { status, cuerpo } = await editar(10, reenvio(m, { MOVTipo: "AHORRO" }));

        expect(status).toBe(409);
        expect(cuerpo).toEqual(rechazo("La categoría indicada está inactiva"));
        expect(escrituras()).toEqual([]);
    });

    it("cambiar solo el tipo y la categoría actual deja de corresponder → 400", async () => {
        const m = movimiento(10, "GASTO", 3);
        prismaFake.control.datos.movimientos.push(m);

        const { status, cuerpo } = await editar(10, reenvio(m, { MOVTipo: "INGRESO" }));

        expect(status).toBe(400);
        expect(cuerpo).toEqual(rechazo("La categoría no corresponde al tipo del movimiento"));
        expect(escrituras()).toEqual([]);
    });

    it("cambiar a una categoría que no corresponde → 400 (US5-9)", async () => {
        const m = movimiento(10, "GASTO", 3);
        prismaFake.control.datos.movimientos.push(m);

        const { status, cuerpo } = await editar(10, reenvio(m, { CATId: 4 }));

        expect(status).toBe(400);
        expect(cuerpo).toEqual(rechazo("La categoría no corresponde al tipo del movimiento"));
        expect(escrituras()).toEqual([]);
    });

    it("cambiar tipo y categoría juntos de forma coherente → 200 con ambos en el update", async () => {
        const m = movimiento(10, "GASTO", 3);
        prismaFake.control.datos.movimientos.push(m);

        const { status } = await editar(10, reenvio(m, { MOVTipo: "INGRESO", CATId: 4 }));

        expect(status).toBe(200);
        expect(ultimaEscritura().data).toEqual({ MOVTipo: "INGRESO", CATId: 4 });
    });

    it("cambiar a una categoría de otro usuario → 404 (US5-9)", async () => {
        const m = movimiento(10, "GASTO", 3);
        prismaFake.control.datos.movimientos.push(m);

        const { status, cuerpo } = await editar(10, reenvio(m, { CATId: 5 }));

        expect(status).toBe(404);
        expect(cuerpo).toEqual(rechazo("La categoría indicada no existe"));
        expect(escrituras()).toEqual([]);
    });

    it("cambiar a una cuenta de otro usuario → 404 (US5-9)", async () => {
        const m = movimiento(10, "GASTO", 3);
        prismaFake.control.datos.movimientos.push(m);

        const { status, cuerpo } = await editar(10, reenvio(m, { CUEId: 9 }));

        expect(status).toBe(404);
        expect(cuerpo).toEqual(rechazo("La cuenta indicada no existe"));
        expect(escrituras()).toEqual([]);
    });

    it("cambiar a otra cuenta propia activa → 200 con CUEId en el update", async () => {
        prismaFake.control.datos.cuentas.push(cuenta(3));
        const m = movimiento(10, "GASTO", 3);
        prismaFake.control.datos.movimientos.push(m);

        const { status } = await editar(10, reenvio(m, { CUEId: 3 }));

        expect(status).toBe(200);
        expect(ultimaEscritura().data).toEqual({ CUEId: 3 });
    });

    it("reenviar la misma cuenta inactiva → 409 como antes (riesgo residual R-7)", async () => {
        const m = movimiento(10, "GASTO", 3, { CUEId: 2 });
        prismaFake.control.datos.movimientos.push(m);

        const { status, cuerpo } = await editar(10, reenvio(m, { MOVMonto: 90 }));

        expect(status).toBe(409);
        expect(cuerpo).toEqual(rechazo("La cuenta indicada está inactiva"));
        expect(escrituras()).toEqual([]);
    });

    it.each([
        ["de otro usuario", 20],
        ["inexistente", 99],
    ])("movimiento %s → 404 sin escrituras (US5-10)", async (_caso, id) => {
        prismaFake.control.datos.movimientos.push(movimiento(20, "GASTO", 5, { USUId: OTRO_USUARIO, CUEId: 9 }));

        const { status, cuerpo } = await editar(id, { MOVDescripcion: "Intento" });

        expect(status).toBe(404);
        expect(cuerpo).toEqual(rechazo("El movimiento indicado no existe"));
        expect(escrituras()).toEqual([]);
    });

    it("movimiento desactivado → 409 como antes", async () => {
        prismaFake.control.datos.movimientos.push(movimiento(13, "GASTO", 3, { MOVActiva: false }));

        const { status, cuerpo } = await editar(13, { MOVDescripcion: "Otra" });

        expect(status).toBe(409);
        expect(cuerpo).toEqual(rechazo("El movimiento indicado está desactivado"));
    });

    it("USUId en el cuerpo se ignora", async () => {
        const m = movimiento(10, "GASTO", 3);
        prismaFake.control.datos.movimientos.push(m);

        const { status, cuerpo } = await editar(10, reenvio(m, { USUId: OTRO_USUARIO, MOVMonto: 70 }));

        expect(status).toBe(200);
        expect(cuerpo.data.USUId).toBe(USUARIO_ACTUAL);
        expect(ultimaEscritura().data).toEqual({ MOVMonto: 70 });
    });

    it("reenviar todo sin cambios → 200 sin escribir", async () => {
        const m = movimiento(10, "GASTO", 7);
        prismaFake.control.datos.movimientos.push(m);

        const { status, cuerpo } = await editar(10, reenvio(m));

        expect(status).toBe(200);
        expect(cuerpo.data).toMatchObject({ MOVId: 10, CATId: 7 });
        expect(escrituras()).toEqual([]);
    });

    it("regresión: edición válida de monto, fecha y descripción → 200 con relaciones (SC-006)", async () => {
        const m = movimiento(10, "GASTO", 3);
        prismaFake.control.datos.movimientos.push(m);

        const { status, cuerpo } = await editar(10, { MOVMonto: 120.25, MOVFecha: "2026-10-05", MOVDescripcion: null });

        expect(status).toBe(200);
        expect(cuerpo.data).toMatchObject({ MOVMonto: "120.25", MOVDescripcion: null });
        expect(cuerpo.data.cuenta).toMatchObject({ CUEId: 1 });
        expect(cuerpo.data.categoria).toMatchObject({ CATId: 3 });
        expect(ultimaEscritura().data).toEqual({
            MOVMonto: 120.25,
            MOVFecha: new Date("2026-10-05"),
            MOVDescripcion: null,
        });
    });

    it.each([
        [{ MOVMonto: -1 }, "MOVMonto debe ser un número mayor a 0"],
        [{ CATId: "3" }, "CATId debe ser un número entero positivo o null"],
    ])("validación de formato %j → 400 como antes", async (cambio, mensaje) => {
        prismaFake.control.datos.movimientos.push(movimiento(10, "GASTO", 3));

        const { status, cuerpo } = await editar(10, cambio);

        expect(status).toBe(400);
        expect(cuerpo).toEqual(rechazo(mensaje));
    });

    it("id inválido → 400", async () => {
        const { status, cuerpo } = await editar("abc", {});

        expect(status).toBe(400);
        expect(cuerpo).toEqual(rechazo("El id del movimiento es inválido"));
    });

    it("P2028 simulado → 500 genérico sin reintento", async () => {
        prismaFake.control.datos.movimientos.push(movimiento(10, "GASTO", 3));
        prismaFake.control.programarFallosTransaccion("P2028");
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        const { status, cuerpo } = await editar(10, { MOVDescripcion: "Otra" });

        expect(status).toBe(500);
        expect(cuerpo).toEqual(rechazo("Error al actualizar el movimiento"));
        expect(prismaFake.control.transacciones).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------------------------
describe("PATCH /api/movimientos/:id/desactivar", () => {
    it("movimiento propio → 200 sin cambios de contrato (regresión)", async () => {
        prismaFake.control.datos.movimientos.push(movimiento(10, "GASTO", 7));

        const { status, cuerpo } = await desactivar(10);

        expect(status).toBe(200);
        expect(cuerpo.message).toBe("Movimiento desactivado correctamente");
        expect(cuerpo.data).toMatchObject({ MOVId: 10, MOVActiva: false });
        expect(escrituras()).toEqual([{ modelo: "movimiento", metodo: "update", data: { MOVActiva: false } }]);
        expect(prismaFake.control.transacciones).toEqual([undefined]);
        const metodos = prismaFake.control.llamadas.map((l) => `${l.modelo}.${l.metodo}`);
        expect(metodos).toEqual(["$transaction.$transaction", "movimiento.findUnique", "movimiento.update"]);
    });

    it("ya desactivado → 409", async () => {
        prismaFake.control.datos.movimientos.push(movimiento(13, "GASTO", 3, { MOVActiva: false }));

        const { status, cuerpo } = await desactivar(13);

        expect(status).toBe(409);
        expect(cuerpo).toEqual(rechazo("El movimiento ya se encuentra desactivado"));
        expect(escrituras()).toEqual([]);
    });

    it.each([
        ["de otro usuario", 20],
        ["inexistente", 99],
    ])("movimiento %s → 404 sin escrituras (US5-11)", async (_caso, id) => {
        prismaFake.control.datos.movimientos.push(movimiento(20, "GASTO", 5, { USUId: OTRO_USUARIO, CUEId: 9 }));

        const { status, cuerpo } = await desactivar(id);

        expect(status).toBe(404);
        expect(cuerpo).toEqual(rechazo("El movimiento indicado no existe"));
        expect(escrituras()).toEqual([]);
        expect(prismaFake.control.datos.movimientos.find((m) => m.MOVId === 20)?.MOVActiva).toBe(true);
    });

    it("id inválido → 400", async () => {
        const { status, cuerpo } = await desactivar("0");

        expect(status).toBe(400);
        expect(cuerpo).toEqual(rechazo("El id del movimiento es inválido"));
    });

    it("P2028 simulado → 500 genérico sin reintento", async () => {
        prismaFake.control.datos.movimientos.push(movimiento(10, "GASTO", 3));
        prismaFake.control.programarFallosTransaccion("P2028");
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        const { status, cuerpo } = await desactivar(10);

        expect(status).toBe(500);
        expect(cuerpo).toEqual(rechazo("Error al desactivar el movimiento"));
        expect(prismaFake.control.transacciones).toHaveLength(1);
        expect(escrituras()).toEqual([]);
    });
});
