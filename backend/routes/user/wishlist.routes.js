import express from "express";
import protect from "../../middleware/auth.middleware.js";
import { getMyWishlist, toggleWishlist } from "../../controllers/wishlist.controller.js";

const router = express.Router();

router.post("/toggle", protect, toggleWishlist);
router.get("/my", protect, getMyWishlist);

export default router;
