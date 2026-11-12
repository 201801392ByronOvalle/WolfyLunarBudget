// api/src/modules/movimientos/movimientos.controller.ts
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { obtenerUsuarioActualId } from "../../lib/usuario-actual";
import { cambiosMovimiento, tipoCorresponde } from "../categorias/categorias.rules";

const TIPOS_MOVIMIENTO = ["INGRESO", "GASTO", "AHORRO"] as const;
type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

interface MovimientoPayload {
    USUId?: unknown;
    CUEId: number;
    CATId?: number | null;
    MOVTipo: TipoMovimiento;
    MOVMonto: number;
    MOVDescripcion?: string | null;
    MOVFecha: string;
}

const INCLUIR_RELACIONES = { cuenta: true, categoria: true } as const;

function esEnteroPositivo(valor: unknown): valor is number {
    return typeof valor === "number" && Number.isInteger(valor) && valor > 0;
}

function esMontoValido(valor: unknown): valor is number {
    return typeof valor === "number" && Number.isFinite(valor) && valor > 0;
}

function esTipoValido(valor: unknown): valor is TipoMovimiento {
    return typeof valor === "string" && (TIPOS_MOVIMIENTO as readonly string[]).includes(valor);
}

function esFechaValida(valor: unknown): valor is string {
    if (typeof valor !== "string" || valor.trim() === "") return false;
    return !Number.isNaN(new Date(valor).getTime());
}

function esDescripcionValida(valor: unknown): boolean {
    return valor === undefined || valor === null || typeof valor === "string";
}

// Valida el payload completo requerido para crear un movimiento. USUId ya no se valida aquí:
// es opcional y solo puede coincidir con el usuario configurado (FR-024, D2).
function validarPayloadCreacion(body: Partial<MovimientoPayload>): string | null {
    if (!esEnteroPositivo(body.CUEId)) return "CUEId es requerido y debe ser un número entero positivo";
    if (body.CATId !== undefined && body.CATId !== null && !esEnteroPositivo(body.CATId)) {
        return "CATId debe ser un número entero positivo o null";
    }
    if (!esTipoValido(body.MOVTipo)) return `MOVTipo debe ser uno de: ${TIPOS_MOVIMIENTO.join(", ")}`;
    if (!esMontoValido(body.MOVMonto)) return "MOVMonto debe ser un número mayor a 0";
    if (!esFechaValida(body.MOVFecha)) return "MOVFecha debe ser una fecha ISO válida";
    if (!esDescripcionValida(body.MOVDescripcion)) return "MOVDescripcion debe ser una cadena de texto";
    return null;
}

// Valida el payload parcial para editar un movimiento (campos opcionales, pero válidos si vienen)
function validarPayloadEdicion(body: Partial<MovimientoPayload>): string | null {
    if (body.CUEId !== undefined && !esEnteroPositivo(body.CUEId)) return "CUEId debe ser un número entero positivo";
    if (body.CATId !== undefined && body.CATId !== null && !esEnteroPositivo(body.CATId)) {
        return "CATId debe ser un número entero positivo o null";
    }
    if (body.MOVTipo !== undefined && !esTipoValido(body.MOVTipo)) {
        return `MOVTipo debe ser uno de: ${TIPOS_MOVIMIENTO.join(", ")}`;
    }
    if (body.MOVMonto !== undefined && !esMontoValido(body.MOVMonto)) return "MOVMonto debe ser un número mayor a 0";
    if (body.MOVFecha !== undefined && !esFechaValida(body.MOVFecha)) return "MOVFecha debe ser una fecha ISO válida";
    if (!esDescripcionValida(body.MOVDescripcion)) return "MOVDescripcion debe ser una cadena de texto";
    return null;
}

function parseIdParam(valor: string): number | null {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// Rechazo de negocio lanzado dentro de la transacción: no hubo escrituras y se responde con su estado.
class RechazoMovimiento extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

function responderError(res: Response, error: unknown, mensajeGenerico: string) {
    if (error instanceof RechazoMovimiento) {
        res.status(error.status).json({ success: false, message: error.message, data: null });
        return;
    }
    // P2028: la transacción no se inició a tiempo o expiró. Sin reintento; solo se registra el código.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2028") {
        console.error("Transacción de movimientos no iniciada a tiempo o expirada (P2028)");
    }
    res.status(500).json({ success: false, message: mensajeGenerico, data: null });
}

