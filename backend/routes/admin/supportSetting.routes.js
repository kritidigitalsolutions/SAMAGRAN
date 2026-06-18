import express from "express";
import { protectAdmin, requireSuperAdmin } from "../../middleware/admin.middleware.js";
import { getSupportSetting, updateSupportSetting } from "../../controllers/admin/supportSetting.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getSupportSetting);
router.patch("/", protectAdmin, requireSuperAdmin, updateSupportSetting);

export default router;
