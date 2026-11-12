// api/tests/http/categorias.edicion.test.ts
// US3 — Editar una categoría (T038). Contrato: specs/001-gestion-categorias/contracts/categorias.md
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
const MENSAJE_ID_INVALIDO = "El id de la categoría es inválido";
const MENSAJE_NO_EXISTE = "La categoría indicada no existe";
const MENSAJE_CON_MOVIMIENTOS = "No se puede cambiar el tipo: la categoría tiene movimientos asociados";

function categoria(
    CATId: number,
    CATNombre: string,
    CATTipo: string,
    extra: Partial<CategoriaFake> = {},
): CategoriaFake {
    return {
        CATId,
        CATNombre,
        CATTipo,
        CATColor: null,
        CATIcono: null,
        CATActiva: true,
        CATCreadoEn: new Date("2026-01-10T15:00:00.000Z"),
        USUId: USUARIO_ACTUAL,
        ...extra,
    };
}

function movimiento(MOVId: number, CATId: number, MOVActiva = true): MovimientoFake {
    return {
        MOVId,
        MOVTipo: "GASTO",
        MOVMonto: "80.00",
        MOVDescripcion: "Cena",
        MOVFecha: new Date("2026-10-01T00:00:00.000Z"),
        MOVActiva,
        MOVCreadoEn: new Date("2026-10-01T00:00:00.000Z"),
        USUId: USUARIO_ACTUAL,
        CUEId: 1,
        CATId,
    };
}

let servidor: ServidorDePrueba;

