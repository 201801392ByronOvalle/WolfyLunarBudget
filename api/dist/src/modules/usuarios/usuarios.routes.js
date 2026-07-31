"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// api/src/modules/usuarios/usuarios.routes.ts
const express_1 = require("express");
const usuarios_controller_1 = require("./usuarios.controller");
const router = (0, express_1.Router)();
router.get("/", usuarios_controller_1.getUsuarios);
exports.default = router;
