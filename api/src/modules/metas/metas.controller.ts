// api/src/modules/metas/metas.controller.ts
import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export const getMetas = async (_req: Request, res: Response) => {
    try {
        const metas = await prisma.meta.findMany({
            orderBy: {
                METCreadoEn: "desc",
            },
        });

        res.json({
            success: true,
            data: metas,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error al obtener metas",
            error,
        });
    }
};