// api/src/modules/movimientos/movimientos.controller.ts
import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export const getMovimientos = async (_req: Request, res: Response) => {
    try {
        const movimientos = await prisma.movimiento.findMany({
            include: {
                cuenta: true,
                categoria: true,
            },
            orderBy: {
                MOVFecha: "desc",
            },
        });

        res.json({
            success: true,
            data: movimientos,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error al obtener movimientos",
            error,
        });
    }
};