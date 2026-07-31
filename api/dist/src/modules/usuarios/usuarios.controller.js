"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsuarios = void 0;
const prisma_1 = require("../../lib/prisma");
const getUsuarios = async (_req, res) => {
    try {
        const usuarios = await prisma_1.prisma.usuario.findMany({
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error al obtener usuarios",
            error,
        });
    }
};
exports.getUsuarios = getUsuarios;
