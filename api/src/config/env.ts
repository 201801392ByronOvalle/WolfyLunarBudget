// api/src/config/env.ts
import dotenv from "dotenv";

dotenv.config();

export const env = {
    // Configuración del puerto donde correrá la API
    port: Number(process.env.PORT) || 4000,

    // Entorno actual de ejecución: development, production, etc.
    nodeEnv: process.env.NODE_ENV || "development",

    // Identificador del usuario actual (configuración temporal del MVP; NO es autenticación).
    // Se valida al iniciar el servidor en lib/usuario-actual.ts; no tiene valor por omisión.
    currentUserIdRaw: process.env.CURRENT_USER_ID,
};