async function editar(id: number | string, body: unknown) {
    const respuesta = await fetch(`${servidor.baseUrl}/api/categorias/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
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

describe("PATCH /api/categorias/:id — edición válida", () => {
    it("guarda nombre, color e ícono con un mensaje de confirmación (US3-1)", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"));

        const { status, cuerpo } = await editar(3, {
            CATNombre: "  Comida y bebida ",
            CATColor: "#22c55e",
            CATIcono: "utensils",
        });

        expect(status).toBe(200);
        expect(cuerpo.success).toBe(true);
        expect(cuerpo.message).toBe("Categoría actualizada correctamente");
        expect(cuerpo.data).toMatchObject({
            CATId: 3,
            CATNombre: "Comida y bebida",
            CATTipo: "gasto",
            CATColor: "#22c55e",
            CATIcono: "utensils",
            CATActiva: true,
        });
    });

    it("cambiar el nombre no modifica ningún movimiento (US3-2)", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"));
        prismaFake.control.datos.movimientos.push(movimiento(1, 3));
        const antes = JSON.stringify(prismaFake.control.datos.movimientos);

        const { status } = await editar(3, { CATNombre: "Alimentación" });

        expect(status).toBe(200);
        expect(JSON.stringify(prismaFake.control.datos.movimientos)).toBe(antes);
        expect(prismaFake.control.escrituras.every((e) => e.modelo === "categoria")).toBe(true);
    });

    it("cambiar solo mayúsculas del propio nombre no es duplicado de sí misma", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "comida", "gasto"));

        const { status, cuerpo } = await editar(3, { CATNombre: "Comida" });

        expect(status).toBe(200);
        expect(cuerpo.data.CATNombre).toBe("Comida");
    });

    it("permite cambiar el tipo si la categoría no tiene movimientos (US3-8)", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Bono", "ingreso"));

        const { status, cuerpo } = await editar(3, { CATTipo: "ahorro" });

        expect(status).toBe(200);
        expect(cuerpo.data.CATTipo).toBe("ahorro");
    });

    it("ignora CATActiva, USUId y CATCreadoEn del cuerpo", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"));

        const { status, cuerpo } = await editar(3, {
            CATColor: "#22c55e",
            CATActiva: false,
            USUId: OTRO_USUARIO,
            CATCreadoEn: "2020-01-01T00:00:00.000Z",
        });

        expect(status).toBe(200);
        expect(cuerpo.data).toMatchObject({ CATActiva: true, USUId: USUARIO_ACTUAL });
        expect(prismaFake.control.escrituras).toEqual([
            { modelo: "categoria", metodo: "update", data: { CATColor: "#22c55e" } },
        ]);
    });

    it("sin cambios efectivos responde 200 y no escribe", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto", { CATColor: "#ef4444" }));

        const { status, cuerpo } = await editar(3, { CATNombre: " Comida ", CATTipo: "gasto", CATColor: "#ef4444" });

        expect(status).toBe(200);
        expect(cuerpo.message).toBe("Categoría actualizada correctamente");
        expect(prismaFake.control.escrituras).toEqual([]);
    });
});

describe("PATCH /api/categorias/:id — validación y rechazos", () => {
    it.each([
        [{ CATNombre: "   " }, "CATNombre es requerido y debe tener como máximo 50 caracteres"],
        [{ CATNombre: "a".repeat(51) }, "CATNombre es requerido y debe tener como máximo 50 caracteres"],
        [{ CATTipo: "transferencia" }, "CATTipo debe ser uno de: ingreso, gasto, ahorro"],
        [{ CATColor: "verde" }, "CATColor debe tener el formato #RRGGBB"],
        [{ CATIcono: "a".repeat(51) }, "CATIcono debe ser texto de hasta 50 caracteres"],
    ])("campo inválido que cambia %j → 400 sin escribir (US3-3)", async (body, mensaje) => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"));

        const { status, cuerpo } = await editar(3, body);

        expect(status).toBe(400);
        expect(cuerpo).toEqual({ success: false, message: mensaje, data: null });
        expect(prismaFake.control.escrituras).toEqual([]);
    });

    it("rechaza un nombre que ya usa otra categoría del mismo tipo (US3-4)", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"), categoria(4, "Transporte", "gasto"));

        const { status, cuerpo } = await editar(4, { CATNombre: " comida " });

        expect(status).toBe(409);
        expect(cuerpo).toEqual({ success: false, message: 'Ya existe la categoría "Comida" de tipo gasto', data: null });
        expect(guardada(4)?.CATNombre).toBe("Transporte");
    });

    it("rechaza un duplicado inactivo sugiriendo reactivarla", async () => {
        prismaFake.control.datos.categorias.push(
            categoria(3, "Comida", "gasto", { CATActiva: false }),
            categoria(4, "Transporte", "gasto"),
        );

        const { status, cuerpo } = await editar(4, { CATNombre: "Comida" });

        expect(status).toBe(409);
        expect(cuerpo.message).toBe('Ya existe la categoría "Comida" de tipo gasto (inactiva); puedes reactivarla');
    });

    it.each([
        ["inexistente", 99],
        ["de otro usuario", 5],
    ])("categoría %s → 404 sin revelar datos ni escribir (US3-6)", async (_caso, id) => {
        prismaFake.control.datos.categorias.push(categoria(5, "Ajena", "gasto", { USUId: OTRO_USUARIO }));

        const { status, cuerpo } = await editar(id, { CATNombre: "Robada" });

        expect(status).toBe(404);
        expect(cuerpo).toEqual({ success: false, message: MENSAJE_NO_EXISTE, data: null });
        expect(prismaFake.control.escrituras).toEqual([]);
        expect(guardada(5)?.CATNombre).toBe("Ajena");
    });

    it.each([
        ["activo", true],
        ["desactivado", false],
    ])("no permite cambiar el tipo con un movimiento %s asociado (US3-7)", async (_caso, activa) => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"));
        prismaFake.control.datos.movimientos.push(movimiento(1, 3, activa));

        const { status, cuerpo } = await editar(3, { CATTipo: "ingreso" });

        expect(status).toBe(409);
        expect(cuerpo).toEqual({ success: false, message: MENSAJE_CON_MOVIMIENTOS, data: null });
        expect(guardada(3)?.CATTipo).toBe("gasto");
        expect(prismaFake.control.escrituras).toEqual([]);
    });

    it.each(["abc", "0", "-1", "1.5", "duplicados"])("id %j → 400", async (id) => {
        const { status, cuerpo } = await editar(id, { CATNombre: "Comida" });

        expect(status).toBe(400);
        expect(cuerpo).toEqual({ success: false, message: MENSAJE_ID_INVALIDO, data: null });
    });
});

describe("PATCH /api/categorias/:id — datos históricos (FR-026)", () => {
    it("duplicado histórico: cambiar solo el color se guarda sin consultar unicidad (US3-9)", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"), categoria(9, "comida ", "gasto"));

        const { status } = await editar(9, { CATColor: "#22c55e" });

        expect(status).toBe(200);
        expect(guardada(9)?.CATColor).toBe("#22c55e");
        expect(guardada(3)).toMatchObject({ CATNombre: "Comida", CATColor: null });
        expect(prismaFake.control.llamadas.some((l) => l.metodo === "findMany")).toBe(false);
    });

    it("duplicado histórico: un nombre que sigue duplicando → 409; uno que deja de duplicar → 200 (US3-10)", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"), categoria(9, "comida ", "gasto"));

        const sigue = await editar(9, { CATNombre: "COMIDA" });
        expect(sigue.status).toBe(409);
        expect(guardada(9)?.CATNombre).toBe("comida ");

        const deja = await editar(9, { CATNombre: "Comida rápida" });
        expect(deja.status).toBe(200);
        expect(guardada(9)?.CATNombre).toBe("Comida rápida");
    });

    it("CATTipo histórico inválido: editar el nombre conserva el tipo (US3-11)", async () => {
        prismaFake.control.datos.categorias.push(categoria(7, "Préstamo", "transferencia"));

        const { status, cuerpo } = await editar(7, { CATNombre: "Préstamo familiar" });

        expect(status).toBe(200);
        expect(cuerpo.data.CATTipo).toBe("transferencia");
    });

    it("CATTipo histórico inválido: cambiarlo a otro valor inválido → 400 (US3-11)", async () => {
        prismaFake.control.datos.categorias.push(categoria(7, "Préstamo", "transferencia"));

        const { status, cuerpo } = await editar(7, { CATTipo: "otro" });

        expect(status).toBe(400);
        expect(cuerpo.message).toBe("CATTipo debe ser uno de: ingreso, gasto, ahorro");
    });

    it("reenviar nombre y tipo iguales y cambiar el color solo escribe el color, sin unicidad ni Serializable (US3-12)", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"), categoria(9, "comida ", "gasto"));

        const { status } = await editar(3, { CATNombre: "  Comida  ", CATTipo: "gasto", CATColor: "#22c55e" });

        expect(status).toBe(200);
        expect(prismaFake.control.escrituras).toEqual([
            { modelo: "categoria", metodo: "update", data: { CATColor: "#22c55e" } },
        ]);
        expect(prismaFake.control.llamadas.some((l) => l.metodo === "findMany")).toBe(false);
        expect(prismaFake.control.transacciones).toEqual([undefined]);
    });

    // D-1 (T072): reenviar EXACTAMENTE el nombre guardado, aunque tenga espacios históricos, no es
    // un cambio: no se valida, no se consulta la unicidad y no se escribe CATNombre.
    it("D-1: reenviar el nombre histórico con espacio final idéntico y cambiar el color → 200 sin escribir CATNombre", async () => {
        prismaFake.control.datos.categorias.push(categoria(2, "Comida", "gasto"), categoria(3, "comida ", "gasto"));

        const { status, cuerpo } = await editar(3, { CATNombre: "comida ", CATTipo: "gasto", CATColor: "#16a34a" });

        expect(status).toBe(200);
        expect(cuerpo.data).toMatchObject({ CATId: 3, CATNombre: "comida ", CATColor: "#16a34a" });
        expect(prismaFake.control.escrituras).toEqual([
            { modelo: "categoria", metodo: "update", data: { CATColor: "#16a34a" } },
        ]);
        expect(guardada(3)?.CATNombre).toBe("comida ");
        expect(guardada(2)).toMatchObject({ CATNombre: "Comida", CATColor: null });
        expect(prismaFake.control.llamadas.some((l) => l.metodo === "findMany")).toBe(false);
        expect(prismaFake.control.transacciones).toEqual([undefined]);
    });

    it("D-1: un cambio real del nombre histórico sigue aplicando unicidad y validación", async () => {
        prismaFake.control.datos.categorias.push(categoria(2, "Comida", "gasto"), categoria(3, "comida ", "gasto"));

        const recortado = await editar(3, { CATNombre: "comida", CATColor: "#16a34a" });
        expect(recortado.status).toBe(409);
        expect(recortado.cuerpo.message).toBe('Ya existe la categoría "Comida" de tipo gasto');

        const vacio = await editar(3, { CATNombre: "   " });
        expect(vacio.status).toBe(400);
        expect(vacio.cuerpo.message).toBe("CATNombre es requerido y debe tener como máximo 50 caracteres");

        expect(prismaFake.control.escrituras).toEqual([]);
        expect(guardada(3)).toMatchObject({ CATNombre: "comida ", CATColor: null });
    });

    it("D-1: un color histórico reenviado idéntico no se revalida ni se reescribe", async () => {
        prismaFake.control.datos.categorias.push(categoria(4, "Ocio", "gasto", { CATColor: " #ABC" }));

        const { status } = await editar(4, { CATNombre: "Ocio", CATColor: " #ABC", CATIcono: "gamepad" });

        expect(status).toBe(200);
        expect(prismaFake.control.escrituras).toEqual([
            { modelo: "categoria", metodo: "update", data: { CATIcono: "gamepad" } },
        ]);
        expect(guardada(4)?.CATColor).toBe(" #ABC");
    });

    it("un nombre histórico de más de 50 caracteres que no cambia no se revalida", async () => {
        const largo = "Nombre histórico ".repeat(4).trim();
        prismaFake.control.datos.categorias.push(categoria(3, largo, "gasto"));

        const { status } = await editar(3, { CATNombre: largo, CATIcono: "tag" });

        expect(status).toBe(200);
        expect(guardada(3)?.CATIcono).toBe("tag");
    });
});

// Manejo de errores de transacción SIMULADOS con el doble de Prisma.
// Verifica la lógica del controlador; NO prueba la concurrencia, el aislamiento ni los tiempos
// reales de PostgreSQL (caso manual M7 en base aislada).
describe("PATCH /api/categorias/:id — transacciones simuladas", () => {
    it("pide Serializable cuando cambia el nombre o el tipo", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"));

        await editar(3, { CATNombre: "Alimentación" });

        expect(prismaFake.control.transacciones).toEqual([{ isolationLevel: "Serializable" }]);
    });

    it("P2034 una vez → reintenta y guarda", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"));
        prismaFake.control.programarFallosTransaccion("P2034");

        const { status } = await editar(3, { CATNombre: "Alimentación" });

        expect(status).toBe(200);
        expect(prismaFake.control.transacciones).toHaveLength(2);
        expect(guardada(3)?.CATNombre).toBe("Alimentación");
    });

    it("P2034 tres veces → 409 de concurrencia sin escribir", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"));
        prismaFake.control.programarFallosTransaccion("P2034", "P2034", "P2034");

        const { status, cuerpo } = await editar(3, { CATNombre: "Alimentación" });

        expect(status).toBe(409);
        expect(cuerpo.message).toBe("Otra operación modificó las categorías al mismo tiempo; intenta de nuevo");
        expect(prismaFake.control.escrituras).toEqual([]);
    });

    it("P2028 → 500 genérico con un solo intento", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"));
        prismaFake.control.programarFallosTransaccion("P2028");
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        const { status, cuerpo } = await editar(3, { CATNombre: "Alimentación" });

        expect(status).toBe(500);
        expect(cuerpo).toEqual({ success: false, message: "Error al actualizar la categoría", data: null });
        expect(prismaFake.control.transacciones).toHaveLength(1);
    });

    it("otro error → 500 genérico sin detalles internos", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"));
        vi.spyOn(prismaFake.categoria, "update").mockRejectedValueOnce(new Error("detalle interno de la base"));

        const { status, cuerpo } = await editar(3, { CATColor: "#22c55e" });

        expect(status).toBe(500);
        expect(cuerpo).toEqual({ success: false, message: "Error al actualizar la categoría", data: null });
    });
});
