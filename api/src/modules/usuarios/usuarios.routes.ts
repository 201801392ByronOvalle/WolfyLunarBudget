// api/src/modules/usuarios/usuarios.routes.ts
import { Router } from "express";
import { getUsuarios } from "./usuarios.controller";

const router = Router();

router.get("/", getUsuarios);

export default router;