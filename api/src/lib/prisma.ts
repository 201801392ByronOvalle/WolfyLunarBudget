// src/lib/prisma.ts
// Cliente global de Prisma para reutilizar conexión (única instancia de la aplicación).
import { PrismaClient } from "@prisma/client";

// Tiempos de las transacciones interactivas (research R4, hallazgo H3):
// - maxWait 5000 ms: margen para que Neon reanude un compute suspendido más la espera del pool
//   (por omisión Prisma usa 2000 ms).
// - timeout 10000 ms: cada transacción hace de 2 a 4 consultas cortas; acota cuánto se retienen
//   bloqueos (por omisión Prisma usa 5000 ms).
// Si se superan, Prisma lanza P2028, que no es un conflicto de serialización (P2034).
export const OPCIONES_TRANSACCION = { maxWait: 5000, timeout: 10000 } as const;

export const prisma = new PrismaClient({ transactionOptions: OPCIONES_TRANSACCION });
