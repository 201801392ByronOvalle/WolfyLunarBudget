"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// src/lib/prisma.ts
// Cliente global de Prisma para reutilizar conexión
const client_1 = require("@prisma/client");
exports.prisma = new client_1.PrismaClient();
