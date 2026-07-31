"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// api/src/modules/presupuestos/presupuestos.routes.ts
const express_1 = require("express");
const presupuestos_controller_1 = require("./presupuestos.controller");
const router = (0, express_1.Router)();
router.get("/", presupuestos_controller_1.getPresupuestos);
exports.default = router;
