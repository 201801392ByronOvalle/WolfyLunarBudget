// api/src/app.ts
// Crea y configura la aplicación Express: middlewares y rutas.
// No escucha en ningún puerto, no verifica el usuario actual y no consulta la base de datos,
// para poder importarla en las pruebas sin abrir puertos ni conexiones (D4).
import express from "express";
import cors from "cors";

import usuariosRoutes from "./modules/usuarios/usuarios.routes";
import categoriasRoutes from "./modules/categorias/categorias.routes";
import cuentasRoutes from "./modules/cuentas/cuentas.routes";
import movimientosRoutes from "./modules/movimientos/movimientos.routes";
import metasRoutes from "./modules/metas/metas.routes";
import presupuestosRoutes from "./modules/presupuestos/presupuestos.routes";

export const app = express(); // Definición de la aplicación Express

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
