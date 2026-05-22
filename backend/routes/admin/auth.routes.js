// routes/admin.routes.js
import express from "express";
import { adminLogin, updateAdminFcmToken, updateVendorFcmToken } from "../../controllers/auth/admin.auth.controller.js";
import { protectAdmin } from "../../middleware/admin.middleware.js";

const router = express.Router();

router.post("/login", adminLogin);
router.patch("/fcm-token", protectAdmin, updateAdminFcmToken);
router.patch("/vendor/fcm-token", protectAdmin, updateVendorFcmToken);

export default router;