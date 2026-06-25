import express from "express";
import protect from "../../middleware/auth.middleware.js";
import { getSupportSetting } from "../../controllers/admin/supportSetting.controller.js";

const router = express.Router();

router.get("/", getSupportSetting);

export default router;
