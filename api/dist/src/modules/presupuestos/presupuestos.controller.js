"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPresupuestos = void 0;
const prisma_1 = require("../../lib/prisma");
const getPresupuestos = async (_req, res) => {
    try {
        const presupuestos = await prisma_1.prisma.presupuestoMensual.findMany({
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error al obtener presupuestos",
            error,
        });
    }
};
exports.getPresupuestos = getPresupuestos;
