// api/src/modules/categorias/categorias.controller.ts
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { obtenerUsuarioActualId } from "../../lib/usuario-actual";
import {
    cambiosCategoria,
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

function parseIdCategoria(valor: string): number | null {
    if (!/^\d+$/.test(valor)) return null;
    const id = Number(valor);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

type ResultadoEdicion =
    | { estado: "no-encontrada" }
    | { estado: "invalida"; mensaje: string }
    | { estado: "con-movimientos" }
    | { estado: "duplicada"; categoria: { CATNombre: string; CATTipo: string; CATActiva: boolean } }
    | { estado: "actualizada"; categoria: unknown };

// Edita nombre, color, ícono y tipo (FR-005 a FR-007, FR-026). Solo se validan y se escriben los
// campos que cambian respecto de lo persistido; los valores históricos que no cambian se conservan.
export const updateCategoria = async (req: Request, res: Response) => {
    try {
        const id = parseIdCategoria(req.params.id);
        if (!id) {
            res.status(400).json({ success: false, message: "El id de la categoría es inválido", data: null });
            return;
        }

        const body = (req.body ?? {}) as Record<string, unknown>;
        const USUId = obtenerUsuarioActualId();

        // Lectura previa para responder 404 y decidir el aislamiento: Serializable solo si cambian
        // el nombre o el tipo (los campos que participan de la unicidad).
        const previa = await prisma.categoria.findUnique({ where: { CATId: id } });
        if (!previa || previa.USUId !== USUId) {
            res.status(404).json({ success: false, message: "La categoría indicada no existe", data: null });
            return;
        }
        const cambiosPrevios = cambiosCategoria(previa, body);

        const editar = async (tx: Prisma.TransactionClient): Promise<ResultadoEdicion> => {
            // Se vuelve a leer dentro de la transacción para validar contra el estado vigente.
            const actual = await tx.categoria.findUnique({ where: { CATId: id } });
            if (!actual || actual.USUId !== USUId) return { estado: "no-encontrada" };

            const cambios = cambiosCategoria(actual, body);
            const mensaje =
                (cambios.nombre ? validarNombre(body.CATNombre) : null) ??
                (cambios.tipo ? validarTipo(body.CATTipo) : null) ??
                (cambios.color ? validarColor(body.CATColor) : null) ??
                (cambios.icono ? validarIcono(body.CATIcono) : null);
            if (mensaje) return { estado: "invalida", mensaje };

            const data: Prisma.CategoriaUpdateInput = {};
            if (cambios.nombre) data.CATNombre = (body.CATNombre as string).trim();
            if (cambios.tipo) data.CATTipo = body.CATTipo as string;
            if (cambios.color) data.CATColor = normalizarOpcional(body.CATColor as string | null);
            if (cambios.icono) data.CATIcono = normalizarOpcional(body.CATIcono as string | null);

            if (cambios.tipo) {
                // Cualquier movimiento asociado, activo o desactivado, fija el tipo (FR-007).
                const movimientos = await tx.movimiento.count({ where: { CATId: id } });
                if (movimientos > 0) return { estado: "con-movimientos" };
            }

            if (cambios.nombre || cambios.tipo) {
                const nombreResultante = normalizarNombre((data.CATNombre as string | undefined) ?? actual.CATNombre);
                const tipoResultante = (data.CATTipo as string | undefined) ?? actual.CATTipo;
                const mismasDelTipo = await tx.categoria.findMany({ where: { USUId, CATTipo: tipoResultante } });
                const duplicada = mismasDelTipo.find(
                    (otra) => otra.CATId !== id && normalizarNombre(otra.CATNombre) === nombreResultante,
                );
                if (duplicada) return { estado: "duplicada", categoria: duplicada };
            }

            if (Object.keys(data).length === 0) return { estado: "actualizada", categoria: actual };
            const categoria = await tx.categoria.update({ where: { CATId: id }, data });
            return { estado: "actualizada", categoria };
        };

        const resultado =
            cambiosPrevios.nombre || cambiosPrevios.tipo
                ? await ejecutarSerializableConReintentos(editar)
                : await prisma.$transaction(editar);

        switch (resultado.estado) {
            case "no-encontrada":
                res.status(404).json({ success: false, message: "La categoría indicada no existe", data: null });
                return;
            case "invalida":
                res.status(400).json({ success: false, message: resultado.mensaje, data: null });
                return;
            case "con-movimientos":
                res.status(409).json({
                    success: false,
                    message: "No se puede cambiar el tipo: la categoría tiene movimientos asociados",
                    data: null,
                });
                return;
            case "duplicada":
                res.status(409).json({ success: false, message: mensajeDuplicado(resultado.categoria), data: null });
                return;
            case "actualizada":
                res.json({ success: true, message: "Categoría actualizada correctamente", data: resultado.categoria });
                return;
        }
    } catch (error) {
        responderErrorInesperado(res, error, "Error al actualizar la categoría");
    }
};

type ResultadoEstado = { estado: "no-encontrada" } | { estado: "sin-cambio" } | { estado: "cambiada"; categoria: unknown };

// Activa o desactiva una categoría propia sin borrarla (FR-008 a FR-012). Solo escribe CATActiva:
// los movimientos y presupuestos asociados no se tocan. Repetir el estado actual responde 409.
function cambiarEstadoCategoria(activa: boolean) {
    const verbo = activa ? "activar" : "desactivar";
    return async (req: Request, res: Response) => {
        try {
            const id = parseIdCategoria(req.params.id);
            if (!id) {
                res.status(400).json({ success: false, message: "El id de la categoría es inválido", data: null });
                return;
            }
            const USUId = obtenerUsuarioActualId();

            // La lectura y la escritura van en la misma transacción (Constitución V).
            const resultado = await prisma.$transaction(async (tx): Promise<ResultadoEstado> => {
                const actual = await tx.categoria.findUnique({ where: { CATId: id } });
                if (!actual || actual.USUId !== USUId) return { estado: "no-encontrada" };
                if (actual.CATActiva === activa) return { estado: "sin-cambio" };
                const categoria = await tx.categoria.update({ where: { CATId: id }, data: { CATActiva: activa } });
                return { estado: "cambiada", categoria };
            });

            if (resultado.estado === "no-encontrada") {
                res.status(404).json({ success: false, message: "La categoría indicada no existe", data: null });
                return;
            }
            if (resultado.estado === "sin-cambio") {
                res.status(409).json({
                    success: false,
                    message: activa ? "La categoría ya se encuentra activa" : "La categoría ya se encuentra inactiva",
                    data: null,
                });
                return;
            }
            res.json({
                success: true,
                message: activa ? "Categoría activada correctamente" : "Categoría desactivada correctamente",
                data: resultado.categoria,
            });
        } catch (error) {
            responderErrorInesperado(res, error, `Error al ${verbo} la categoría`);
        }
    };
}

export const desactivarCategoria = cambiarEstadoCategoria(false);
export const activarCategoria = cambiarEstadoCategoria(true);
