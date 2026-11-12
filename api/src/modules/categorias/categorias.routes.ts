// api/src/modules/categorias/categorias.routes.ts
import { Router } from "express";
import { createCategoria, getCategorias, getDuplicadosCategorias } from "./categorias.controller";

const router = Router();

// ORDEN OBLIGATORIO DE RUTAS (contracts/categorias.md):
// las rutas fijas (/duplicados, /:id/desactivar, /:id/activar) se registran ANTES de /:id,
// para que "duplicados" nunca se interprete como un identificador. /:id va siempre al final.
router.get("/", getCategorias);
router.get("/duplicados", getDuplicadosCategorias);
router.post("/", createCategoria);

export default router;
