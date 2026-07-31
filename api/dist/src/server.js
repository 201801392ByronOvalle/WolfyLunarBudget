"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// api/src/server.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const usuarios_routes_1 = __importDefault(require("./modules/usuarios/usuarios.routes"));
const categorias_routes_1 = __importDefault(require("./modules/categorias/categorias.routes"));
const cuentas_routes_1 = __importDefault(require("./modules/cuentas/cuentas.routes"));
const movimientos_routes_1 = __importDefault(require("./modules/movimientos/movimientos.routes"));
const metas_routes_1 = __importDefault(require("./modules/metas/metas.routes"));
const presupuestos_routes_1 = __importDefault(require("./modules/presupuestos/presupuestos.routes"));
const app = (0, express_1.default)(); // Definición de la aplicación Express
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Petición base para validar que la API está levantada
app.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "Wolfy Lunar Budget API running",
    });
});
// Endpoint de monitoreo/health check
app.get("/health", (_req, res) => {
    res.json({
        success: true,
        status: "OK",
    });
});
// Rutas principales de la API
app.use("/api/usuarios", usuarios_routes_1.default);
app.use("/api/categorias", categorias_routes_1.default);
app.use("/api/cuentas", cuentas_routes_1.default);
app.use("/api/movimientos", movimientos_routes_1.default);
app.use("/api/metas", metas_routes_1.default);
app.use("/api/presupuestos", presupuestos_routes_1.default);
// Información en consola al iniciar el servidor
app.listen(env_1.env.port, () => {
    console.log(`API running on http://localhost:${env_1.env.port}`);
});
