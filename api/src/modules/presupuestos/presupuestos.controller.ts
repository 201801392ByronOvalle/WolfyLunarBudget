// api/src/modules/presupuestos/presupuestos.controller.ts
import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export const getPresupuestos = async (_req: Request, res: Response) => {
    try {
        const presupuestos = await prisma.presupuestoMensual.findMany({
            include: {
                categoria: true,
            },
            orderBy: [
                {
                    PREAnio: "desc",
                },
                {
                    PREMes: "desc",
                },
            ],
        });

        res.json({
            success: true,
            data: presupuestos,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error al obtener presupuestos",
            error,
        });
    }
};