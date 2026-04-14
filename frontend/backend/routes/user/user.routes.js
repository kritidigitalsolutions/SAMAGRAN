import express from "express";
import protect from "../../middleware/auth.middleware.js";
import { getProfile } from "../../controllers/user.controller.js";

const router = express.Router();

// 🔐 Protected route
router.get("/profile", protect, getProfile);

import { getAllUsers } from "../../controllers/user.controller.js";

import { protectAdmin } from "../../middleware/admin.middleware.js";

router.get("/all", protectAdmin, getAllUsers);

import { deleteUser } from "../../controllers/user.controller.js";

router.delete("/:id", protectAdmin, deleteUser);
export default router;