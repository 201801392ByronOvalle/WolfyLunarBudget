// api/src/modules/categorias/categorias.controller.ts
import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export const getCategorias = async (_req: Request, res: Response) => {
    try {
        const categorias = await prisma.categoria.findMany({
            orderBy: {
                CATNombre: "asc",
            },
        });

        res.json({
            success: true,
            data: categorias,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error al obtener categorías",
            error,
        });
    }
};
