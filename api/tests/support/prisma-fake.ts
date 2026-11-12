// api/tests/support/prisma-fake.ts
// Doble en memoria de Prisma Client para las pruebas de la API.
//
// IMPORTANTE: este doble NO reproduce el aislamiento de transacciones, SSI, los tiempos ni la
// concurrencia de PostgreSQL, ni la semántica completa de los filtros de Prisma. Solo permite
// verificar la lógica de la aplicación ante resultados y errores simulados (research R9).
//
// Uso en un archivo de prueba:
//   vi.mock("../../src/lib/prisma", async () => {
//       const { prismaFake } = await import("../support/prisma-fake");
//       return { prisma: prismaFake, OPCIONES_TRANSACCION: { maxWait: 5000, timeout: 10000 } };
//   });
import { Prisma } from "@prisma/client";

export interface UsuarioFake {
    USUId: number;
    USUNombre: string;
}

export interface CuentaFake {
    CUEId: number;
    CUENombre: string;
    CUEActiva: boolean;
    USUId: number;
}

export interface CategoriaFake {
    CATId: number;
    CATNombre: string;
    CATTipo: string;
    CATColor: string | null;
    CATIcono: string | null;
    CATActiva: boolean;
    CATCreadoEn: Date;
    USUId: number;
}

export interface MovimientoFake {
    MOVId: number;
    MOVTipo: string;
    MOVMonto: string;
    MOVDescripcion: string | null;
    MOVFecha: Date;
    MOVActiva: boolean;
    MOVCreadoEn: Date;
    USUId: number;
    CUEId: number;
    CATId: number | null;
}

export interface LlamadaFake {
    modelo: string;
    metodo: string;
    args: unknown;
}

export interface EscrituraFake {
    modelo: string;
    metodo: "create" | "update";
    data: Record<string, unknown>;
}

export interface OpcionesTransaccionFake {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: string;
}

interface IncludeMovimiento {
    cuenta?: boolean;
    categoria?: boolean;
}

const VERSION_CLIENTE_FAKE = "prisma-fake";

/** Crea un error conocido de Prisma con el código indicado (por ejemplo "P2034" o "P2028"). */
export function crearErrorPrisma(code: string, mensaje = `Error simulado ${code}`) {
    return new Prisma.PrismaClientKnownRequestError(mensaje, { code, clientVersion: VERSION_CLIENTE_FAKE });
}

/** Crea un error de inicialización de Prisma (por ejemplo, base de datos inalcanzable). */
export function crearErrorInicializacion(mensaje = "Base de datos inalcanzable (simulado)") {
    return new Prisma.PrismaClientInitializationError(mensaje, VERSION_CLIENTE_FAKE);
}

function coincide<T extends object>(registro: T, where?: Partial<T>): boolean {
    if (!where) return true;
    return (Object.keys(where) as (keyof T)[]).every(
        (clave) => where[clave] === undefined || registro[clave] === where[clave],
    );
}