// Cuenta asignada o modificada: debe existir, pertenecer al usuario actual y estar activa.
async function validarCuentaAsignada(tx: Prisma.TransactionClient, CUEId: number, USUId: number) {
    const cuenta = await tx.cuenta.findUnique({ where: { CUEId } });
    if (!cuenta || cuenta.USUId !== USUId) throw new RechazoMovimiento(404, "La cuenta indicada no existe");
    if (!cuenta.CUEActiva) throw new RechazoMovimiento(409, "La cuenta indicada está inactiva");
}

// Categoría asignada o resultante de un cambio: existe y es del usuario (404), activa (409) y
// corresponde al tipo del movimiento (400) (FR-021, FR-022, FR-024).
async function validarCategoriaAsignada(
    tx: Prisma.TransactionClient,
    CATId: number,
    USUId: number,
    MOVTipo: string,
) {
    const categoria = await tx.categoria.findUnique({ where: { CATId } });
    if (!categoria || categoria.USUId !== USUId) {
        throw new RechazoMovimiento(404, "La categoría indicada no existe");
    }
    if (!categoria.CATActiva) throw new RechazoMovimiento(409, "La categoría indicada está inactiva");
    if (!tipoCorresponde(categoria.CATTipo, MOVTipo)) {
        throw new RechazoMovimiento(400, "La categoría no corresponde al tipo del movimiento");
    }
}

export const getMovimientos = async (_req: Request, res: Response) => {
    try {
        const movimientos = await prisma.movimiento.findMany({
            where: {
                MOVActiva: true,
            },
            include: {
                cuenta: true,
                categoria: true,
            },
            orderBy: [{ MOVFecha: "desc" }, { MOVCreadoEn: "desc" }],
        });

        res.json({
            success: true,
            message: "Movimientos obtenidos correctamente",
            data: movimientos,
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Error al obtener movimientos",
            data: null,
        });
    }
};

export const createMovimiento = async (req: Request, res: Response) => {
    try {
        const body = req.body as Partial<MovimientoPayload>;
        const errorValidacion = validarPayloadCreacion(body);
        if (errorValidacion) {
            res.status(400).json({ success: false, message: errorValidacion, data: null });
            return;
        }

        // El usuario lo determina el servidor; el cliente no puede escoger otro (FR-024, D2).
        const USUId = obtenerUsuarioActualId();
        if (body.USUId !== undefined && body.USUId !== USUId) {
            res.status(400).json({
                success: false,
                message: "USUId no corresponde al usuario actual del servidor",
                data: null,
            });
            return;
        }

        const movimiento = await prisma.$transaction(async (tx) => {
            await validarCuentaAsignada(tx, body.CUEId!, USUId);
            if (body.CATId !== undefined && body.CATId !== null) {
                await validarCategoriaAsignada(tx, body.CATId, USUId, body.MOVTipo!);
            }

            return tx.movimiento.create({
                data: {
                    USUId,
                    CUEId: body.CUEId!,
                    CATId: body.CATId ?? null,
                    MOVTipo: body.MOVTipo!,
                    MOVMonto: body.MOVMonto!,
                    MOVDescripcion: body.MOVDescripcion ?? null,
                    MOVFecha: new Date(body.MOVFecha!),
                },
                include: INCLUIR_RELACIONES,
            });
        });

        res.status(201).json({
            success: true,
            message: "Movimiento creado correctamente",
            data: movimiento,
        });
    } catch (error) {
        responderError(res, error, "Error al crear el movimiento");
    }
};

