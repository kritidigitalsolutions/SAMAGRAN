import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import {
  getAllUsersWishlists,
  getUserWishlistByAdmin,
} from "../../controllers/admin/wishlist.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getAllUsersWishlists);
router.get("/:userId", protectAdmin, getUserWishlistByAdmin);

export default router;
