// api/tests/http/categorias.creacion.test.ts
// US2 — Crear una categoría (T030). Contrato: specs/001-gestion-categorias/contracts/categorias.md
// Prisma se sustituye por el doble en memoria; ninguna prueba toca una base de datos.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { crearErrorPrisma, prismaFake, type CategoriaFake } from "../support/prisma-fake";
import { iniciarServidorDePrueba, type ServidorDePrueba } from "../support/servidor-prueba";

vi.mock("../../src/lib/prisma", async () => {
    const { prismaFake: doble } = await import("../support/prisma-fake");
    return { prisma: doble, OPCIONES_TRANSACCION: { maxWait: 5000, timeout: 10000 } };
});

const USUARIO_ACTUAL = 1; // CURRENT_USER_ID de tests/setup.ts
const OTRO_USUARIO = 2;
const MENSAJE_CONCURRENCIA = "Otra operación modificó las categorías al mismo tiempo; intenta de nuevo";

function categoria(
    CATId: number,
    CATNombre: string,
    CATTipo: string,
    CATActiva = true,
    USUId = USUARIO_ACTUAL,
): CategoriaFake {
    return {
        CATId,
        CATNombre,
        CATTipo,
        CATColor: null,
        CATIcono: null,
        CATActiva,
        CATCreadoEn: new Date("2026-01-10T15:00:00.000Z"),
        USUId,
    };
}

let servidor: ServidorDePrueba;

