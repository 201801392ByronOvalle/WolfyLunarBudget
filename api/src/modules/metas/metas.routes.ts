// api/src/modules/metas/metas.routes.ts
import { Router } from "express";
import { getMetas } from "./metas.controller";

const router = Router();

router.get("/", getMetas);

export default router;