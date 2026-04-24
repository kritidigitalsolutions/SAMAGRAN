import { getLegal, upsertLegal } from "../../controllers/admin/legal.controller.js";
import express from "express";

const router = express.Router();

router.patch("/:type", upsertLegal);
router.get("/:type", getLegal);


export default router;