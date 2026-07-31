"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCuentas = void 0;
const prisma_1 = require("../../lib/prisma");
const getCuentas = async (_req, res) => {
    try {
        const cuentas = await prisma_1.prisma.cuenta.findMany({
            orderBy: {
                CUENombre: "asc",
            },
        });
        res.json({
            success: true,
            data: cuentas,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error al obtener cuentas",
            error,
        });
    }
};
exports.getCuentas = getCuentas;
