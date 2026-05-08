//api/src/modules/cuentas/cuentas.routes.ts
import { Router } from "express";
import { getCuentas } from "./cuentas.controller";

const router = Router();

router.get("/", getCuentas);

export default router;