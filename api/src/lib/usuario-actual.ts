// src/lib/usuario-actual.ts
// Usuario actual configurado en el servidor (FR-013, decisión D3).
//
// Solución temporal del MVP personal: NO es autenticación ni aislamiento seguro entre usuarios
// (FR-014). Se verifica una sola vez al iniciar el servidor; los mensajes nunca incluyen el valor
// configurado ni la cadena de conexión (Constitución VIII).
import { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "./prisma";

export type MotivoConfiguracionUsuario = "FALTA" | "FORMATO_INVALIDO" | "USUARIO_INEXISTENTE";

export class ConfiguracionUsuarioActualError extends Error {
    readonly motivo: MotivoConfiguracionUsuario;

    constructor(motivo: MotivoConfiguracionUsuario) {
        super(`Configuración del usuario actual inválida (${motivo})`);
        this.name = "ConfiguracionUsuarioActualError";
        this.motivo = motivo;
    }
}

export class ConexionBaseDatosError extends Error {
    constructor() {
        super("No se pudo conectar a la base de datos para verificar el usuario actual");
        this.name = "ConexionBaseDatosError";
    }
}

// Códigos de Prisma que indican que la base no es alcanzable.
const CODIGOS_CONEXION = new Set(["P1001", "P1002", "P1008", "P1017"]);

let usuarioActualId: number | null = null;

/** Convierte CURRENT_USER_ID en un entero positivo o lanza un error de configuración. */
export function parsearUsuarioActualId(raw: string | undefined): number {
    const valor = raw?.trim() ?? "";
    if (valor === "") throw new ConfiguracionUsuarioActualError("FALTA");
    if (!/^\d+$/.test(valor)) throw new ConfiguracionUsuarioActualError("FORMATO_INVALIDO");
    const id = Number(valor);
    if (!Number.isSafeInteger(id) || id <= 0) throw new ConfiguracionUsuarioActualError("FORMATO_INVALIDO");
    return id;
}

function esErrorDeConexion(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientInitializationError) return true;
    return error instanceof Prisma.PrismaClientKnownRequestError && CODIGOS_CONEXION.has(error.code);
}

/**
 * Valida la configuración y comprueba, con una sola lectura, que el usuario existe.
 * Guarda el id verificado para obtenerUsuarioActualId().
 */
export async function inicializarUsuarioActual(raw: string | undefined = env.currentUserIdRaw): Promise<number> {
    usuarioActualId = null;
    const id = parsearUsuarioActualId(raw);

    let usuario: { USUId: number } | null;
    try {
        usuario = await prisma.usuario.findUnique({ where: { USUId: id }, select: { USUId: true } });
    } catch (error) {
        if (esErrorDeConexion(error)) throw new ConexionBaseDatosError();
        throw error;
    }

    if (!usuario) throw new ConfiguracionUsuarioActualError("USUARIO_INEXISTENTE");
    usuarioActualId = usuario.USUId;
    return usuarioActualId;
}

/** Id del usuario verificado al iniciar. Lanza si no se inicializó (error de programación). */
export function obtenerUsuarioActualId(): number {
    if (usuarioActualId === null) {
        throw new Error("El usuario actual no fue inicializado");
    }
    return usuarioActualId;
}

const MENSAJES_CONFIGURACION: Record<MotivoConfiguracionUsuario, string> = {
    FALTA: "Error de configuración: CURRENT_USER_ID falta",
    FORMATO_INVALIDO: "Error de configuración: CURRENT_USER_ID no es un entero positivo",
    USUARIO_INEXISTENTE: "Error de configuración: CURRENT_USER_ID no corresponde a un usuario existente",
};

/** Traduce un error de arranque al mensaje de consola y al código de salida del proceso. */
export function describirErrorArranque(error: unknown): { mensaje: string; codigoSalida: number } {
    if (error instanceof ConfiguracionUsuarioActualError) {
        return { mensaje: MENSAJES_CONFIGURACION[error.motivo], codigoSalida: 78 };
    }
    if (error instanceof ConexionBaseDatosError) {
        return { mensaje: "Error de conexión a la base de datos al verificar CURRENT_USER_ID", codigoSalida: 69 };
    }
    return { mensaje: "Error inesperado al iniciar la API", codigoSalida: 1 };
}
