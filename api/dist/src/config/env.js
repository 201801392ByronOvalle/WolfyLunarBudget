"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
// api/src/config/env.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    // Configuración del puerto donde correrá la API
    port: Number(process.env.PORT) || 4000,
    // Entorno actual de ejecución: development, production, etc.
    nodeEnv: process.env.NODE_ENV || "development",
};
