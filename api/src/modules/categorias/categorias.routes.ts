// api/src/modules/categorias/categorias.routes.ts
import { Router } from "express";
import { getCategorias } from "./categorias.controller";

const router = Router();

router.get("/", getCategorias);

export default router;