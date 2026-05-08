//api/src/modules/cuentas/cuentas.controller.ts
import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export const getCuentas = async (_req: Request, res: Response) => {
    try {
        const cuentas = await prisma.cuenta.findMany({
        orderBy: {
            CUENombre: "asc",
        },
        });

        res.json({
        success: true,
        data: cuentas,
        });
    } catch (error) {
        res.status(500).json({
        success: false,
        message: "Error al obtener cuentas",
        error,
        });
    }
};