// src/lib/prisma.ts
// Cliente global de Prisma para reutilizar conexión
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();