import express from "express";
import protect from "../../middleware/auth.middleware.js";
import {
	deleteUser,
	getAllUsers,
	getProfile,
	getUserCartByAdmin,
	getUserDetailsByAdmin,
	getUserOrdersByAdmin,
	toggleUserBlockByAdmin,
	updateUserByAdmin,
} from "../../controllers/user.controller.js";

const router = express.Router();

import { protectAdmin } from "../../middleware/admin.middleware.js";

// 🔐 Protected route
router.get("/profile", protect, getProfile);
router.get("/all", protectAdmin, getAllUsers);
router.get("/:id/details", protectAdmin, getUserDetailsByAdmin);
router.get("/:id/orders", protectAdmin, getUserOrdersByAdmin);
router.get("/:id/cart", protectAdmin, getUserCartByAdmin);
router.patch("/:id", protectAdmin, updateUserByAdmin);
router.patch("/:id/block", protectAdmin, toggleUserBlockByAdmin);
router.delete("/:id", protectAdmin, deleteUser);
export default router;