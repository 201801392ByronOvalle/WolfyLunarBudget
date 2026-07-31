"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategorias = void 0;
const prisma_1 = require("../../lib/prisma");
const getCategorias = async (_req, res) => {
    try {
        const categorias = await prisma_1.prisma.categoria.findMany({
            orderBy: {
                CATNombre: "asc",
            },
        });
        res.json({
            success: true,
            data: categorias,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error al obtener categorías",
            error,
        });
    }
};
exports.getCategorias = getCategorias;
