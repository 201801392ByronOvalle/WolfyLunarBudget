// api/src/modules/movimientos/movimientos.routes.ts
import { Router } from "express";
import {
    getMovimientos,
    createMovimiento,
    updateMovimiento,
    desactivarMovimiento,
} from "./movimientos.controller";

const router = Router();

router.get("/", getMovimientos);
router.post("/", createMovimiento);
router.patch("/:id/desactivar", desactivarMovimiento);
router.patch("/:id", updateMovimiento);

export default router;
