"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// api/src/modules/movimientos/movimientos.routes.ts
const express_1 = require("express");
const movimientos_controller_1 = require("./movimientos.controller");
const router = (0, express_1.Router)();
router.get("/", movimientos_controller_1.getMovimientos);
router.post("/", movimientos_controller_1.createMovimiento);
router.patch("/:id/desactivar", movimientos_controller_1.desactivarMovimiento);
router.patch("/:id", movimientos_controller_1.updateMovimiento);
exports.default = router;
