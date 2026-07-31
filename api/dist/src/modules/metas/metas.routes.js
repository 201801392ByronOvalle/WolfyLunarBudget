"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// api/src/modules/metas/metas.routes.ts
const express_1 = require("express");
const metas_controller_1 = require("./metas.controller");
const router = (0, express_1.Router)();
router.get("/", metas_controller_1.getMetas);
exports.default = router;