export function crearPrismaFake() {
    const datos = {
        usuarios: [] as UsuarioFake[],
        cuentas: [] as CuentaFake[],
        categorias: [] as CategoriaFake[],
        movimientos: [] as MovimientoFake[],
    };
    const llamadas: LlamadaFake[] = [];
    const escrituras: EscrituraFake[] = [];
    const transacciones: (OpcionesTransaccionFake | undefined)[] = [];
    let fallosTransaccion: (string | null)[] = [];
    let errorUsuario: Error | null = null;

    function registrar(modelo: string, metodo: string, args: unknown) {
        llamadas.push({ modelo, metodo, args });
    }

    function siguienteId(registros: { [clave: string]: unknown }[], clave: string): number {
        const ids = registros.map((registro) => Number(registro[clave]));
        return ids.length === 0 ? 1 : Math.max(...ids) + 1;
    }

    function conRelaciones(movimiento: MovimientoFake, include?: IncludeMovimiento) {
        if (!include) return { ...movimiento };
        return {
            ...movimiento,
            ...(include.cuenta && { cuenta: datos.cuentas.find((c) => c.CUEId === movimiento.CUEId) ?? null }),
            ...(include.categoria && {
                categoria: datos.categorias.find((c) => c.CATId === movimiento.CATId) ?? null,
            }),
        };
    }

    const cliente = {
        usuario: {
            async findUnique(args: { where: { USUId: number }; select?: Record<string, boolean> }) {
                registrar("usuario", "findUnique", args);
                if (errorUsuario) throw errorUsuario;
                const usuario = datos.usuarios.find((u) => u.USUId === args.where.USUId);
                return usuario ? { ...usuario } : null;
            },
        },
        cuenta: {
            async findUnique(args: { where: { CUEId: number } }) {
                registrar("cuenta", "findUnique", args);
                const cuenta = datos.cuentas.find((c) => c.CUEId === args.where.CUEId);
                return cuenta ? { ...cuenta } : null;
            },
        },
        categoria: {
            async findMany(args?: { where?: Partial<CategoriaFake>; orderBy?: { CATNombre?: "asc" | "desc" } }) {
                registrar("categoria", "findMany", args);
                const resultado = datos.categorias.filter((c) => coincide(c, args?.where)).map((c) => ({ ...c }));
                const orden = args?.orderBy?.CATNombre;
                if (orden) {
                    resultado.sort((a, b) => {
                        const comparacion = a.CATNombre < b.CATNombre ? -1 : a.CATNombre > b.CATNombre ? 1 : 0;
                        return orden === "asc" ? comparacion : -comparacion;
                    });
                }
                return resultado;
            },
            async findUnique(args: { where: { CATId: number } }) {
                registrar("categoria", "findUnique", args);
                const categoria = datos.categorias.find((c) => c.CATId === args.where.CATId);
                return categoria ? { ...categoria } : null;
            },
            async create(args: {
                data: Pick<CategoriaFake, "CATNombre" | "CATTipo" | "USUId"> &
                    Partial<Pick<CategoriaFake, "CATColor" | "CATIcono" | "CATActiva">>;
            }) {
                registrar("categoria", "create", args);
                escrituras.push({ modelo: "categoria", metodo: "create", data: { ...args.data } });
                const categoria: CategoriaFake = {
                    CATCreadoEn: new Date("2026-11-12T00:00:00.000Z"),
                    ...args.data,
                    CATColor: args.data.CATColor ?? null,
                    CATIcono: args.data.CATIcono ?? null,
                    CATActiva: args.data.CATActiva ?? true,
                    CATId: siguienteId(datos.categorias as unknown as { [clave: string]: unknown }[], "CATId"),
                };
                datos.categorias.push(categoria);
                return { ...categoria };
            },
            async update(args: { where: { CATId: number }; data: Partial<CategoriaFake> }) {
                registrar("categoria", "update", args);
                escrituras.push({ modelo: "categoria", metodo: "update", data: { ...args.data } });
                const categoria = datos.categorias.find((c) => c.CATId === args.where.CATId);
                if (!categoria) throw crearErrorPrisma("P2025", "Registro no encontrado (simulado)");
                Object.assign(categoria, args.data);
                return { ...categoria };
            },
        },
        movimiento: {
            async findUnique(args: { where: { MOVId: number }; include?: IncludeMovimiento }) {
                registrar("movimiento", "findUnique", args);
                const movimiento = datos.movimientos.find((m) => m.MOVId === args.where.MOVId);
                return movimiento ? conRelaciones(movimiento, args.include) : null;
            },
            async count(args?: { where?: Partial<MovimientoFake> }) {
                registrar("movimiento", "count", args);
                return datos.movimientos.filter((m) => coincide(m, args?.where)).length;
            },
            async create(args: {
                data: Omit<MovimientoFake, "MOVId" | "MOVCreadoEn" | "MOVActiva" | "MOVMonto"> & {
                    MOVMonto: number | string;
                    MOVActiva?: boolean;
                };
                include?: IncludeMovimiento;
            }) {
                registrar("movimiento", "create", args);
                escrituras.push({ modelo: "movimiento", metodo: "create", data: { ...args.data } });
                const movimiento: MovimientoFake = {
                    MOVActiva: true,
                    MOVCreadoEn: new Date("2026-11-12T00:00:00.000Z"),
                    ...args.data,
                    MOVMonto: String(args.data.MOVMonto),
                    MOVId: siguienteId(datos.movimientos as unknown as { [clave: string]: unknown }[], "MOVId"),
                };
                datos.movimientos.push(movimiento);
                return conRelaciones(movimiento, args.include);
            },
            async update(args: {
                where: { MOVId: number };
                data: Partial<Omit<MovimientoFake, "MOVMonto">> & { MOVMonto?: number | string };
                include?: IncludeMovimiento;
            }) {
                registrar("movimiento", "update", args);
                escrituras.push({ modelo: "movimiento", metodo: "update", data: { ...args.data } });
                const movimiento = datos.movimientos.find((m) => m.MOVId === args.where.MOVId);
                if (!movimiento) throw crearErrorPrisma("P2025", "Registro no encontrado (simulado)");
                const { MOVMonto, ...resto } = args.data;
                Object.assign(movimiento, resto, MOVMonto !== undefined ? { MOVMonto: String(MOVMonto) } : {});
                return conRelaciones(movimiento, args.include);
            },
        },
        async $disconnect() {
            registrar("$disconnect", "$disconnect", undefined);
        },
    };

    // El cliente de transacción de Prisma no expone $transaction; el doble entrega los mismos
    // modelos. No hay aislamiento real: las escrituras se aplican de inmediato.
    async function $transaction<R>(
        fn: (tx: typeof cliente) => Promise<R>,
        opciones?: OpcionesTransaccionFake,
    ): Promise<R> {
        registrar("$transaction", "$transaction", opciones);
        transacciones.push(opciones);
        const fallo = fallosTransaccion.shift();
        if (fallo) throw crearErrorPrisma(fallo);
        return fn(cliente);
    }

    const control = {
        datos,
        llamadas,
        escrituras,
        transacciones,
        /** Las siguientes transacciones fallarán con estos códigos, en orden (null = sin fallo). */
        programarFallosTransaccion(...codigos: (string | null)[]) {
            fallosTransaccion = [...codigos];
        },
        /** usuario.findUnique lanzará este error hasta que se pase null. */
        programarErrorUsuario(error: Error | null) {
            errorUsuario = error;
        },
        reiniciar() {
            datos.usuarios.length = 0;
            datos.cuentas.length = 0;
            datos.categorias.length = 0;
            datos.movimientos.length = 0;
            llamadas.length = 0;
            escrituras.length = 0;
            transacciones.length = 0;
            fallosTransaccion = [];
            errorUsuario = null;
        },
    };

    return Object.assign(cliente, { $transaction, control });
}

export type PrismaFake = ReturnType<typeof crearPrismaFake>;

/** Instancia compartida que los archivos de prueba inyectan con vi.mock. */
export const prismaFake = crearPrismaFake();