export const updateMovimiento = async (req: Request, res: Response) => {
    try {
        const id = parseIdParam(req.params.id);
        if (!id) {
            res.status(400).json({ success: false, message: "El id del movimiento es inválido", data: null });
            return;
        }

        const body = req.body as Partial<MovimientoPayload>;
        const errorValidacion = validarPayloadEdicion(body);
        if (errorValidacion) {
            res.status(400).json({ success: false, message: errorValidacion, data: null });
            return;
        }

        const USUId = obtenerUsuarioActualId();

        const movimiento = await prisma.$transaction(async (tx) => {
            const existente = await tx.movimiento.findUnique({ where: { MOVId: id }, include: INCLUIR_RELACIONES });
            // La pertenencia del propio movimiento se valida siempre (Principio V, US5-10).
            if (!existente || existente.USUId !== USUId) {
                throw new RechazoMovimiento(404, "El movimiento indicado no existe");
            }
            if (!existente.MOVActiva) throw new RechazoMovimiento(409, "El movimiento indicado está desactivado");

            const cambios = cambiosMovimiento(existente, body as Record<string, unknown>);

            if (cambios.cuenta) {
                await validarCuentaAsignada(tx, body.CUEId!, USUId);
            } else if (body.CUEId !== undefined) {
                // Se mantiene la validación previa de la cuenta reenviada sin cambios (riesgo residual R-7).
                const cuenta = await tx.cuenta.findUnique({ where: { CUEId: body.CUEId } });
                if (!cuenta) throw new RechazoMovimiento(404, "La cuenta indicada no existe");
                if (!cuenta.CUEActiva) throw new RechazoMovimiento(409, "La cuenta indicada está inactiva");
            }

            // Si cambia el tipo o la categoría, la categoría resultante debe cumplir las reglas
            // actuales; si no cambian, se conserva la histórica sin revalidarla (FR-022, FR-026).
            const tipoResultante = cambios.tipo ? body.MOVTipo! : existente.MOVTipo;
            const categoriaResultante = cambios.categoria ? (body.CATId ?? null) : existente.CATId;
            if ((cambios.tipo || cambios.categoria) && categoriaResultante !== null) {
                await validarCategoriaAsignada(tx, categoriaResultante, USUId, tipoResultante);
            }

            // Solo los campos que cambian respecto de lo persistido (Principio V, decisión C1).
            const data: Prisma.MovimientoUncheckedUpdateInput = {};
            if (cambios.cuenta) data.CUEId = body.CUEId;
            if (cambios.categoria) data.CATId = body.CATId ?? null;
            if (cambios.tipo) data.MOVTipo = body.MOVTipo;
            if (body.MOVMonto !== undefined && !new Prisma.Decimal(existente.MOVMonto).equals(body.MOVMonto)) {
                data.MOVMonto = body.MOVMonto;
            }
            if (body.MOVDescripcion !== undefined && (body.MOVDescripcion ?? null) !== existente.MOVDescripcion) {
                data.MOVDescripcion = body.MOVDescripcion;
            }
            if (body.MOVFecha !== undefined) {
                const fecha = new Date(body.MOVFecha);
                if (fecha.getTime() !== existente.MOVFecha.getTime()) data.MOVFecha = fecha;
            }

            if (Object.keys(data).length === 0) return existente;

            return tx.movimiento.update({ where: { MOVId: id }, data, include: INCLUIR_RELACIONES });
        });

        res.json({
            success: true,
            message: "Movimiento actualizado correctamente",
            data: movimiento,
        });
    } catch (error) {
        responderError(res, error, "Error al actualizar el movimiento");
    }
};

export const desactivarMovimiento = async (req: Request, res: Response) => {
    try {
        const id = parseIdParam(req.params.id);
        if (!id) {
            res.status(400).json({ success: false, message: "El id del movimiento es inválido", data: null });
            return;
        }

        const USUId = obtenerUsuarioActualId();

        const movimiento = await prisma.$transaction(async (tx) => {
            const existente = await tx.movimiento.findUnique({ where: { MOVId: id } });
            // Un movimiento de otro usuario se responde como inexistente, sin modificarlo (US5-11).
            if (!existente || existente.USUId !== USUId) {
                throw new RechazoMovimiento(404, "El movimiento indicado no existe");
            }
            if (!existente.MOVActiva) {
                throw new RechazoMovimiento(409, "El movimiento ya se encuentra desactivado");
            }

            return tx.movimiento.update({ where: { MOVId: id }, data: { MOVActiva: false } });
        });

        res.json({
            success: true,
            message: "Movimiento desactivado correctamente",
            data: movimiento,
        });
    } catch (error) {
        responderError(res, error, "Error al desactivar el movimiento");
    }
};
