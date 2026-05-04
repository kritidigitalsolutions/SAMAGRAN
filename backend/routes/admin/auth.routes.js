// routes/admin.routes.js
import express from "express";
import { adminLogin } from "../../controllers/auth/admin.auth.controller.js";
import { updateAdminFcmToken } from "../../controllers/auth/admin.auth.controller.js";
import { protectAdmin } from "../../middleware/admin.middleware.js";

const router = express.Router();

router.post("/login", adminLogin);
router.patch("/fcm-token", protectAdmin, updateAdminFcmToken);

export default router;