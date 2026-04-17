import express from "express";
import protect from "../../middleware/auth.middleware.js";
import { getProfile } from "../../controllers/user.controller.js";

const router = express.Router();


import { getAllUsers } from "../../controllers/user.controller.js";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import { deleteUser } from "../../controllers/user.controller.js";




// 🔐 Protected route
router.get("/profile", protect, getProfile);
router.get("/all", protectAdmin, getAllUsers);
router.delete("/:id", protectAdmin, deleteUser);
export default router;