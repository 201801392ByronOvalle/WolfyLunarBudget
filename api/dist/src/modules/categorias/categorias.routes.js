"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// api/src/modules/categorias/categorias.routes.ts
const express_1 = require("express");
const categorias_controller_1 = require("./categorias.controller");
const router = (0, express_1.Router)();
router.get("/", categorias_controller_1.getCategorias);
exports.default = router;
