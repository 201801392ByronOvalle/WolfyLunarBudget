// api/src/modules/movimientos/movimientos.controller.ts
import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

const TIPOS_MOVIMIENTO = ["INGRESO", "GASTO", "AHORRO"] as const;
type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

interface MovimientoPayload {
    USUId: number;
    CUEId: number;
    CATId?: number | null;
    MOVTipo: TipoMovimiento;
    MOVMonto: number;
    MOVDescripcion?: string | null;
    MOVFecha: string;
}

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

// Valida el payload completo requerido para crear un movimiento
function validarPayloadCreacion(body: Partial<MovimientoPayload>): string | null {
    if (!esEnteroPositivo(body.USUId)) return "USUId es requerido y debe ser un número entero positivo";
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

        const usuario = await prisma.usuario.findUnique({ where: { USUId: body.USUId! } });
        if (!usuario) {
            res.status(404).json({ success: false, message: "El usuario indicado no existe", data: null });
            return;
        }

        const cuenta = await prisma.cuenta.findUnique({ where: { CUEId: body.CUEId! } });
        if (!cuenta) {
            res.status(404).json({ success: false, message: "La cuenta indicada no existe", data: null });
            return;
        }
        if (!cuenta.CUEActiva) {
            res.status(409).json({ success: false, message: "La cuenta indicada está inactiva", data: null });
            return;
        }

        if (body.CATId !== undefined && body.CATId !== null) {
            const categoria = await prisma.categoria.findUnique({ where: { CATId: body.CATId } });
            if (!categoria) {
                res.status(404).json({ success: false, message: "La categoría indicada no existe", data: null });
                return;
            }
            if (!categoria.CATActiva) {
                res.status(409).json({ success: false, message: "La categoría indicada está inactiva", data: null });
                return;
            }
        }

        const movimiento = await prisma.movimiento.create({
            data: {
                USUId: body.USUId!,
                CUEId: body.CUEId!,
                CATId: body.CATId ?? null,
                MOVTipo: body.MOVTipo!,
                MOVMonto: body.MOVMonto!,
                MOVDescripcion: body.MOVDescripcion ?? null,
                MOVFecha: new Date(body.MOVFecha!),
            },
            include: {
                cuenta: true,
                categoria: true,
            },
        });

        res.status(201).json({
            success: true,
            message: "Movimiento creado correctamente",
            data: movimiento,
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Error al crear el movimiento",
            data: null,
        });
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

        const movimientoExistente = await prisma.movimiento.findUnique({ where: { MOVId: id } });
        if (!movimientoExistente) {
            res.status(404).json({ success: false, message: "El movimiento indicado no existe", data: null });
            return;
        }
        if (!movimientoExistente.MOVActiva) {
            res.status(409).json({ success: false, message: "El movimiento indicado está desactivado", data: null });
            return;
        }

        if (body.CUEId !== undefined) {
            const cuenta = await prisma.cuenta.findUnique({ where: { CUEId: body.CUEId } });
            if (!cuenta) {
                res.status(404).json({ success: false, message: "La cuenta indicada no existe", data: null });
                return;
            }
            if (!cuenta.CUEActiva) {
                res.status(409).json({ success: false, message: "La cuenta indicada está inactiva", data: null });
                return;
            }
        }

        if (body.CATId !== undefined && body.CATId !== null) {
            const categoria = await prisma.categoria.findUnique({ where: { CATId: body.CATId } });
            if (!categoria) {
                res.status(404).json({ success: false, message: "La categoría indicada no existe", data: null });
                return;
            }
            if (!categoria.CATActiva) {
                res.status(409).json({ success: false, message: "La categoría indicada está inactiva", data: null });
                return;
            }
        }

        const movimiento = await prisma.movimiento.update({
            where: { MOVId: id },
            data: {
                ...(body.CUEId !== undefined && { CUEId: body.CUEId }),
                ...(body.CATId !== undefined && { CATId: body.CATId }),
                ...(body.MOVTipo !== undefined && { MOVTipo: body.MOVTipo }),
                ...(body.MOVMonto !== undefined && { MOVMonto: body.MOVMonto }),
                ...(body.MOVDescripcion !== undefined && { MOVDescripcion: body.MOVDescripcion }),
                ...(body.MOVFecha !== undefined && { MOVFecha: new Date(body.MOVFecha) }),
            },
            include: {
                cuenta: true,
                categoria: true,
            },
        });

        res.json({
            success: true,
            message: "Movimiento actualizado correctamente",
            data: movimiento,
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Error al actualizar el movimiento",
            data: null,
        });
    }
};

export const desactivarMovimiento = async (req: Request, res: Response) => {
    try {
        const id = parseIdParam(req.params.id);
        if (!id) {
            res.status(400).json({ success: false, message: "El id del movimiento es inválido", data: null });
            return;
        }

        const movimientoExistente = await prisma.movimiento.findUnique({ where: { MOVId: id } });
        if (!movimientoExistente) {
            res.status(404).json({ success: false, message: "El movimiento indicado no existe", data: null });
            return;
        }
        if (!movimientoExistente.MOVActiva) {
            res.status(409).json({ success: false, message: "El movimiento ya se encuentra desactivado", data: null });
            return;
        }

        const movimiento = await prisma.movimiento.update({
            where: { MOVId: id },
            data: { MOVActiva: false },
        });

        res.json({
            success: true,
            message: "Movimiento desactivado correctamente",
            data: movimiento,
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Error al desactivar el movimiento",
            data: null,
        });
    }
};
