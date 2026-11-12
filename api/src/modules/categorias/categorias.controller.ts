// api/src/modules/categorias/categorias.controller.ts
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { obtenerUsuarioActualId } from "../../lib/usuario-actual";
import {
    detectarDuplicados,
    normalizarNombre,
    normalizarOpcional,
    validarColor,
    validarIcono,
    validarNombre,
    validarTipo,
} from "./categorias.rules";

const MAXIMO_INTENTOS_SERIALIZABLE = 3;
const MENSAJE_CONCURRENCIA = "Otra operación modificó las categorías al mismo tiempo; intenta de nuevo";

// Agotados los reintentos ante conflictos de serialización.
class ConflictoConcurrenciaError extends Error {}

// Conflicto de serialización de PostgreSQL (research R4, hallazgo M4). P2028 (transacción no
// iniciada a tiempo o expirada) y cualquier otro error NO son conflictos y no se reintentan.
function esErrorDeSerializacion(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code === "P2034";
    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
        return error.message.includes("40001") || error.message.includes("could not serialize access");
    }
    return false;
}

function esTransaccionNoIniciadaOExpirada(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2028";
}

// Ejecuta la lectura de duplicados y la escritura en una transacción Serializable, reintentando la
// transacción completa (se vuelve a leer) hasta 3 veces ante un conflicto de serialización.
// Límites sin restricción UNIQUE: solo protege frente a otras transacciones Serializable de la API.
async function ejecutarSerializableConReintentos<R>(fn: (tx: Prisma.TransactionClient) => Promise<R>): Promise<R> {
    for (let intento = 1; ; intento++) {
        try {
            return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        } catch (error) {
            if (!esErrorDeSerializacion(error)) throw error;
            if (intento >= MAXIMO_INTENTOS_SERIALIZABLE) throw new ConflictoConcurrenciaError();
        }
    }
}

function mensajeDuplicado(existente: { CATNombre: string; CATTipo: string; CATActiva: boolean }): string {
    const base = `Ya existe la categoría "${existente.CATNombre.trim()}" de tipo ${existente.CATTipo}`;
    return existente.CATActiva ? base : `${base} (inactiva); puedes reactivarla`;
}

// Respuesta de error común; P2028 se registra solo por su código, sin detalles.
function responderErrorInesperado(res: Response, error: unknown, mensaje: string) {
    if (error instanceof ConflictoConcurrenciaError) {
        res.status(409).json({ success: false, message: MENSAJE_CONCURRENCIA, data: null });
        return;
    }
    if (esTransaccionNoIniciadaOExpirada(error)) {
        console.error("Transacción de categorías no iniciada a tiempo o expirada (P2028)");
    }
    res.status(500).json({ success: false, message: mensaje, data: null });
}

// Lista las categorías (activas e inactivas) del usuario actual configurado (FR-001, FR-013).
// No incluye campos de diagnóstico (FR-025): los duplicados se consultan en /duplicados.
export const getCategorias = async (_req: Request, res: Response) => {
    try {
        const categorias = await prisma.categoria.findMany({
            where: {
                USUId: obtenerUsuarioActualId(),
            },
            orderBy: {
                CATNombre: "asc",
            },
        });

        res.json({
            success: true,
            message: "Categorías obtenidas correctamente",
            data: categorias,
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Error al obtener categorías",
            data: null,
        });
    }
};

// Diagnóstico de solo lectura de duplicados históricos del usuario actual (FR-025).
export const getDuplicadosCategorias = async (_req: Request, res: Response) => {
    try {
        const categorias = await prisma.categoria.findMany({
            where: {
                USUId: obtenerUsuarioActualId(),
            },
            orderBy: {
                CATNombre: "asc",
            },
        });

        res.json({
            success: true,
            message: "Diagnóstico de duplicados obtenido correctamente",
            data: detectarDuplicados(categorias),
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Error al obtener el diagnóstico de duplicados",
            data: null,
        });
    }
};

// Crea una categoría activa del usuario actual (FR-004 a FR-006). El cuerpo nunca define el
// propietario ni el estado: USUId y CATActiva se ignoran.
export const createCategoria = async (req: Request, res: Response) => {
    try {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const errorValidacion =
            validarNombre(body.CATNombre) ??
            validarTipo(body.CATTipo) ??
            validarColor(body.CATColor) ??
            validarIcono(body.CATIcono);
        if (errorValidacion) {
            res.status(400).json({ success: false, message: errorValidacion, data: null });
            return;
        }

        const USUId = obtenerUsuarioActualId();
        const CATNombre = (body.CATNombre as string).trim();
        const CATTipo = body.CATTipo as string;
        const CATColor = normalizarOpcional(body.CATColor as string | null | undefined);
        const CATIcono = normalizarOpcional(body.CATIcono as string | null | undefined);

        const resultado = await ejecutarSerializableConReintentos(async (tx) => {
            const mismasDelTipo = await tx.categoria.findMany({ where: { USUId, CATTipo } });
            const duplicada = mismasDelTipo.find(
                (categoria) => normalizarNombre(categoria.CATNombre) === normalizarNombre(CATNombre),
            );
            if (duplicada) return { estado: "duplicada" as const, categoria: duplicada };

            const creada = await tx.categoria.create({
                data: { CATNombre, CATTipo, CATColor, CATIcono, USUId },
            });
            return { estado: "creada" as const, categoria: creada };
        });

        if (resultado.estado === "duplicada") {
            res.status(409).json({ success: false, message: mensajeDuplicado(resultado.categoria), data: null });
            return;
        }

        res.status(201).json({
            success: true,
            message: "Categoría creada correctamente",
            data: resultado.categoria,
        });
    } catch (error) {
        responderErrorInesperado(res, error, "Error al crear la categoría");
    }
};
