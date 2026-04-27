import express from "express";
import protect from "../../middleware/auth.middleware.js";
import {
	getProfile,
	updateUser,
} from "../../controllers/user.controller.js";
import { upload } from "../../middleware/upload.js";

const router = express.Router();

import { protectAdmin } from "../../middleware/admin.middleware.js";

// 🔐 Protected route
router.get("/profile", protect, getProfile);
router.patch("/:id", protect, upload.single("profileImageFile"), updateUser);

export default router;