// api/src/modules/presupuestos/presupuestos.routes.ts
import { Router } from "express";
import { getPresupuestos } from "./presupuestos.controller";

const router = Router();

router.get("/", getPresupuestos);

export default router;