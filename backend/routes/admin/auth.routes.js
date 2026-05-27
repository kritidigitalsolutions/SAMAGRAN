// routes/admin.routes.js
import express from "express";
import {
	adminLogin,
	requestAdminPasswordReset,
	resetAdminPassword,
	updateAdminFcmToken,
	updateVendorFcmToken,
} from "../../controllers/auth/admin.auth.controller.js";
import { protectAdmin } from "../../middleware/admin.middleware.js";

const router = express.Router();

router.post("/login", adminLogin);
router.post("/forgot-password", requestAdminPasswordReset);
router.post("/reset-password", resetAdminPassword);
router.patch("/fcm-token", protectAdmin, updateAdminFcmToken);
router.patch("/vendor/fcm-token", protectAdmin, updateVendorFcmToken);

export default router;