async function crear(body: unknown) {
    const respuesta = await fetch(`${servidor.baseUrl}/api/categorias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return { status: respuesta.status, cuerpo: await respuesta.json() };
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
    control.llamadas.length = 0;
    control.escrituras.length = 0;
    control.transacciones.length = 0;
    control.programarFallosTransaccion();
});

describe("POST /api/categorias — creación válida", () => {
    it("crea la categoría activa, con nombre recortado y el usuario configurado (US2-1)", async () => {
        const { status, cuerpo } = await crear({
            CATNombre: "  Mascotas  ",
            CATTipo: "gasto",
            CATColor: "#f97316",
            CATIcono: null,
        });

        expect(status).toBe(201);
        expect(cuerpo.success).toBe(true);
        expect(cuerpo.message).toBe("Categoría creada correctamente");
        expect(cuerpo.data).toMatchObject({
            CATNombre: "Mascotas",
            CATTipo: "gasto",
            CATColor: "#f97316",
            CATIcono: null,
            CATActiva: true,
            USUId: USUARIO_ACTUAL,
        });
        expect(typeof cuerpo.data.CATId).toBe("number");
        expect(prismaFake.control.datos.categorias).toHaveLength(1);
    });

    it("ignora el USUId y el CATActiva enviados por el cliente (US2-10)", async () => {
        const { status, cuerpo } = await crear({
            CATNombre: "Mascotas",
            CATTipo: "gasto",
            USUId: OTRO_USUARIO,
            CATActiva: false,
        });

        expect(status).toBe(201);
        expect(cuerpo.data.USUId).toBe(USUARIO_ACTUAL);
        expect(cuerpo.data.CATActiva).toBe(true);
        expect(prismaFake.control.escrituras[0].data).not.toHaveProperty("CATActiva", false);
    });

    it("convierte color e ícono vacíos en null y recorta el ícono", async () => {
        const { cuerpo } = await crear({ CATNombre: "Libros", CATTipo: "gasto", CATColor: "", CATIcono: "  book  " });
        expect(cuerpo.data.CATColor).toBeNull();
        expect(cuerpo.data.CATIcono).toBe("book");
    });

    it("permite el mismo nombre con otro tipo (US2-6)", async () => {
        prismaFake.control.datos.categorias.push(categoria(1, "Ahorro", "ahorro"));
        const { status } = await crear({ CATNombre: "Ahorro", CATTipo: "ingreso" });
        expect(status).toBe(201);
    });

    it("no considera duplicado una categoría de otro usuario", async () => {
        prismaFake.control.datos.categorias.push(categoria(1, "Comida", "gasto", true, OTRO_USUARIO));
        const { status } = await crear({ CATNombre: "Comida", CATTipo: "gasto" });
        expect(status).toBe(201);
    });

    it("pide aislamiento Serializable", async () => {
        await crear({ CATNombre: "Mascotas", CATTipo: "gasto" });
        expect(prismaFake.control.transacciones).toEqual([{ isolationLevel: "Serializable" }]);
    });
});

describe("POST /api/categorias — validación (US2-2 a US2-4)", () => {
    it.each([
        [{ CATTipo: "gasto" }, "CATNombre es requerido y debe tener como máximo 50 caracteres"],
        [{ CATNombre: "   ", CATTipo: "gasto" }, "CATNombre es requerido y debe tener como máximo 50 caracteres"],
        [{ CATNombre: "a".repeat(51), CATTipo: "gasto" }, "CATNombre es requerido y debe tener como máximo 50 caracteres"],
        [{ CATNombre: "Viajes", CATTipo: "transferencia" }, "CATTipo debe ser uno de: ingreso, gasto, ahorro"],
        [{ CATNombre: "Viajes", CATTipo: "Gasto" }, "CATTipo debe ser uno de: ingreso, gasto, ahorro"],
        [{ CATNombre: "Viajes", CATTipo: "gasto", CATColor: "rojo" }, "CATColor debe tener el formato #RRGGBB"],
        [{ CATNombre: "Viajes", CATTipo: "gasto", CATIcono: "a".repeat(51) }, "CATIcono debe ser texto de hasta 50 caracteres"],
    ])("%j → 400", async (body, mensaje) => {
        const { status, cuerpo } = await crear(body);
        expect(status).toBe(400);
        expect(cuerpo).toEqual({ success: false, message: mensaje, data: null });
        expect(prismaFake.control.escrituras).toEqual([]);
        expect(prismaFake.control.transacciones).toEqual([]);
    });
});

describe("POST /api/categorias — duplicados (US2-5, FR-006)", () => {
    it("rechaza un duplicado activo ignorando mayúsculas y espacios", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"));

        const { status, cuerpo } = await crear({ CATNombre: " comida ", CATTipo: "gasto" });

        expect(status).toBe(409);
        expect(cuerpo).toEqual({ success: false, message: 'Ya existe la categoría "Comida" de tipo gasto', data: null });
        expect(prismaFake.control.escrituras).toEqual([]);
    });

    it("rechaza un duplicado inactivo y sugiere reactivarla", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto", false));

        const { status, cuerpo } = await crear({ CATNombre: "COMIDA", CATTipo: "gasto" });

        expect(status).toBe(409);
        expect(cuerpo.message).toBe('Ya existe la categoría "Comida" de tipo gasto (inactiva); puedes reactivarla');
        expect(prismaFake.control.escrituras).toEqual([]);
    });
});

// Manejo de errores de transacción SIMULADOS con el doble de Prisma.
// Verifica la lógica de reintentos del controlador; NO prueba la concurrencia, el aislamiento
// ni los tiempos reales de PostgreSQL (eso queda para el caso manual M7 en base aislada).
describe("POST /api/categorias — manejo de errores de transacción simulados", () => {
    it("P2034 una vez → reintenta y crea", async () => {
        prismaFake.control.programarFallosTransaccion("P2034");

        const { status } = await crear({ CATNombre: "Mascotas", CATTipo: "gasto" });

        expect(status).toBe(201);
        expect(prismaFake.control.transacciones).toHaveLength(2);
    });

    it("P2034 tres veces → 409 de concurrencia sin escribir", async () => {
        prismaFake.control.programarFallosTransaccion("P2034", "P2034", "P2034");

        const { status, cuerpo } = await crear({ CATNombre: "Mascotas", CATTipo: "gasto" });

        expect(status).toBe(409);
        expect(cuerpo).toEqual({ success: false, message: MENSAJE_CONCURRENCIA, data: null });
        expect(prismaFake.control.transacciones).toHaveLength(3);
        expect(prismaFake.control.escrituras).toEqual([]);
    });

    it("P2034 y la otra operación ya confirmó el mismo nombre → 409 de duplicado", async () => {
        vi.spyOn(prismaFake, "$transaction").mockImplementationOnce(async () => {
            // Simula que otra petición confirmó "Mascotas" mientras esta fallaba por serialización.
            prismaFake.control.datos.categorias.push(categoria(50, "Mascotas", "gasto"));
            throw crearErrorPrisma("P2034");
        });

        const { status, cuerpo } = await crear({ CATNombre: "mascotas", CATTipo: "gasto" });

        expect(status).toBe(409);
        expect(cuerpo.message).toBe('Ya existe la categoría "Mascotas" de tipo gasto');
        expect(prismaFake.$transaction).toHaveBeenCalledTimes(2);
    });

    it("P2028 → 500 genérico con un solo intento (no se trata como P2034)", async () => {
        prismaFake.control.programarFallosTransaccion("P2028");
        const consola = vi.spyOn(console, "error").mockImplementation(() => undefined);

        const { status, cuerpo } = await crear({ CATNombre: "Mascotas", CATTipo: "gasto" });

        expect(status).toBe(500);
        expect(cuerpo).toEqual({ success: false, message: "Error al crear la categoría", data: null });
        expect(prismaFake.control.transacciones).toHaveLength(1);
        expect(consola).toHaveBeenCalledWith(expect.stringContaining("P2028"));
    });

    it("otro error → 500 genérico sin detalles internos (US2-7)", async () => {
        vi.spyOn(prismaFake.categoria, "findMany").mockRejectedValueOnce(new Error("detalle interno de la base"));

        const { status, cuerpo } = await crear({ CATNombre: "Mascotas", CATTipo: "gasto" });

        expect(status).toBe(500);
        expect(cuerpo).toEqual({ success: false, message: "Error al crear la categoría", data: null });
        expect(JSON.stringify(cuerpo)).not.toContain("detalle interno");
    });
});
