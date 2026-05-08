// api/src/server.ts
import express from "express";
import cors from "cors";

import { env } from "./config/env";
import usuariosRoutes from "./modules/usuarios/usuarios.routes";
import categoriasRoutes from "./modules/categorias/categorias.routes";
import cuentasRoutes from "./modules/cuentas/cuentas.routes";
import movimientosRoutes from "./modules/movimientos/movimientos.routes";
import metasRoutes from "./modules/metas/metas.routes";
import presupuestosRoutes from "./modules/presupuestos/presupuestos.routes";

const app = express(); // Definición de la aplicación Express

app.use(cors());
app.use(express.json());

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
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/cuentas", cuentasRoutes);
app.use("/api/movimientos", movimientosRoutes);
app.use("/api/metas", metasRoutes);
app.use("/api/presupuestos", presupuestosRoutes);

// Información en consola al iniciar el servidor
app.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port}`);
});