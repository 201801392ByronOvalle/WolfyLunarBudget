// api/src/modules/movimientos/movimientos.routes.ts
import { Router } from "express";
import { getMovimientos } from "./movimientos.controller";

const router = Router();

router.get("/", getMovimientos);

export default router;