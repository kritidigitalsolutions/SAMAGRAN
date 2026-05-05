import express from "express";
import protect from "../../middleware/auth.middleware.js";
import {
	getProfile,
	deleteAccount,
	updateUser,
} from "../../controllers/user.controller.js";
import { updateUserFcmToken } from "../../controllers/auth.controller.js";
import { upload } from "../../middleware/upload.js";

const router = express.Router();

import { protectAdmin } from "../../middleware/admin.middleware.js";

// 🔐 Protected route
router.get("/profile", protect, getProfile);
router.post("/delete-account", protect, deleteAccount);
router.patch("/fcm-token", protect, updateUserFcmToken);
router.patch(
	"/:id",
	protect,
	upload.fields([
		{ name: "profileImageFile", maxCount: 1 },
		{ name: "profileImage", maxCount: 1 },
	]),
	updateUser,
);

export default router;