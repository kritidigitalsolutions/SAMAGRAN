import express from "express";
import protect from "../../middleware/auth.middleware.js";
import { applyCoupon, getCoupons } from "../../controllers/coupon.controller.js";

const router = express.Router();

router.post("/apply", protect, applyCoupon);
router.get("/", protect, getCoupons);

export default router;
