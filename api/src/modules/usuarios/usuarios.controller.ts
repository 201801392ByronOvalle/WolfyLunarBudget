// api/src/modules/usuarios/usuarios.controller.ts
import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export const getUsuarios = async (_req: Request, res: Response) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            select: {
                USUId: true,
                USUNombre: true,
                USUCorreo: true,
                USUCreadoEn: true,
            },
        });

        res.json({
            success: true,
            data: usuarios,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error al obtener usuarios",
            error,
        });
    }
};