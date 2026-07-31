"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//api/src/modules/cuentas/cuentas.routes.ts
const express_1 = require("express");
const cuentas_controller_1 = require("./cuentas.controller");
const router = (0, express_1.Router)();
router.get("/", cuentas_controller_1.getCuentas);
exports.default = router;
