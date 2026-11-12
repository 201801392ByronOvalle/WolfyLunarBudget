// api/tests/http/categorias.consulta.test.ts
// US1 — Consultar categorías (T022). Contrato: specs/001-gestion-categorias/contracts/categorias.md
// Prisma se sustituye por el doble en memoria; ninguna prueba toca una base de datos.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prismaFake, type CategoriaFake } from "../support/prisma-fake";
import { iniciarServidorDePrueba, type ServidorDePrueba } from "../support/servidor-prueba";

vi.mock("../../src/lib/prisma", async () => {
    const { prismaFake: doble } = await import("../support/prisma-fake");
    return { prisma: doble, OPCIONES_TRANSACCION: { maxWait: 5000, timeout: 10000 } };
});

const USUARIO_ACTUAL = 1; // CURRENT_USER_ID de tests/setup.ts
const OTRO_USUARIO = 2;

function categoria(
    CATId: number,
    CATNombre: string,
    CATTipo: string,
    USUId = USUARIO_ACTUAL,
    CATActiva = true,
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

const CLAVES_CATEGORIA = ["CATActiva", "CATColor", "CATCreadoEn", "CATIcono", "CATId", "CATNombre", "CATTipo", "USUId"];

let servidor: ServidorDePrueba;

function metodosDeEscritura() {
    return prismaFake.control.llamadas.filter((llamada) => ["create", "update"].includes(llamada.metodo));
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
    const { datos, llamadas, escrituras } = prismaFake.control;
    datos.categorias.length = 0;
    llamadas.length = 0;
    escrituras.length = 0;
});

describe("GET /api/categorias", () => {
    it("devuelve solo las categorías del usuario configurado, activas e inactivas, ordenadas por nombre", async () => {
        prismaFake.control.datos.categorias.push(
            categoria(1, "Transporte", "gasto"),
            categoria(2, "Ahorro", "ahorro", USUARIO_ACTUAL, false),
            categoria(3, "Comida", "gasto"),
            categoria(4, "Ajena", "gasto", OTRO_USUARIO),
        );

        const respuesta = await fetch(`${servidor.baseUrl}/api/categorias`);
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo.success).toBe(true);
        expect(cuerpo.message).toBe("Categorías obtenidas correctamente");
        expect(cuerpo.data.map((c: CategoriaFake) => c.CATNombre)).toEqual(["Ahorro", "Comida", "Transporte"]);
        expect(cuerpo.data.every((c: CategoriaFake) => c.USUId === USUARIO_ACTUAL)).toBe(true);
        expect(cuerpo.data.find((c: CategoriaFake) => c.CATId === 2).CATActiva).toBe(false);
    });

    it("conserva exactamente los campos de Categoria y no agrega campos de duplicados", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"), categoria(9, "comida ", "gasto"));

        const cuerpo = await (await fetch(`${servidor.baseUrl}/api/categorias`)).json();

        expect(Object.keys(cuerpo).sort()).toEqual(["data", "message", "success"]);
        expect(cuerpo).not.toHaveProperty("duplicadas");
        for (const item of cuerpo.data) {
            expect(Object.keys(item).sort()).toEqual(CLAVES_CATEGORIA);
        }
    });

    it("devuelve una lista vacía si el usuario no tiene categorías", async () => {
        prismaFake.control.datos.categorias.push(categoria(4, "Ajena", "gasto", OTRO_USUARIO));

        const cuerpo = await (await fetch(`${servidor.baseUrl}/api/categorias`)).json();

        expect(cuerpo).toEqual({ success: true, message: "Categorías obtenidas correctamente", data: [] });
    });

    it("ante un error responde 500 sin exponer detalles internos", async () => {
        vi.spyOn(prismaFake.categoria, "findMany").mockRejectedValueOnce(new Error("detalle interno de la base"));

        const respuesta = await fetch(`${servidor.baseUrl}/api/categorias`);
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(500);
        expect(cuerpo).toEqual({ success: false, message: "Error al obtener categorías", data: null });
        expect(JSON.stringify(cuerpo)).not.toContain("detalle interno");
    });

    it("no escribe nada", async () => {
        prismaFake.control.datos.categorias.push(categoria(1, "Comida", "gasto"));
        await fetch(`${servidor.baseUrl}/api/categorias`);
        expect(metodosDeEscritura()).toEqual([]);
        expect(prismaFake.control.escrituras).toEqual([]);
    });
});

describe("GET /api/categorias/duplicados", () => {
    it("identifica grupos de duplicados históricos del usuario sin modificar registros", async () => {
        prismaFake.control.datos.categorias.push(
            categoria(3, "Comida", "gasto"),
            categoria(4, "Sueldo", "ingreso"),
            categoria(9, "comida ", "gasto", USUARIO_ACTUAL, false),
            categoria(10, "Comida", "ingreso"),
            categoria(11, "comida", "gasto", OTRO_USUARIO),
        );
        const antes = JSON.stringify(prismaFake.control.datos.categorias);

        const respuesta = await fetch(`${servidor.baseUrl}/api/categorias/duplicados`);
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(200);
        expect(cuerpo).toEqual({
            success: true,
            message: "Diagnóstico de duplicados obtenido correctamente",
            data: [
                {
                    tipo: "gasto",
                    nombreNormalizado: "comida",
                    categorias: [
                        { CATId: 3, CATNombre: "Comida", CATActiva: true },
                        { CATId: 9, CATNombre: "comida ", CATActiva: false },
                    ],
                },
            ],
        });
        expect(JSON.stringify(prismaFake.control.datos.categorias)).toBe(antes);
        expect(metodosDeEscritura()).toEqual([]);
        expect(prismaFake.control.escrituras).toEqual([]);
    });

    it("devuelve [] sin duplicados", async () => {
        prismaFake.control.datos.categorias.push(categoria(3, "Comida", "gasto"), categoria(4, "Comida", "ingreso"));

        const cuerpo = await (await fetch(`${servidor.baseUrl}/api/categorias/duplicados`)).json();

        expect(cuerpo).toEqual({
            success: true,
            message: "Diagnóstico de duplicados obtenido correctamente",
            data: [],
        });
    });

    it("solo consulta categorías del usuario configurado", async () => {
        await fetch(`${servidor.baseUrl}/api/categorias/duplicados`);
        const consultas = prismaFake.control.llamadas.filter(
            (llamada) => llamada.modelo === "categoria" && llamada.metodo === "findMany",
        );
        expect(consultas).toHaveLength(1);
        expect(consultas[0].args).toMatchObject({ where: { USUId: USUARIO_ACTUAL } });
    });

    it("la ruta fija /duplicados llega al diagnóstico y no a un manejador /:id", async () => {
        const respuesta = await fetch(`${servidor.baseUrl}/api/categorias/duplicados`);
        const cuerpo = await respuesta.json();
        expect(respuesta.status).toBe(200);
        expect(cuerpo.message).toBe("Diagnóstico de duplicados obtenido correctamente");
        expect(prismaFake.control.llamadas.some((llamada) => llamada.metodo === "findUnique")).toBe(false);
    });

    it("ante un error responde 500 sin exponer detalles internos", async () => {
        vi.spyOn(prismaFake.categoria, "findMany").mockRejectedValueOnce(new Error("detalle interno de la base"));

        const respuesta = await fetch(`${servidor.baseUrl}/api/categorias/duplicados`);
        const cuerpo = await respuesta.json();

        expect(respuesta.status).toBe(500);
        expect(cuerpo).toEqual({ success: false, message: "Error al obtener el diagnóstico de duplicados", data: null });
    });
});
