"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMetas = void 0;
const prisma_1 = require("../../lib/prisma");
const getMetas = async (_req, res) => {
    try {
        const metas = await prisma_1.prisma.meta.findMany({
            orderBy: {
                METCreadoEn: "desc",
            },
        });
        res.json({
            success: true,
            data: metas,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error al obtener metas",
            error,
        });
    }
};
exports.getMetas = getMetas;
