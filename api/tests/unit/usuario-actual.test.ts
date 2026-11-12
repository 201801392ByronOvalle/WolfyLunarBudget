// api/tests/unit/usuario-actual.test.ts
// Pruebas del usuario actual configurado (T010). Prisma se sustituye por el doble en memoria;
// el DATABASE_URL ".invalid" de tests/setup.ts es solo una barrera adicional.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/prisma", async () => {
    const { prismaFake } = await import("../support/prisma-fake");
    return { prisma: prismaFake, OPCIONES_TRANSACCION: { maxWait: 5000, timeout: 10000 } };
});

type ModuloUsuarioActual = typeof import("../../src/lib/usuario-actual");
type ModuloFake = typeof import("../support/prisma-fake");

let modulo: ModuloUsuarioActual;
let fake: ModuloFake["prismaFake"];
let soporte: ModuloFake;

// usuario-actual.ts guarda el id verificado en el módulo: se reinicia el registro de módulos
// antes de cada prueba para que ninguna herede el estado de otra.
// vi.resetModules() no vuelve a ejecutar la fábrica de vi.mock, así que el doble se obtiene del
// propio módulo mockeado para manipular exactamente la instancia que usa usuario-actual.ts.
beforeEach(async () => {
    vi.resetModules();
    soporte = await import("../support/prisma-fake");
    const mockPrisma = await import("../../src/lib/prisma");
    fake = mockPrisma.prisma as unknown as ModuloFake["prismaFake"];
    fake.control.reiniciar();
    modulo = await import("../../src/lib/usuario-actual");
});

describe("parsearUsuarioActualId", () => {
    it.each([undefined, "", "   "])("%j → FALTA", (valor) => {
        expect(() => modulo.parsearUsuarioActualId(valor)).toThrow(modulo.ConfiguracionUsuarioActualError);
        try {
            modulo.parsearUsuarioActualId(valor);
        } catch (error) {
            expect((error as InstanceType<ModuloUsuarioActual["ConfiguracionUsuarioActualError"]>).motivo).toBe("FALTA");
        }
    });

    it.each(["abc", "0", "-1", "1.5", "1e3", "7a"])("%j → FORMATO_INVALIDO", (valor) => {
        try {
            modulo.parsearUsuarioActualId(valor);
            expect.unreachable("debió lanzar");
        } catch (error) {
            expect(error).toBeInstanceOf(modulo.ConfiguracionUsuarioActualError);
            expect((error as InstanceType<ModuloUsuarioActual["ConfiguracionUsuarioActualError"]>).motivo).toBe(
                "FORMATO_INVALIDO",
            );
        }
    });

    it("acepta un entero positivo", () => {
        expect(modulo.parsearUsuarioActualId("7")).toBe(7);
        expect(modulo.parsearUsuarioActualId(" 7 ")).toBe(7);
    });
});

describe("inicializarUsuarioActual", () => {
    it("verifica el usuario con una sola lectura y guarda el id", async () => {
        fake.control.datos.usuarios.push({ USUId: 7, USUNombre: "Prueba" });

        await expect(modulo.inicializarUsuarioActual("7")).resolves.toBe(7);
        expect(modulo.obtenerUsuarioActualId()).toBe(7);
        expect(fake.control.llamadas).toEqual([
            { modelo: "usuario", metodo: "findUnique", args: { where: { USUId: 7 }, select: { USUId: true } } },
        ]);
        expect(fake.control.escrituras).toEqual([]);
    });

    it("usa CURRENT_USER_ID de la configuración por omisión", async () => {
        fake.control.datos.usuarios.push({ USUId: 1, USUNombre: "Prueba" });
        await expect(modulo.inicializarUsuarioActual()).resolves.toBe(1);
    });

    it("usuario inexistente → USUARIO_INEXISTENTE", async () => {
        await expect(modulo.inicializarUsuarioActual("99")).rejects.toMatchObject({ motivo: "USUARIO_INEXISTENTE" });
        expect(() => modulo.obtenerUsuarioActualId()).toThrow();
    });

    it("configuración inválida no consulta la base", async () => {
        await expect(modulo.inicializarUsuarioActual("abc")).rejects.toMatchObject({ motivo: "FORMATO_INVALIDO" });
        expect(fake.control.llamadas).toEqual([]);
    });

    it("PrismaClientInitializationError simulado → ConexionBaseDatosError", async () => {
        fake.control.programarErrorUsuario(soporte.crearErrorInicializacion());
        await expect(modulo.inicializarUsuarioActual("1")).rejects.toBeInstanceOf(modulo.ConexionBaseDatosError);
    });

    it.each(["P1001", "P1002", "P1008", "P1017"])("%s simulado → ConexionBaseDatosError", async (codigo) => {
        fake.control.programarErrorUsuario(soporte.crearErrorPrisma(codigo));
        await expect(modulo.inicializarUsuarioActual("1")).rejects.toBeInstanceOf(modulo.ConexionBaseDatosError);
    });

    it("otro error se propaga sin clasificar", async () => {
        const otro = soporte.crearErrorPrisma("P2002");
        fake.control.programarErrorUsuario(otro);
        await expect(modulo.inicializarUsuarioActual("1")).rejects.toBe(otro);
    });
});

describe("obtenerUsuarioActualId", () => {
    it("falla si no se inicializó", () => {
        expect(() => modulo.obtenerUsuarioActualId()).toThrow();
    });
});

describe("describirErrorArranque", () => {
    const valorSecreto = "4242";

    it.each([
        ["FALTA", "Error de configuración: CURRENT_USER_ID falta"],
        ["FORMATO_INVALIDO", "Error de configuración: CURRENT_USER_ID no es un entero positivo"],
        ["USUARIO_INEXISTENTE", "Error de configuración: CURRENT_USER_ID no corresponde a un usuario existente"],
    ] as const)("%s → código 78", (motivo, mensaje) => {
        const resultado = modulo.describirErrorArranque(new modulo.ConfiguracionUsuarioActualError(motivo));
        expect(resultado).toEqual({ mensaje, codigoSalida: 78 });
    });

    it("error de conexión → código 69", () => {
        expect(modulo.describirErrorArranque(new modulo.ConexionBaseDatosError())).toEqual({
            mensaje: "Error de conexión a la base de datos al verificar CURRENT_USER_ID",
            codigoSalida: 69,
        });
    });

    it("otro error → código 1 con mensaje genérico", () => {
        const resultado = modulo.describirErrorArranque(new Error(`detalle interno ${valorSecreto}`));
        expect(resultado.codigoSalida).toBe(1);
        expect(resultado.mensaje).toBe("Error inesperado al iniciar la API");
    });

    it("ningún mensaje incluye el valor configurado ni DATABASE_URL", async () => {
        const errores: unknown[] = [];
        for (const valor of [undefined, "abc", valorSecreto]) {
            try {
                await modulo.inicializarUsuarioActual(valor);
            } catch (error) {
                errores.push(error);
            }
        }
        fake.control.programarErrorUsuario(soporte.crearErrorInicializacion());
        await modulo.inicializarUsuarioActual(valorSecreto).catch((error: unknown) => errores.push(error));

        expect(errores).toHaveLength(4);
        for (const error of errores) {
            const { mensaje } = modulo.describirErrorArranque(error);
            expect(mensaje).not.toContain(valorSecreto);
            expect(mensaje).not.toContain("abc");
            expect(mensaje).not.toContain(process.env.DATABASE_URL ?? "postgresql://");
            expect(mensaje).not.toContain("postgresql://");
        }
    });
});
